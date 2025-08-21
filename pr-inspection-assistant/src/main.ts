import tl from './taskWrapper';
import { OpenAI, AzureOpenAI } from 'openai';
import { Repository } from './repository';
import { ChatGPT } from './chatGpt';
import { PullRequest } from './pullRequest';
import { filterFilesForReview } from './fileUtils';
import { Logger } from './logger';
import { InputValues } from './types/inputValues';
import { InputManager } from './inputManager';
import { Thread } from './types/thread';
import { Comment } from './types/comment';
import { Review } from './types/review';
import { ReviewResult } from './types/reviewResult';
import { CommentUtils } from './commentUtils';

export class Main {
    private static _chatGpt: ChatGPT;
    private static _repository: Repository;
    private static _pullRequest: PullRequest;

    public static async main(): Promise<void> {
        if (!this.isValidTrigger()) return;

        const inputs = InputManager.inputs;

        const client = this.createOpenAIClient(inputs);
        this._chatGpt = this.createChatGptClient(client, inputs);

        await this.initializeRepository();

        this._pullRequest = new PullRequest();

        const { reviewRange, isRequeued } = await this.getReviewRange();
        if (isRequeued && !inputs.allowRequeue) {
            Logger.info(
                'No new changes detected since last review and requeue is disabled. Skipping pull request review.'
            );
            return;
        }

        const iterationFiles = await this._pullRequest.getIterationFiles(reviewRange);
        Logger.info(`Found ${iterationFiles.length} changed files in this run:`);

        const filesToReview = this.filterFiles(iterationFiles, inputs);
        Logger.info(`After filtering, ${filesToReview.length} files will be reviewed:`, filesToReview);

        const reviewResults = await this.reviewFiles(filesToReview, inputs);
        await this.processReviewResults(reviewResults, inputs);

        await this._pullRequest.saveLastReviewedIteration(reviewRange);
        tl.setResult(tl.TaskResult.Succeeded, 'Pull Request reviewed.');
        Logger.info('Pull Request review completed successfully.');
    }

    private static isValidTrigger(): boolean {
        if (tl.getVariable('Build.Reason') !== 'PullRequest') {
            tl.setResult(tl.TaskResult.Skipped, 'This task must only be used when triggered by a Pull Request.');
            return false;
        }

        if (!tl.getVariable('System.AccessToken')) {
            tl.setResult(
                tl.TaskResult.Failed,
                "'Allow Scripts to Access OAuth Token' must be enabled. See https://learn.microsoft.com/en-us/azure/devops/pipelines/build/options?view=azure-devops#allow-scripts-to-access-the-oauth-token for more information"
            );
            return false;
        }
        return true;
    }

    private static createOpenAIClient(inputs: any) {
        return inputs.azureApiEndpoint
            ? new AzureOpenAI({
                  apiKey: inputs.apiKey,
                  endpoint: inputs.azureApiEndpoint,
                  apiVersion: inputs.azureApiVersion,
                  deployment: inputs.azureModelDeployment,
              })
            : new OpenAI({ apiKey: inputs.apiKey });
    }

    private static createChatGptClient(client: any, inputs: any) {
        return new ChatGPT(
            client,
            inputs.bugs,
            inputs.performance,
            inputs.bestPractices,
            inputs.modifiedLinesOnly,
            inputs.enableCommentLineCorrection,
            inputs.additionalPrompts,
            inputs.confidenceMode
        );
    }

    private static async initializeRepository() {
        this._repository = await new Repository().init();
        await this._repository.setupCurrentBranch();
    }

    private static async getReviewRange() {
        const lastReviewedIteration = await this._pullRequest.getLastReviewedIteration();
        const latestIterationId = await this._pullRequest.getLatestIterationId();

        let reviewRange = { start: lastReviewedIteration.end, end: latestIterationId };
        const isRequeued = lastReviewedIteration.end === latestIterationId;

        Logger.info(`Is requeued: ${isRequeued}`);

        if (isRequeued) {
            reviewRange = { ...lastReviewedIteration };
        }

        return { reviewRange, isRequeued };
    }

    private static filterFiles(iterationFiles: string[], inputs: any) {
        return filterFilesForReview({
            fileExtensions: inputs.fileExtensions,
            fileExtensionExcludes: inputs.fileExtensionExcludes,
            filesToInclude: inputs.filesToInclude,
            filesToExclude: inputs.filesToExclude,
            files: iterationFiles,
        });
    }

    private static async reviewFiles(filesToReview: string[], inputs: InputValues): Promise<ReviewResult[]> {
        tl.setProgress(0, 'Step 1: Performing Code Review');
        Logger.info('Starting code review process...');

        // Step 1: Collect review results
        const reviewResults: { fileName: string; codeReview: Review }[] = [];

        // Used for collecting all comments generated for the current review run
        let currentRunComments: Comment[] = [];
        let deduplicationCriteriaMet = false;

        for (const [index, fileName] of filesToReview.entries()) {
            Logger.info(`Reviewing file ${index + 1}/${filesToReview.length}: ${fileName}`);

            const existingFileComments = await this._pullRequest.getCommentsForFile(fileName);
            const [commentsForExclusion, newDedupeMet] = CommentUtils.getCommentContentForExclusion(
                existingFileComments,
                currentRunComments,
                inputs,
                deduplicationCriteriaMet
            );
            deduplicationCriteriaMet = newDedupeMet;

            Logger.info('Existing file comments: ' + existingFileComments.length);
            Logger.info('Current run comments: ' + currentRunComments.length);
            Logger.info('Comments for exclusion: ' + commentsForExclusion.length, commentsForExclusion);

            const diff = await this._repository.getDiff(fileName);
            const codeReview = await this._chatGpt.performCodeReview(diff, fileName, commentsForExclusion);

            // Flatten and collect new comments from this review
            const newComments = codeReview.threads.flatMap((thread) => thread.comments);
            currentRunComments.push(...newComments);

            reviewResults.push({ fileName, codeReview });

            const progressPercent = ((index + 1) / filesToReview.length) * 50;
            tl.setProgress(progressPercent, `Step 1: Performing Code Review (${index + 1}/${filesToReview.length})`);
            Logger.info(`Completed review of file ${fileName}`);
        }

        return reviewResults;
    }

    private static async processReviewResults(reviewResults: ReviewResult[], inputs: InputValues): Promise<void> {
        const filteredReviewResults = JSON.parse(JSON.stringify(reviewResults));

        // Step 2: Filter review thread comments and add threads
        tl.setProgress(50, 'Step 2: Adding Review Threads');
        Logger.info('Starting to process review results and add threads...');

        for (let index = 0; index < filteredReviewResults.length; index++) {
            const { codeReview, fileName } = filteredReviewResults[index];
            Logger.info(`Processing threads for file ${index + 1}/${filteredReviewResults.length}: ${fileName}`);

            if (codeReview && codeReview.threads) {
                for (const thread of codeReview.threads) {
                    this.processThread(thread, inputs);
                    await this._pullRequest.addThread(thread);
                }
            }
            const progressPercent = 50 + ((index + 1) / filteredReviewResults.length) * 50;
            tl.setProgress(
                progressPercent,
                `Step 2: Adding Review Threads (${index + 1}/${filteredReviewResults.length})`
            );
        }

        const summary = this.summarizeReviewResults(reviewResults, filteredReviewResults);
        this.logReviewSummary(inputs, summary);
    }

    private static logReviewSummary(
        inputs: InputValues,
        summary: { totalComments: number; remainingComments: number; filteredOutComments: number }
    ) {
        Logger.info(`\n${'*'.repeat(50)}`);
        Logger.info(`Review Summary:`);
        Logger.info(`Confidence mode: ${inputs.confidenceMode}`);
        Logger.info(`Confidence minimum: ${inputs.confidenceMinimum}`);
        Logger.info(`Total comments: ${summary.totalComments}`);
        Logger.info(
            `Removed comments: ${summary.filteredOutComments} (${(summary.totalComments === 0
                ? 0
                : (summary.filteredOutComments / summary.totalComments) * 100
            ).toFixed(1)}%)`
        );
        Logger.info(`Remaining comments: ${summary.remainingComments}`);
    }

    private static summarizeReviewResults(
        reviewResults: { fileName: string; codeReview: Review }[],
        filteredReviewResults: { fileName: string; codeReview: Review }[]
    ): { totalComments: number; remainingComments: number; filteredOutComments: number } {
        const summary = { totalComments: 0, remainingComments: 0, filteredOutComments: 0 };

        for (let index = 0; index < reviewResults.length; index++) {
            const reviewResult = reviewResults[index];
            const filteredReviewResult = filteredReviewResults[index];

            if (reviewResult.codeReview?.threads) {
                for (let i = 0; i < reviewResult.codeReview.threads.length; i++) {
                    const thread = reviewResult.codeReview.threads[i];
                    const filteredThread = filteredReviewResult.codeReview.threads[i];

                    summary.totalComments += thread.comments.length;
                    summary.remainingComments += filteredThread.comments.length;
                    summary.filteredOutComments += thread.comments.length - filteredThread.comments.length;
                }
            }
        }
        return summary;
    }

    private static processThread(thread: Thread, inputs: InputValues) {
        Logger.info(`Processing thread: ${thread.threadContext.filePath}`);
        if (inputs.confidenceMode) {
            const totalComments = thread.comments.length;
            const { filteredOut, remaining } = CommentUtils.filterCommentsByConfidence(
                thread.comments,
                inputs.confidenceMinimum
            );
            thread.comments = remaining;

            this.logThreadComments(totalComments, filteredOut, remaining);
        }
    }

    private static logThreadComments(total: number, filteredOut: Comment[], remaining: Comment[]): void {
        Logger.info(`Total comments: ${total}`);
        Logger.info(`Filtered out comments (${filteredOut.length}):`);
        filteredOut.forEach((comment) => Logger.info(`- [${comment.confidenceScore ?? 'N/A'}] ${comment.content}`));
        Logger.info(`Remaining comments (${remaining.length}):`);
        remaining.forEach((comment) => Logger.info(`- [${comment.confidenceScore ?? 'N/A'}] ${comment.content}`));
    }
}

Main.main();

import tl from './taskWrapper';
import { OpenAI, AzureOpenAI } from 'openai';
import { Repository } from './repository';
import { ChatGPT } from './chatGpt';
import { PullRequest } from './pullRequest';
import { filterFilesForReview } from './fileUtils';

export class Main {
    private static _chatGpt: ChatGPT;
    private static _repository: Repository;
    private static _pullRequest: PullRequest;

    public static async main(): Promise<void> {
        if (!this.isValidTrigger()) return;

        const inputs = this.getInputValues();
        this.logInputs(inputs);

        const client = this.createOpenAIClient(inputs);
        this._chatGpt = this.createChatGptClient(client, inputs);

        await this.initializeRepository();

        this._pullRequest = new PullRequest();

        const { reviewRange, isRequeued } = await this.getReviewRange();
        if (isRequeued && !inputs.allowRequeue) {
            console.info(
                'No new changes detected since last review and requeue is disabled. Skipping pull request review.'
            );
            return;
        }

        const iterationFiles = await this._pullRequest.getIterationFiles(reviewRange);
        console.info(`Found ${iterationFiles.length} changed files in this run:`, iterationFiles);

        const filesToReview = this.filterFiles(iterationFiles, inputs);
        console.info(`After filtering, ${filesToReview.length} files will be reviewed:`, filesToReview);

        tl.setProgress(0, 'Performing Code Review');
        await this.reviewFiles(filesToReview);

        await this._pullRequest.saveLastReviewedIteration(reviewRange);
        tl.setResult(tl.TaskResult.Succeeded, 'Pull Request reviewed.');
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

    private static getInputValues() {
        return {
            apiKey: tl.getInput('api_key', true)!,
            azureApiEndpoint: tl.getInput('api_endpoint', false)!,
            azureApiVersion: tl.getInput('api_version', false)!,
            azureModelDeployment: tl.getInput('ai_model', false)!,
            fileExtensions: tl.getInput('file_extensions', false),
            fileExtensionExcludes: tl.getInput('file_extension_excludes', false),
            filesToInclude: tl.getInput('file_includes', false),
            filesToExclude: tl.getInput('file_excludes', false),
            additionalPrompts: tl.getInput('additional_prompts', false)?.split(','),
            bugs: tl.getBoolInput('bugs', false),
            performance: tl.getBoolInput('performance', false),
            bestPractices: tl.getBoolInput('best_practices', false),
            modifiedLinesOnly: tl.getBoolInput('modified_lines_only', false),
            enableCommentLineCorrection: tl.getBoolInput('comment_line_correction', false),
            allowRequeue: tl.getBoolInput('allow_requeue', false),
        };
    }

    private static logInputs(inputs: any): void {
        for (const [key, value] of Object.entries(inputs)) {
            if (key === 'apiKey') {
                console.info(`${key}: ***`); // Mask sensitive fields
            } else {
                console.info(`${key}: ${value}`);
            }
        }
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
            inputs.additionalPrompts
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

        console.info(`Is requeued: ${isRequeued}`);

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

    private static async reviewFiles(filesToReview: string[]): Promise<void> {
        for (let index = 0; index < filesToReview.length; index++) {
            let fileName = filesToReview[index];
            let diff = await this._repository.getDiff(fileName);

            // Get existing comments for the file
            let existingComments = await this._pullRequest.getCommentsForFile(fileName);
            console.info('Existing comments: ' + existingComments.length);

            // Perform code review with existing comments
            let reviewComment = await this._chatGpt.performCodeReview(diff, fileName, existingComments);

            // Add the review comments to the pull request
            if (reviewComment && reviewComment.threads) {
                for (let thread of reviewComment.threads as any[]) {
                    await this._pullRequest.addThread(thread);
                }
            }

            console.info(`Completed review of file ${fileName}`);
            tl.setProgress(((index + 1) / filesToReview.length) * 100, 'Performing Code Review');
        }
    }
}

Main.main();

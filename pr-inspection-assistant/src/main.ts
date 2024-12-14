import tl = require('azure-pipelines-task-lib/task');
import { OpenAI } from 'openai';
import { ChatGPT } from './chatgpt';
import { Repository } from './repository';
import { PullRequest } from './pullrequest';

export class Main {
    private static _chatGpt: ChatGPT;
    private static _repository: Repository;
    private static _pullRequest: PullRequest;

    public static async Main(): Promise<void> {
        if (tl.getVariable('Build.Reason') !== 'PullRequest') {
            tl.setResult(tl.TaskResult.Skipped, "This task must only be used when triggered by a Pull Request.");
            return;
        }

        if(!tl.getVariable('System.AccessToken')) {
            tl.setResult(tl.TaskResult.Failed, "'Allow Scripts to Access OAuth Token' must be enabled. See https://learn.microsoft.com/en-us/azure/devops/pipelines/build/options?view=azure-devops#allow-scripts-to-access-the-oauth-token for more information");
            return;
        }

        // Get the input values
        const apiKey = tl.getInput('api_key', true)!;
        const fileExtensions = tl.getInput('file_extensions', false);
        const filesToExclude = tl.getInput('file_excludes', false);
        const additionalPrompts = tl.getInput('additional_prompts', false)?.split(',')
        const bugs: boolean = tl.getBoolInput('bugs', false);
        const performance: boolean = tl.getBoolInput('performance', false);
        const bestPractices: boolean = tl.getBoolInput('best_practices', false);
        const modifiedLinesOnly: boolean = tl.getBoolInput('modified_lines_only', false);

        console.info(`file_extensions: ${fileExtensions}`);
        console.info(`file_excludes: ${filesToExclude}`);
        console.info(`additional_prompts: ${additionalPrompts}`);
        console.info(`bugs: ${bugs}`);
        console.info(`performance: ${performance}`);
        console.info(`best_practices: ${bestPractices}`);
        console.info(`modified_lines_only: ${modifiedLinesOnly}`);
        
        this._chatGpt = new ChatGPT(new OpenAI({ apiKey: apiKey }), bugs, performance, bestPractices, modifiedLinesOnly, additionalPrompts);
        this._repository = new Repository();
        this._pullRequest = new PullRequest();
        let filesToReview = await this._repository.GetChangedFiles(fileExtensions, filesToExclude);

        tl.setProgress(0, 'Performing Code Review');

        for (let index = 0; index < filesToReview.length; index++) {
            let fileName = filesToReview[index];
            let diff = await this._repository.GetDiff(fileName);

            // Get existing comments for the file
            let existingComments = await this._pullRequest.GetCommentsForFile(fileName);
            console.info("Existing comments: " + existingComments.length);

            //console.info(`existingComments: ${existingComments}`);

            // Perform code review with existing comments
            let reviewComment = await this._chatGpt.PerformCodeReview(diff, fileName, existingComments);

            // Add the review comments to the pull request 
            if (reviewComment && reviewComment.threads) {
                for (let thread of reviewComment.threads as any[]) {
                    await this._pullRequest.AddThread(thread);
                }
            }

            console.info(`Completed review of file ${fileName}`)

            tl.setProgress((fileName.length / 100) * index, 'Performing Code Review');
        }

        tl.setResult(tl.TaskResult.Succeeded, "Pull Request reviewed.");
    }
}

Main.Main();
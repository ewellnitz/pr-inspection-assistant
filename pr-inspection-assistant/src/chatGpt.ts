import tl from './taskWrapper';
import { encode } from 'gpt-tokenizer';
import { OpenAI, AzureOpenAI } from 'openai';
import parseGitDiff, { AddedLine, AnyChunk, AnyLineChange, DeletedLine, GitDiff, UnchangedLine } from 'parse-git-diff';
import { CommentLineNumberAndOffsetFixer } from './commentLineNumberAndOffsetFixer';
import { Review } from './types/review';

type Client = OpenAI | AzureOpenAI;

export class ChatGPT {
    private readonly systemMessage: string = '';
    private readonly maxTokens: number = 128000;
    private _client: Client;
    private _enableCommentLineCorrection: boolean = false;

    constructor(
        client: Client,
        checkForBugs: boolean = false,
        checkForPerformance: boolean = false,
        checkForBestPractices: boolean = false,
        modifiedLinesOnly: boolean = true,
        enableCommentLineCorrection = false,
        additionalPrompts: string[] = []
    ) {
        this._client = client; // Assign to private field
        this._enableCommentLineCorrection = enableCommentLineCorrection;

        this.systemMessage = `Your task is to act as a code reviewer of a pull request within Azure DevOps.
        - You are provided with the code changes (diff) in a Unified Diff format.
        - You are provided with a file path (fileName).
        - You are provided with existing comments (existingComments) on the file, you must provide any additional code review comments that are not duplicates.
        - Rate your confidence (confidenceScore) in the likelihood that each code review comment identifies an actual issue, using a scale from 1 to 10, where 1 means very unlikely and 10 means very likely.
        - Do not highlight minor issues and nitpicks.
        ${modifiedLinesOnly ? '- Only comment on modified lines.' : ''}
        ${checkForBugs ? '- If there are any bugs, highlight them.' : ''}
        ${checkForPerformance ? '- If there are major performance problems, highlight them.' : ''}
        ${
            checkForBestPractices
                ? '- Provide details on missed use of best-practices.'
                : '- Do not provide comments on best practices.'
        }
        ${additionalPrompts.length > 0 ? additionalPrompts.map((str) => `- ${str}`).join('\n') : ''}`;

        this.systemMessage += `The response should be a single Javascript-parsable JSON object (without fenced codeblock) and it must use this sample JSON format:
        {
            "threads": [
                // Use multiple, separate thread objects for distinct comments at different locations. Line and offset references should be as specific as possible.
                {
                    "comments": [
                        {
                            "content": "<Comment in markdown format without markdown fenced codeblock>",
                            "commentType": 2,
                            "confidenceScore": <integer>,
                            "confidenceScoreJustification": "<string>",
                            "fixSuggestion": "<string>", // If you are highly confident (confidenceScore 8-10) that a code sample will fix the issue, provide only the code (no fenced codeblock) and nothing else.
                            "sufficientContext": boolean, // true if the comment is fully understandable and actionable based only on the provided diff and file context; false if more information is needed
                            "issueType": "<string>", // e.g. performance, security, best-practice, style, code smell, etc.
                        }
                    ],
                    "status": 1,
                    "threadContext": {
                        "filePath": "<string>", //path to file
                        //only include leftFile properties for suggestions on unmodified lines
                        "leftFileStart": {
                            "line": <integer>, //line where the suggestion starts
                            "offset": <integer>, //character offset where the suggestion starts
                            "snippet": "<code snippet for suggestion>"
                        },
                        "leftFileEnd": {
                            "line": <integer>, //line where the suggestion ends
                            "offset": <integer>, //character offset where the suggestion ends
                        },
                        //only use rightFile properties if the line changed in the diff
                        "rightFileStart": {
                            "line": <integer>, //line where the suggestion starts
                            "snippet": "<code snippet for suggestion>",
                            "offset": <integer>, //character offset where the suggestion starts
                        },
                        "rightFileEnd": {
                            "line": <integer>, //line where the suggestion ends
                            "offset": <integer>, //character offset where the suggestion ends
                        }
                    },
                    // Commenting out these for now as they're not working correctly and causes comments to be added to wrong files
                    // "pullRequestThreadContext": {
                    //     "changeTrackingId": <integer>, //Used to track a comment across iterations. Can be found by looking at the iteration changes list
                    //     "iterationContext": {
                    //         "firstComparingIteration": <integer>, //iteration of the file on the left side of the diff when the thread was created
                    //         "secondComparingIteration": <integer> //iteration of the file on the right side of the diff when the thread was created
                    //     }
                    // }
                }
            ]
        }`;

        console.info(`System prompt:\n${this.systemMessage}`);
    }

    public async performCodeReview(diff: string, fileName: string, existingComments: string[]): Promise<Review> {
        const review = await this.sendRequest(diff, fileName, existingComments);

        this._enableCommentLineCorrection && CommentLineNumberAndOffsetFixer.fix(review, diff);
        return review;
    }

    private async sendRequest(diff: string, fileName: string, existingComments: string[]): Promise<Review> {
        const emptyReview: Review = { threads: [] };

        if (!fileName.startsWith('/')) {
            fileName = `/${fileName}`;
        }
        let model = tl.getInput('ai_model', true) as
            | (string & {})
            | 'o3-mini'
            | 'o1-mini'
            | 'o1-preview'
            | 'gpt-4o'
            | 'gpt-4'
            | 'gpt-3.5-turbo';

        let userPrompt = {
            fileName: fileName,
            diff: diff,
            existingComments: existingComments,
        };

        let prompt = JSON.stringify(userPrompt, null, 4);
        console.info(`Model: ${model}`);
        console.info(`Diff:\n${diff}`);
        // console.info(`Prompt:\n${prompt}`);
        if (!this.doesMessageExceedTokenLimit(this.systemMessage + prompt, this.maxTokens)) {
            let openAi = await this._client.chat.completions.create({
                messages: [
                    {
                        role: model == 'o1-preview' || model == 'o1-mini' ? 'assistant' : 'system',
                        content: this.systemMessage,
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                model: model,
            });

            let response = openAi.choices;

            if (response.length > 0) {
                let content = response[0].message.content!;
                console.info(`Comments:\n${content}`);
                try {
                    return JSON.parse(content);
                } catch (error) {
                    console.error(`Failed to parse comments for file ${fileName}.  Returning empty review`, error);
                    return emptyReview;
                }
            }
        }
        tl.warning(`Unable to process diff for file ${fileName} as it exceeds token limits.`);
        return emptyReview;
    }

    private doesMessageExceedTokenLimit(message: string, tokenLimit: number): boolean {
        let tokens = encode(message);
        console.info(`Token count: ${tokens.length}`);
        return tokens.length > tokenLimit;
    }
}

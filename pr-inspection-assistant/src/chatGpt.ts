import tl from './taskWrapper';
import { encode } from 'gpt-tokenizer';
import { OpenAI, AzureOpenAI } from 'openai';
import parseGitDiff, { AddedLine, AnyChunk, AnyLineChange, DeletedLine, GitDiff, UnchangedLine } from 'parse-git-diff';
import { CommentLineNumberAndOffsetFixer } from './commentLineNumberAndOffsetFixer';
import { Review } from './types/review';
import { Logger } from './logger';

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
        additionalPrompts: string[] = [],
        enableConfidenceMode: boolean = false
    ) {
        this._client = client; // Assign to private field
        this._enableCommentLineCorrection = enableCommentLineCorrection;

        this.systemMessage = `Your task is to act as a code reviewer of a pull request within Azure DevOps.
        - You are provided with the code changes (diff) in a Unified Diff format.
        - You are provided with a file path (fileName).
        - You are provided with a string array of existing comments (existingComments). Only add new comments for issues not already in existingComments.  For each distinct issue, leave a single comment and instruct the author to apply it to all affected areas in the pull request.
        - Do not highlight minor issues and nitpicks.
        ${
            enableConfidenceMode
                ? '- For each code review comment you generate, include a (confidenceScore) field that rates your confidence in the likelihood that the comment identifies an actionable issue. Use a scale from 1 to 10, where 1 means very unlikely and 10 means very likely.'
                : ''
        }
        ${modifiedLinesOnly ? '- Only comment on modified lines.' : ''}
        ${checkForBugs ? '- If there are any bugs, highlight them.' : ''}
        ${checkForPerformance ? '- If there are major performance problems, highlight them.' : ''}
        ${
            checkForBestPractices
                ? '- Provide details on missed use of best-practices.'
                : '- Do not provide comments on best practices.'
        }
        ${additionalPrompts.length > 0 ? additionalPrompts.map((str) => `- ${str}`).join('\n') : ''}`;

        this.systemMessage += `The response should be a single JSON object (without fenced codeblock) and it must use this sample JSON format:
        {
            "threads": [
                // Use multiple, separate thread objects for distinct comments at different locations. Line and offset references should be as specific as possible.
                {
                    "comments": [
                        {
                            "content": "<Comment in markdown format without markdown fenced codeblock>",
                            "commentType": 2,
                            ${enableConfidenceMode ? '"confidenceScore": <integer>,' : ''}
                            ${enableConfidenceMode ? '"confidenceScoreJustification": "<string>",' : ''}
                            "fixSuggestion": "<string: If there is code that can replace the original code and fix the commented issue, provide only the replacement code (no explanations, no comments, and no code fences)>",
                            "issueType": "<string: E.g. performance, security, best-practice, style, code smell, etc.>"
                        }
                    ],
                    "status": 1,
                    "threadContext": {
                        "filePath": "<string: path to file.  use filePath that was provided.>",
                        //only include leftFile properties for suggestions on unmodified lines
                        "leftFileStart": {
                            "line": <integer: line where the suggestion starts>,
                            "offset": <integer: character offset where the suggestion starts>,
                            "snippet": "<code snippet for suggestion>"
                        },
                        "leftFileEnd": {
                            "line": <integer: line where the suggestion ends>,
                            "offset": <integer: character offset where the suggestion ends>
                        },
                        //only use rightFile properties if the line changed in the diff
                        "rightFileStart": {
                            "line": <integer: line where the suggestion starts>,
                            "offset": <integer: character offset where the suggestion starts>,
                            "snippet": "<code snippet for suggestion>"
                        },
                        "rightFileEnd": {
                            "line": <integer: line where the suggestion ends>,
                            "offset": <integer: character offset where the suggestion ends>
                        }
                    }
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
            | 'o4-mini'
            | 'o3-mini'
            | 'o1-mini'
            | 'o1-preview'
            | 'o1'
            | 'gpt-4o'
            | 'gpt-4'
            | 'gpt-3.5-turbo';

        let userPrompt = {
            fileName: fileName,
            diff: diff,
            existingComments: existingComments,
        };

        let prompt = JSON.stringify(userPrompt, null, 4);

        Logger.info(`Diff:\n${diff}`);

        if (!this.doesMessageExceedTokenLimit(this.systemMessage + prompt, this.maxTokens)) {
            let openAi = await this._client.chat.completions.create({
                messages: [
                    {
                        role:
                            model.includes('o3') || model.includes('o4')
                                ? 'developer'
                                : model === 'o1-preview' || model === 'o1-mini'
                                ? 'assistant'
                                : 'system',
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
                Logger.info(`Comments:\n${content}`);
                try {
                    return JSON.parse(content);
                } catch (error) {
                    Logger.error(
                        `Failed to parse review response for file ${fileName}.  Returning empty review`,
                        error
                    );
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

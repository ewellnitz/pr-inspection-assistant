import tl from "./taskWrapper";
import { Agent } from "https";
import { AzureDevOps } from "./azureDevOps";
import { GitPullRequest } from "./types/azureDevOps/gitPullRequest";
import { PropertiesCollection } from "./types/azureDevOps/propertiesCollection";

export class PullRequest {
    private _httpsAgent: Agent;

    private _collectionUri: string = tl.getVariable(
        "System.TeamFoundationCollectionUri"
    )!;
    private _teamProjectId: string = tl.getVariable("System.TeamProjectId")!;
    private _repositoryName: string = tl.getVariable("Build.Repository.Name")!;
    private _pullRequestId: string = tl.getVariable(
        "System.PullRequest.PullRequestId"
    )!;
    private _pullRequest?: GitPullRequest;
    private _ado: AzureDevOps;

    private static readonly PRIA_LAST_REVIEWED_KEY =
        "Anthology.Pria.LastReviewedCommit";

    constructor() {
        this._httpsAgent = new Agent({
            rejectUnauthorized: false,
        });
        this._ado = new AzureDevOps();
    }

    public GetBaseUri(): string {
        return `${this._collectionUri}${this._teamProjectId}/_apis/git/repositories/${this._repositoryName}/pullRequests/${this._pullRequestId}`;
    }

    public async GetPullRequest(): Promise<GitPullRequest> {
        if (this._pullRequest) return this._pullRequest;

        tl.debug(`Getting pull request ${this._pullRequestId}`);

        const endpoint = `${this.GetBaseUri()}/?api-version=7.0`;
        return await this._ado.Get<GitPullRequest>(endpoint);
    }

    public async GetLastMergedCommitHash(): Promise<string> {
        tl.debug(`Getting last merged commit hash`);

        if (!this._pullRequest) {
            this._pullRequest = await this.GetPullRequest();
        }

        const result = this._pullRequest.lastMergeCommit.commitId;
        tl.debug(`Last merged commit hash ${result}`);

        return result;
    }

    public async GetLastMergeSourceCommitHash(): Promise<string> {
        tl.debug(`Getting last merge source commit hash`);

        if (!this._pullRequest) {
            this._pullRequest = await this.GetPullRequest();
        }

        const result = this._pullRequest.lastMergeSourceCommit.commitId;
        tl.debug(`Last merged source commit hash ${result}`);

        return result;
    }

    public async GetLastReviewedCommitHash(): Promise<string> {
        const endpoint = `${this.GetBaseUri()}/properties?api-version=7.0`;

        tl.debug(`Getting last reviewed commit hash`);

        let properties = await this._ado.Get<PropertiesCollection>(endpoint);
        const value =
            properties.value[PullRequest.PRIA_LAST_REVIEWED_KEY]?.$value;

        tl.debug(`Last reviewed commit hash ${value}`);
        return value;
    }

    public async SaveLastReviewedCommit(commitHash: string): Promise<boolean> {
        tl.debug(`Saving last reviewed commit hash ${commitHash}`);

        const endpoint = `${this.GetBaseUri()}/properties?api-version=7.0`;
        var body = [
            {
                op: "replace",
                path: `/${PullRequest.PRIA_LAST_REVIEWED_KEY}`,
                value: commitHash,
            },
        ];

        const ok = await this._ado.Patch(endpoint, body);
        if (!ok) {
            tl.warning(
                `Failed to save last reviewed commit hash ${commitHash}`
            );
        }

        return ok;
    }

    public async AddThread(thread: any): Promise<boolean> {
        const endpoint = `${this.GetBaseUri()}/threads?api-version=7.0`;
        const response = await this._ado.Post(endpoint, thread);

        if (!response.ok) {
            if (response.status === 401) {
                tl.setResult(
                    tl.TaskResult.Failed,
                    "The Build Service must have 'Contribute to pull requests' access to the repository. See https://stackoverflow.com/a/57985733 for more information"
                );
            }
        }

        return response.ok;
    }

    public async AddComment(
        fileName: string,
        comment: string
    ): Promise<boolean> {
        if (!fileName.startsWith("/")) {
            fileName = `/${fileName}`;
        }

        let body = {
            comments: [
                {
                    content: comment,
                    commentType: 2,
                },
            ],
            status: 1,
            threadContext: {
                filePath: fileName,
            },
            pullRequestThreadContext: {
                changeTrackingId: 1,
                iterationContext: {
                    firstComparingIteration: 1,
                    secondComparingIteration: 2,
                },
            },
        };

        return this.AddThread(body);
    }

    public async DeleteComment(thread: any, comment: any): Promise<boolean> {
        const removeCommentUrl = `${this.GetBaseUri()}/threads/${
            thread.id
        }/comments/${comment.id}?api-version=5.1`;

        const response = await this._ado.Delete(removeCommentUrl);

        if (!response.ok) {
            tl.warning(
                `Failed to delete comment from url ${removeCommentUrl} the response was ${response.statusText}`
            );
        }

        return response.ok;
    }

    public async DeleteComments() {
        let collectionName = this._collectionUri
            .replace("https://", "")
            .replace("http://", "")
            .split("/")[1];
        let buildServiceName = `${tl.getVariable(
            "SYSTEM.TEAMPROJECT"
        )} Build Service (${collectionName})`;

        let threads = await this.GetThreads();

        for (let thread of threads as any[]) {
            let comments = await this.GetComments(thread);

            for (let comment of comments.value.filter(
                (comment: any) =>
                    comment.author.displayName === buildServiceName
            ) as any[]) {
                await this.DeleteComment(thread, comment);
            }
        }
    }

    public async GetThreads(): Promise<never[]> {
        const threadsEndpoint = `${this.GetBaseUri()}/threads?api-version=5.1`;
        const threads = await this._ado.Get(threadsEndpoint);

        return threads.value.filter(
            (thread: any) => thread.threadContext !== null
        );
    }

    public async GetComments(thread: any): Promise<any> {
        let commentsEndpoint = `${this.GetBaseUri()}/threads/${
            thread.id
        }/comments?api-version=5.1`;

        const comments = await this._ado.Get(commentsEndpoint);
        return comments;
    }

    public async GetCommentsForFile(fileName: string): Promise<string[]> {
        if (!fileName.startsWith("/")) {
            fileName = `/${fileName}`;
        }
        let collectionName = this._collectionUri
            .replace("https://", "")
            .replace("http://", "")
            .split("/")[1];
        let buildServiceName = `${tl.getVariable(
            "SYSTEM.TEAMPROJECT"
        )} Build Service (${collectionName})`;

        const threads = await this.GetThreads();
        const comments: string[] = [];

        console.info(`fileName: ${fileName}`);
        console.info(`collectionName: ${collectionName}`);
        console.info(`buildServiceName: ${buildServiceName}`);
        console.info(`thread count: ${threads.length}`);

        for (let thread of threads as any[]) {
            if (thread.threadContext)
                tl.isVerboseLoggingEnabled() &&
                    console.info(
                        `Thread filePath: ${thread.threadContext.filePath}`
                    );
            if (
                thread.threadContext &&
                thread.threadContext.filePath === fileName
            ) {
                const threadComments = await this.GetComments(thread);
                //TODO: this filter is not working in all envrionments
                //for (let comment of threadComments.value.filter((comment: any) => comment.author.displayName === buildServiceName) as any[]) {
                for (let comment of threadComments.value as any[]) {
                    comments.push(comment.content);
                }
            }
        }

        return comments;
    }
}

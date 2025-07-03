import tl from './taskWrapper';
import { Agent } from 'https';
import { AzureDevOps } from './azureDevOps';
import { GitPullRequest } from './types/azureDevOps/gitPullRequest';
import { PropertiesCollection } from './types/azureDevOps/propertiesCollection';
import { GitPullRequestIterationChanges } from './types/azureDevOps/gitPullRequestIterationChanges';
import { IterationRange } from './types/iterationRange';

export class PullRequest {
    private _httpsAgent: Agent;

    private _collectionUri: string = tl.getVariable('System.TeamFoundationCollectionUri')!;
    private _teamProjectId: string = tl.getVariable('System.TeamProjectId')!;
    private _repositoryName: string = tl.getVariable('Build.Repository.Name')!;
    private _pullRequestId: string = tl.getVariable('System.PullRequest.PullRequestId')!;
    private _pullRequest?: GitPullRequest;
    private _ado: AzureDevOps;

    private static readonly PRIA_LAST_REVIEWED_KEY = 'Pria.LastReviewedIteration';

    constructor() {
        this._httpsAgent = new Agent({
            rejectUnauthorized: false,
        });
        this._ado = new AzureDevOps();
    }

    public getBaseUri(): string {
        return `${this._collectionUri}${this._teamProjectId}/_apis/git/repositories/${this._repositoryName}`;
    }

    public getPullRequestBaseUri(): string {
        return `${this.getBaseUri()}/pullRequests/${this._pullRequestId}`;
    }

    public async getPullRequest(): Promise<GitPullRequest> {
        if (this._pullRequest) return this._pullRequest;

        tl.debug(`Getting pull request ${this._pullRequestId}`);

        const endpoint = `${this.getPullRequestBaseUri()}/?api-version=7.0`;
        return await this._ado.get<GitPullRequest>(endpoint);
    }

    public async getLatestIterationId(): Promise<number> {
        const endpoint = `${this.getPullRequestBaseUri()}/iterations?api-version=7.0`;
        tl.debug(`Fetching iterations for pull request ${this._pullRequestId}`);

        const iterations = await this._ado.get<{ value: { id: number }[] }>(endpoint);
        if (!iterations.value || iterations.value.length === 0) {
            throw new Error(`No iterations found for pull request ${this._pullRequestId}`);
        }

        const latestIteration = Math.max(...iterations.value.map((iteration) => iteration.id));
        console.info(`Latest iteration ID: ${latestIteration}`);

        return latestIteration;
    }

    public async getIterationFiles({ start, end }: IterationRange): Promise<string[]> {
        tl.debug(`Getting files for iteration ${start}-${end}`);

        const endpoint = `${this.getPullRequestBaseUri()}/iterations/${end}/changes?api-version=7.0&$compareTo=${start}`;
        const result = await this._ado.get<GitPullRequestIterationChanges>(endpoint);

        const files = result.changeEntries.map(({ item }) => item.path);
        tl.debug(`Files in iteration ${start}-${end}: ${JSON.stringify(files)}`);

        return files;
    }

    public async getLastReviewedIteration(): Promise<IterationRange> {
        const endpoint = `${this.getPullRequestBaseUri()}/properties?api-version=7.0`;
        let properties = await this._ado.get<PropertiesCollection>(endpoint);
        const value = properties.value[PullRequest.PRIA_LAST_REVIEWED_KEY]?.$value;
        if (!value) {
            console.info(`No last reviewed iteration found, returning default range.`);
            return { start: 0, end: 0 };
        }
        const lastReviewedIteration = JSON.parse(value) as IterationRange;
        console.info(`Last reviewed iteration ${value}`);
        return lastReviewedIteration;
    }

    public async saveLastReviewedIteration({ start, end }: IterationRange): Promise<boolean> {
        tl.debug(`Saving last reviewed iteration ${start}-${end}`);
        const endpoint = `${this.getPullRequestBaseUri()}/properties?api-version=7.0`;
        var body = [
            {
                op: 'replace',
                path: `/${PullRequest.PRIA_LAST_REVIEWED_KEY}`,
                value: JSON.stringify({ start, end } as IterationRange),
            },
        ];

        const response = await this._ado.patch(endpoint, body);
        if (!response.ok) {
            tl.warning(`Failed to save last reviewed iteration ${start}-${end}.`);
        }
        console.info(`Saved last reviewed iteration ${start}-${end}`);

        return response.ok;
    }

    public async addThread(thread: any): Promise<boolean> {
        const endpoint = `${this.getPullRequestBaseUri()}/threads?api-version=7.0`;
        const response = await this._ado.post(endpoint, thread);

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

    public async addComment(fileName: string, comment: string): Promise<boolean> {
        if (!fileName.startsWith('/')) {
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

        return this.addThread(body);
    }

    public async deleteComment(thread: any, comment: any): Promise<boolean> {
        const removeCommentUrl = `${this.getPullRequestBaseUri()}/threads/${thread.id}/comments/${
            comment.id
        }?api-version=5.1`;

        const response = await this._ado.delete(removeCommentUrl);

        if (!response.ok) {
            tl.warning(`Failed to delete comment from url ${removeCommentUrl} the response was ${response.statusText}`);
        }

        return response.ok;
    }

    public async deleteComments() {
        let collectionName = this._collectionUri.replace('https://', '').replace('http://', '').split('/')[1];
        let buildServiceName = `${tl.getVariable('SYSTEM.TEAMPROJECT')} Build Service (${collectionName})`;

        let threads = await this.getThreads();

        for (let thread of threads as any[]) {
            let comments = await this.getComments(thread);

            for (let comment of comments.value.filter(
                (comment: any) => comment.author.displayName === buildServiceName
            ) as any[]) {
                await this.deleteComment(thread, comment);
            }
        }
    }

    public async getThreads(): Promise<never[]> {
        const threadsEndpoint = `${this.getPullRequestBaseUri()}/threads?api-version=5.1`;
        const threads = await this._ado.get(threadsEndpoint);

        return threads.value.filter((thread: any) => thread.threadContext !== null);
    }

    public async getComments(thread: any): Promise<any> {
        let commentsEndpoint = `${this.getPullRequestBaseUri()}/threads/${thread.id}/comments?api-version=5.1`;

        const comments = await this._ado.get(commentsEndpoint);
        return comments;
    }

    public async getCommentsForFile(fileName: string): Promise<string[]> {
        if (!fileName.startsWith('/')) {
            fileName = `/${fileName}`;
        }
        let collectionName = this._collectionUri.replace('https://', '').replace('http://', '').split('/')[1];
        let buildServiceName = `${tl.getVariable('SYSTEM.TEAMPROJECT')} Build Service (${collectionName})`;

        const threads = await this.getThreads();
        const comments: string[] = [];

        console.info(`fileName: ${fileName}`);
        console.info(`collectionName: ${collectionName}`);
        console.info(`buildServiceName: ${buildServiceName}`);
        console.info(`thread count: ${threads.length}`);

        for (let thread of threads as any[]) {
            if (thread.threadContext)
                tl.isVerboseLoggingEnabled() && console.info(`Thread filePath: ${thread.threadContext.filePath}`);
            if (thread.threadContext && thread.threadContext.filePath === fileName) {
                const threadComments = await this.getComments(thread);
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

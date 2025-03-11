import tl from './taskWrapper';
import { Agent } from "https";
import fetch from 'node-fetch';

export class PullRequest {
    private _httpsAgent: Agent;

    private _collectionUri: string = tl.getVariable('System.TeamFoundationCollectionUri')!;
    private _teamProjectId: string = tl.getVariable('System.TeamProjectId')!;
    private _repositoryName: string = tl.getVariable('Build.Repository.Name')!;
    private _pullRequestId: string = tl.getVariable('System.PullRequest.PullRequestId')!;

    constructor() {
        this._httpsAgent = new Agent({
            rejectUnauthorized: false
        });
    }

    public async AddThread(thread: any): Promise<boolean> {
        let endpoint = `${this._collectionUri}${this._teamProjectId}/_apis/git/repositories/${this._repositoryName}/pullRequests/${this._pullRequestId}/threads?api-version=7.0`
        let threadBody = JSON.stringify(thread);

        tl.isVerboseLoggingEnabled() && console.info(`POSTing to ${endpoint} with threadBody:\n${threadBody}`);

        var response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${tl.getVariable('SYSTEM.ACCESSTOKEN')}`, 'Content-Type': 'application/json' },
            body: threadBody,
            agent: this._httpsAgent
        });

        if (response.ok == false) {
            if(response.status == 401) {
                tl.setResult(tl.TaskResult.Failed, "The Build Service must have 'Contribute to pull requests' access to the repository. See https://stackoverflow.com/a/57985733 for more information");
            }

            tl.warning(`${response.status}: ${response.statusText}`);
            tl.warning(`POSTed Body: ${threadBody}`)
        }

        return response.ok;
    }

    public async AddComment(fileName: string, comment: string): Promise<boolean> {
        if (!fileName.startsWith('/')) {
            fileName = `/${fileName}`;
        }
        
        let body = {
            comments: [
                {
                    content: comment,
                    commentType: 2
                }
            ],
            status: 1,
            threadContext: {
                filePath: fileName,
            },
            pullRequestThreadContext: {
                changeTrackingId: 1,
                iterationContext: {
                    firstComparingIteration: 1,
                    secondComparingIteration: 2
                }
            }
        }

        return this.AddThread(body);
    }

    public async DeleteComment(thread: any, comment: any): Promise<boolean> {
        let removeCommentUrl = `${this._collectionUri}${this._teamProjectId}/_apis/git/repositories/${this._repositoryName}/pullRequests/${this._pullRequestId}/threads/${thread.id}/comments/${comment.id}?api-version=5.1`;

        let response = await fetch(removeCommentUrl, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${tl.getVariable('System.AccessToken')}`, 'Content-Type': 'application/json' },
            agent: this._httpsAgent
        });

        if (response.ok == false) {
            tl.warning(`Failed to delete comment from url ${removeCommentUrl} the response was ${response.statusText}`);
        }

        return response.ok;
    }

    public async DeleteComments() {
        let collectionName = this._collectionUri.replace('https://', '').replace('http://', '').split('/')[1];
        let buildServiceName = `${tl.getVariable('SYSTEM.TEAMPROJECT')} Build Service (${collectionName})`;

        let threads = await this.GetThreads();

        for (let thread of threads as any[]) {
            let comments = await this.GetComments(thread);

            for (let comment of comments.value.filter((comment: any) => comment.author.displayName === buildServiceName) as any[]) {
                await this.DeleteComment(thread, comment);
            }
        }
    }

    public async GetThreads(): Promise<never[]> {
        let threadsEndpoint = `${this._collectionUri}${this._teamProjectId}/_apis/git/repositories/${this._repositoryName}/pullRequests/${this._pullRequestId}/threads?api-version=5.1`;
        let threadsResponse = await fetch(threadsEndpoint, {
            headers: { 'Authorization': `Bearer ${tl.getVariable('System.AccessToken')}`, 'Content-Type': 'application/json' },
            agent: this._httpsAgent
        });

        if (threadsResponse.ok == false) {
            tl.warning(`Failed to retrieve threads from url ${threadsEndpoint} the response was ${threadsResponse.statusText}`);
        }

        let threads = await threadsResponse.json();
        return threads.value.filter((thread: any) => thread.threadContext !== null);
    }

    public async GetComments(thread: any): Promise<any> {
        let commentsEndpoint = `${this._collectionUri}${this._teamProjectId}/_apis/git/repositories/${this._repositoryName}/pullRequests/${this._pullRequestId}/threads/${thread.id}/comments?api-version=5.1`;
        let commentsResponse = await fetch(commentsEndpoint, {
            headers: { 'Authorization': `Bearer ${tl.getVariable('System.AccessToken')}`, 'Content-Type': 'application/json' },
            agent: this._httpsAgent
        });

        if (commentsResponse.ok == false) {
            tl.warning(`Failed to retrieve comments from url ${commentsEndpoint} the response was ${commentsResponse.statusText}`);
        }

        return await commentsResponse.json();
    }

    public async GetCommentsForFile(fileName: string): Promise<string[]> {
        if (!fileName.startsWith('/')) {
            fileName = `/${fileName}`;
        }
        let collectionName = this._collectionUri.replace('https://', '').replace('http://', '').split('/')[1];
        let buildServiceName = `${tl.getVariable('SYSTEM.TEAMPROJECT')} Build Service (${collectionName})`;

        const threads = await this.GetThreads();
        const comments: string[] = [];

        console.info(`fileName: ${fileName}`);
        console.info(`collectionName: ${collectionName}`);
        console.info(`buildServiceName: ${buildServiceName}`);
        console.info(`thread count: ${threads.length}`);


        for (let thread of threads as any[]) {
            if (thread.threadContext)
                tl.isVerboseLoggingEnabled() && console.info(`Thread filePath: ${thread.threadContext.filePath}`);
            if (thread.threadContext && thread.threadContext.filePath === fileName) {
                const threadComments = await this.GetComments(thread);
                //TODO: this filter is not working in all envrionments
                //for (let comment of threadComments.value.filter((comment: any) => comment.author.displayName === buildServiceName) as any[]) {
                for (let comment of threadComments.value as any[]){
                    comments.push(comment.content);
                }
            }
        }

        return comments;
    }
}
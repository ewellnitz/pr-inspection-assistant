import { GitCommitRef } from "./gitCommitRef";

export interface GitPullRequest {
    pullRequestId: number;
    lastMergeCommit: GitCommitRef;
    lastMergeSourceCommit: GitCommitRef;
}
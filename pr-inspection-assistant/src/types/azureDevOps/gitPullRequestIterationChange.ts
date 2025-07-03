import { GitPullRequestIterationChangeItem } from './gitPullRequestIterationChangeItem';

export interface GitPullRequestIterationChange {
    changeId: number;
    item: GitPullRequestIterationChangeItem;
}

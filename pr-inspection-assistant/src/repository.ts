import tl from './taskWrapper';
import { SimpleGit, SimpleGitOptions, simpleGit } from 'simple-git';

export class Repository {
    private gitOptions: Partial<SimpleGitOptions> = {
        baseDir: `${tl.getVariable('System.DefaultWorkingDirectory')}`,
        binary: 'git',
    };

    private readonly _repository: SimpleGit;
    private _mergeBase!: string;

    constructor() {
        this._repository = simpleGit(this.gitOptions);
        this._repository.addConfig('core.pager', 'cat');
        this._repository.addConfig('core.quotepath', 'false');
    }

    public async init(): Promise<Repository> {
        await this._repository.fetch();

        this._mergeBase = await this.getMergeBase();
        return this;
    }

    public async setupCurrentBranch(): Promise<void> {
        // Currently, this is only needed for dev mode.  The Azure DevOps pipeline will automatically checkout the PR branch in its build step
        if (tl.isDev() && tl.getVariable('Auto_Setup_PR_Branch') === 'true') {
            const pullRequestBranch = `pull/${tl.getVariable('System_PullRequest_PullRequestId')}/merge`;
            console.info(`Updating PR branch: ${pullRequestBranch}`);

            // Update the local repository with the latest refspec from the remote repository
            await this._repository.fetch('origin', '+refs/pull/*/merge:refs/remotes/pull/*/merge');
            await this._repository.checkout(pullRequestBranch);

            const currentBranch = (await this._repository.branch()).current;
            console.info(`Current branch set to: `, currentBranch);
        }
    }

    public async getDiff(fileName: string): Promise<string> {
        const args = [this._mergeBase, '--', fileName.replace(/^\//, '')];
        console.info('GetDiff()', args.join(' '));
        const diff = await this._repository.diff(args);
        return diff;
    }

    private async getMergeBase(): Promise<string> {
        const source = this.getSourceBranch();
        const command = ['merge-base', this.getTargetBranch(), source];
        console.info('GetMergeBase()', command.join(' '));
        const result = (await this._repository.raw(command)).trim();
        console.info('GetMergeBase() result', result);
        return result;
    }

    private getSourceBranch(): string {
        // TODO: For Dev mode, see about removing need for System.PullRequest.SourceBranch and get it from PR directly
        const sourceBranch = tl.getVariable('System.PullRequest.SourceBranch')?.replace('refs/heads/', '');
        if (!sourceBranch) {
            throw new Error(`Could not find source branch`);
        }
        console.info('GetSourceBranch()', sourceBranch);
        return `origin/${sourceBranch}`;
    }

    private getTargetBranch(): string {
        let target = tl.getVariable('System.PullRequest.TargetBranchName');

        if (!target) {
            target = tl.getVariable('System.PullRequest.TargetBranch')?.replace('refs/heads/', '');
        }

        if (!target) {
            throw new Error(`Could not find target branch`);
        }

        return `origin/${target}`;
    }
}

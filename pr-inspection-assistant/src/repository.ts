import tl from './taskWrapper';
import { SimpleGit, SimpleGitOptions, simpleGit } from "simple-git";
import binaryExtensions from "./binaryExtensions.json";

export class Repository {

    private gitOptions: Partial<SimpleGitOptions> = {
        baseDir: `${tl.getVariable('System.DefaultWorkingDirectory')}`,
        binary: 'git'
    };

    private readonly _repository: SimpleGit;

    constructor() {
        this._repository = simpleGit(this.gitOptions);
        this._repository.addConfig('core.pager', 'cat');
        this._repository.addConfig('core.quotepath', 'false');
    }

    public async SetupCurrentBranch(): Promise<void> {        
        // Currently, this is only needed for dev mode.  The Azure DevOps pipeline will automatically checkout the PR branch in its build step
        if (tl.isDev() && tl.getVariable('Auto_Setup_PR_Branch') === 'true') {
            const pullRequestBranch = `pull/${tl.getVariable('System_PullRequest_PullRequestId')}/merge`;
            console.info(`Updating PR branch: ${pullRequestBranch}`);
            
            // Update the local repository with the latest refspec from the remote repository
            await this._repository.fetch('origin', '+refs/pull/*/merge:refs/remotes/pull/*/merge');
            await this._repository.checkout(pullRequestBranch);

            const currentBranch = (await this._repository.branch()).current;
            console.info(`Current branch set to: `, currentBranch);
            // TODO: check to see if the file diffs are the same as that of ADO PR.  If not, throw an error
        }
    }

    public async GetChangedFiles({ fileExtensions, fileExtensionExcludes, filesToExclude }: { fileExtensions: string | undefined; fileExtensionExcludes: string | undefined, filesToExclude: string | undefined; }): Promise<string[]> {
        await this._repository.fetch();

        let targetBranch = this.GetTargetBranch();

        console.info(`target branch: ${targetBranch}`);
        console.info(`current branch: `, (await this._repository.branch()).current);

        let diffs = await this._repository.diff([targetBranch, '--name-only', '--diff-filter=AM']);
        let files = diffs.split('\n').filter(line => line.trim().length > 0);
        let filesToReview = files.filter(file => !binaryExtensions.includes(file.slice((file.lastIndexOf(".") - 1 >>> 0) + 2)));

        if(fileExtensions) {
            let fileExtensionsToInclude = fileExtensions.trim().split(',');
            filesToReview = filesToReview.filter(file => fileExtensionsToInclude.includes(file.substring(file.lastIndexOf('.'))));
        }

        if(fileExtensionExcludes) {
            let fileExtensionsToExclude = fileExtensionExcludes.trim().split(',');
            filesToReview = filesToReview.filter(file => !fileExtensionsToExclude.includes(file.substring(file.lastIndexOf('.'))));
        }

        if(filesToExclude) {
            let fileNamesToExclude = filesToExclude.trim().split(',')
            filesToReview = filesToReview.filter(file => !fileNamesToExclude.includes(file.split('/').pop()!.trim()))
        }

        return filesToReview;
    }

    public async GetDiff(fileName: string): Promise<string> {
        let targetBranch = this.GetTargetBranch();
        
        let diff = await this._repository.diff([targetBranch, '--', fileName]);

        return diff;
    }

    private GetTargetBranch(): string {
        let targetBranchName = tl.getVariable('System.PullRequest.TargetBranchName');

        if (!targetBranchName) {
            targetBranchName = tl.getVariable('System.PullRequest.TargetBranch')?.replace('refs/heads/', '');
        }

        if (!targetBranchName) {
            throw new Error(`Could not find target branch`)
        }

        const includeOriginPrefix = tl.getVariable('TargetBranch_IncludeOriginPrefix') !== 'false';
        return`${includeOriginPrefix ? 'origin/' : ''}${targetBranchName}`;
    }
}
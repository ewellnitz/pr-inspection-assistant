import { resolveRepositoryName } from './repositoryName';

describe('resolveRepositoryName', () => {
    it('uses the pull request repository from the source repository URI', () => {
        expect(resolveRepositoryName('https://dev.azure.com/org/Project/_git/App', 'shared-pipelines')).toBe('App');
    });

    it('decodes encoded repository names', () => {
        expect(resolveRepositoryName('https://dev.azure.com/org/Project/_git/My%20Repo', 'shared')).toBe('My Repo');
    });

    it('supports on-prem style URIs and trailing query strings', () => {
        expect(resolveRepositoryName('https://tfs.local/tfs/Coll/Project/_git/App?version=GBmain', 'shared')).toBe(
            'App'
        );
    });

    it('falls back to Build.Repository.Name when the URI is missing or not a git URI', () => {
        expect(resolveRepositoryName(undefined, 'App')).toBe('App');
        expect(resolveRepositoryName('', 'App')).toBe('App');
        expect(resolveRepositoryName('https://github.com/org/repo', 'App')).toBe('App');
    });
});

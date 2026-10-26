/**
 * Resolves the name of the Azure DevOps repository that owns the pull request.
 *
 * Build.Repository.Name is the repository that holds the pipeline YAML, which differs from the
 * pull request repository when the pipeline is defined in a shared repository.
 * System.PullRequest.SourceRepositoryURI (https://dev.azure.com/org/project/_git/repo) points at the
 * pull request repository, so it is preferred and Build.Repository.Name is the fallback.
 */
export function resolveRepositoryName(sourceRepositoryUri?: string, buildRepositoryName?: string): string | undefined {
    const fromUri = parseRepositoryNameFromUri(sourceRepositoryUri);
    return fromUri ?? buildRepositoryName;
}

function parseRepositoryNameFromUri(uri?: string): string | undefined {
    if (!uri) return undefined;

    const match = /\/_git\/([^/?#]+)/i.exec(uri);
    if (!match) return undefined;

    try {
        return decodeURIComponent(match[1]);
    } catch {
        return undefined;
    }
}

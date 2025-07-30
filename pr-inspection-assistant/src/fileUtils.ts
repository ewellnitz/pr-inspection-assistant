import binaryExtensions from './binaryExtensions.json';
import micromatch from 'micromatch';

export function filterFilesForReview({
    fileExtensions,
    fileExtensionExcludes,
    filesToInclude,
    filesToExclude,
    files,
}: {
    fileExtensions?: string;
    fileExtensionExcludes?: string;
    filesToInclude?: string;
    filesToExclude?: string;
    files: string[];
}): string[] {
    // Filter out binary files
    let filesToReview = files.filter(
        (file) => !binaryExtensions.includes(file.slice(((file.lastIndexOf('.') - 1) >>> 0) + 2))
    );

    // Handle file extensions and inclusion patterns
    if (fileExtensions || filesToInclude) {
        const fileExtensionsToInclude = parseInputToArray(fileExtensions);
        const fileToIncludeGlob = parseInputToArray(filesToInclude);

        filesToReview = filesToReview.filter((file) => {
            const fileExtension = getFileExtension(file);
            return (
                fileExtensionsToInclude.includes(fileExtension) ||
                micromatch.isMatch(file, fileToIncludeGlob, { nocase: true })
            );
        });
    }

    // Handle file extension exclusions and exclusion patterns
    if (fileExtensionExcludes || filesToExclude) {
        const fileExtensionsToExclude = parseInputToArray(fileExtensionExcludes);
        const filesToExcludeGlob = parseInputToArray(filesToExclude);

        filesToReview = filesToReview.filter((file) => {
            const fileExtension = getFileExtension(file);
            return (
                !fileExtensionsToExclude.includes(fileExtension) &&
                !micromatch.isMatch(file, filesToExcludeGlob, { nocase: true })
            );
        });
    }

    return filesToReview;
}

function parseInputToArray(input?: string): string[] {
    return input?.trim().split(/\s*,\s*/) ?? [];
}

function getFileExtension(fileName: string): string {
    return fileName.substring(fileName.lastIndexOf('.'));
}

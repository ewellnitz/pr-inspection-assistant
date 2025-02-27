import parseGitDiff, { AddedLine, AnyChunk, AnyLineChange, DeletedLine, GitDiff, UnchangedLine } from 'parse-git-diff';

/**
 * The `CommentLineNumberAndOffsetFixer` class provides methods to adjust the line numbers and offsets of comments
 * in a review based on a provided git diff. This is useful for ensuring that comments remain correctly positioned
 * after changes have been made to the code.
 */
export class CommentLineNumberAndOffsetFixer {
    /**
     * Fixes the line numbers and offsets of comments in a review based on the provided git diff.
     * @param review - The review object containing threads with comments.
     * @param diff - The git diff string used to adjust the line numbers and offsets.
     */
    public fix(review: any, diff: string): void {
        if (!review.threads.length) {
            console.info('No threads found in the review. No line numbers to fix.');
            return;
        }

        console.info(`Fixing comment line numbers for review with ${review.threads.length} threads. Diff content:`, diff);
        const parsedDiff = parseGitDiff(diff);

        for (const thread of review.threads) {
            if (thread.threadContext) {
                console.info(`Thread before: ${JSON.stringify(thread, null, 4)}`);
                this.fixThreadContextLineNumberAndOffsets(thread.threadContext, parsedDiff, true);
                this.fixThreadContextLineNumberAndOffsets(thread.threadContext, parsedDiff, false);
                console.info(`Thread after:`, JSON.stringify(thread, null, 4));
            }
        }
    }

    /**
     * Fixes the line numbers and offsets in the thread context based on the parsed diff.
     *
     * @param threadContext - The context of the thread containing line numbers and offsets.
     * @param parsedDiff - The parsed Git diff containing changes.
     * @param isRightSide - A boolean indicating whether the changes are on the right side of the diff.
     * @returns void
     */
    private fixThreadContextLineNumberAndOffsets(threadContext: any, parsedDiff: GitDiff, isRightSide: boolean): void {
        const fileStart = isRightSide ? threadContext.rightFileStart : threadContext.leftFileStart;
        const fileEnd = isRightSide ? threadContext.rightFileEnd : threadContext.leftFileEnd;
    
        if (fileStart?.snippet?.length) {
            this.updateFileStartAndEnd(fileStart, fileEnd, parsedDiff, isRightSide);
        }
    }

    /**
     * Updates the start and end line numbers and offsets for a file based on the provided git diff.
     * @param fileStart - The start context of the file.
     * @param fileEnd - The end context of the file.
     * @param parsedDiff - The parsed git diff object.
     * @param isRightSide - A boolean indicating if the changes are on the right side of the diff.
     */
    private updateFileStartAndEnd(fileStart: any, fileEnd: any, parsedDiff: GitDiff, isRightSide: boolean): void {
        const snippets = fileStart.snippet.split('\n');
        const isMultilineSnippet = snippets.length > 1;
        console.info('isMultilineSnippet', isMultilineSnippet);
        const snippetFirst = snippets[0];
        
        const { lineNumber, offset } = this.getLineNumberAndOffset(parsedDiff, snippetFirst, fileStart.line, isRightSide);
        if (lineNumber === undefined || offset === undefined) {
            console.warn('No line number or offset found for snippet:', snippetFirst, 'line:');
            return;
        }

        fileStart.line = lineNumber;
        fileStart.offset = offset;
        fileEnd.line = lineNumber;
        fileEnd.offset = offset + snippetFirst.length;

        if (isMultilineSnippet) {
            this.updateFileEndForMultilineSnippet(fileEnd, snippets, parsedDiff, isRightSide);
        }
    }

    /**
     * Updates the `fileEnd` object to reflect the end position of a multiline snippet.
     *
     * @param fileEnd - The object representing the end of the file, which will be updated with the new line number and offset.
     * @param snippets - An array of strings representing the snippets of code.
     * @param parsedDiff - The parsed Git diff object containing information about the changes.
     * @param isRightSide - A boolean indicating whether the changes are on the right side of the diff.
     */
    private updateFileEndForMultilineSnippet(fileEnd: any, snippets: string[], parsedDiff: GitDiff, isRightSide: boolean): void {
        const snippetLast = snippets[snippets.length - 1];
        const { lineNumber: lastLineNumber, offset: lastLineOffset } = this.getLineNumberAndOffset(parsedDiff, snippetLast, fileEnd.line, isRightSide);
        if (lastLineNumber === undefined || lastLineOffset === undefined) {
            console.warn('No line number or offset found for last line of snippet:', snippetLast);
            return;
        }
        fileEnd.line = lastLineNumber;
        fileEnd.offset = lastLineOffset + snippetLast.length;
    }

    /**
     * Retrieves the line number and offset of a specified text within a parsed Git diff.
     *
     * @param parsedDiff - The parsed Git diff object.
     * @param searchText - The text to search for within the diff.
     * @param originalLineNumber - The original line number to start the search from.
     * @param shouldSearchRightSide - A boolean indicating whether to search on the right side of the diff. Defaults to true.
     * @returns An object containing the line number and offset of the searchText within the diff. If the text is not found, both values will be undefined.
     */
    private getLineNumberAndOffset(parsedDiff: GitDiff, searchText: string, originalLineNumber: number, shouldSearchRightSide: boolean = true): { lineNumber: number | undefined, offset: number | undefined } {
        const line = this.getGitDiffLine(parsedDiff, searchText, originalLineNumber, shouldSearchRightSide);
        if (!line) {
            return { lineNumber: undefined, offset: undefined };
        }
        const lineNumber = this.getLineNumber(line, shouldSearchRightSide);
        const offset = line.content.indexOf(searchText) + 1;
        return { lineNumber, offset };
    }

    /**
     * Retrieves the line number from the given diff line metadata.
     *
     * @param diffLineMeta - The metadata of the line change.
     * @param isRightSide - A boolean indicating whether to retrieve the line number from the right side (after the change) or the left side (before the change).
     * @returns The line number from the specified side, or undefined if not applicable.
     */
    private getLineNumber(diffLineMeta: AnyLineChange, isRightSide: boolean): number | undefined {
        return isRightSide 
            ? (diffLineMeta as AddedLine | UnchangedLine)?.lineAfter 
            : (diffLineMeta as DeletedLine | UnchangedLine)?.lineBefore;
    }

    /**
     * Retrieves the closest line number from a Git diff that matches the specified search text.
     *
     * @param diff - The Git diff object containing the changes.
     * @param searchText - The text to search for within the diff.
     * @param originalLineNumber - The original line number to find the closest match for.
     * @param shouldSearchRightSide - Optional. Indicates whether to search the right side of the diff. Defaults to true.
     * @returns The closest line number that matches the search text, or undefined if no match is found.
     */
    private getGitDiffLine(diff: GitDiff, searchText: string, originalLineNumber: number, shouldSearchRightSide: boolean = true) {
        const changes = this.getChangesFromDiff(diff);
        const lines = this.filterChanges(changes, searchText, shouldSearchRightSide);
        const line = this.findClosestLine(lines, originalLineNumber, shouldSearchRightSide);

        if (!line) {
            this.logWarnings(searchText, originalLineNumber, shouldSearchRightSide, changes, lines, diff);
        }

        console.info('getGitDiffLine:', line);

        return line;
    }

    /**
     * Extracts and returns an array of line changes from the given Git diff.
     *
     * @param diff - The Git diff object containing file changes.
     * @returns An array of line changes extracted from the diff.
     */
    private getChangesFromDiff(diff: GitDiff): AnyLineChange[] {
        if (!diff.files.length) {
            console.warn('No files found in the diff.');
            return [];
        }
        return diff.files[0].chunks.flatMap((chunk) => 'changes' in chunk ? chunk.changes : []);
    }

    /**
     * Filters an array of line changes based on the provided search text and side of the changes.
     *
     * @param changes - An array of line changes to filter.
     * @param searchText - The text to search for within the line changes.
     * @param shouldSearchRightSide - A boolean indicating whether to search the right side (added lines) or the left side (deleted lines).
     * @returns An array of line changes that match the search criteria.
     */
    private filterChanges(changes: AnyLineChange[], searchText: string, shouldSearchRightSide: boolean): AnyLineChange[] {
        return changes.filter((change: AnyLineChange) => 
            change.content.includes(searchText) && 
            (change.type === 'UnchangedLine' || change.type === (shouldSearchRightSide ? 'AddedLine' : 'DeletedLine'))
        );
    }

    /**
     * Finds the closest line to the given original line number from a list of line changes.
     *
     * @param lines - An array of line changes to search through.
     * @param originalLineNumber - The original line number to find the closest line to.
     * @param shouldSearchRightSide - A boolean indicating whether to search the right side (true) or the left side (false).
     * @returns The closest line change to the original line number, or undefined if the list is empty.
     */
    private findClosestLine(lines: AnyLineChange[], originalLineNumber: number, shouldSearchRightSide: boolean): AnyLineChange | undefined {
        return lines.reduce((previous: AnyLineChange, current: AnyLineChange) => {
            if (shouldSearchRightSide) {
                const currentLine = current as AddedLine | UnchangedLine;
                const previousLine = previous as AddedLine | UnchangedLine;
                return Math.abs(currentLine.lineAfter - originalLineNumber) < Math.abs(previousLine.lineAfter - originalLineNumber) ? currentLine : previousLine;
            } else {
                const currentLine = current as DeletedLine | UnchangedLine;
                const previousLine = previous as DeletedLine | UnchangedLine;
                return Math.abs(currentLine.lineBefore - originalLineNumber) < Math.abs(previousLine.lineBefore - originalLineNumber) ? currentLine : previousLine;
            }
        }, lines[0]);
    }

    /**
     * Logs warnings when no line is found for the given search text.
     *
     * @param searchText - The text to search for in the diff.
     * @param originalLineNumber - The original line number where the search text was expected.
     * @param shouldSearchRightSide - A flag indicating whether to search the right side of the diff.
     * @param changes - An array of changes that were applied.
     * @param lines - An array of all line changes.
     * @param diff - The Git diff object containing the changes.
     */
    private logWarnings(searchText: string, originalLineNumber: number, shouldSearchRightSide: boolean, changes: AnyLineChange[], lines: AnyLineChange[], diff: GitDiff): void {
        console.warn('getGitDiffLine: No line found for searchText:', searchText, 'originalLineNumber:', originalLineNumber, 'shouldSearchRightSide:', shouldSearchRightSide);
        console.warn('changes', JSON.stringify(changes, null, 4));
        console.warn('lines', JSON.stringify(lines, null, 4));
        console.warn('diff', JSON.stringify(diff, null, 4));
    }
}
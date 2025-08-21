import { InputValues } from './types/inputValues';
import { Comment } from './types/comment';
import { Logger } from './logger';

/**
 * Utilities for filtering and processing comments.
 */
export class CommentUtils {
    /**
     * Filter comments by confidence mode and minimum confidence.
     */
    static filterCommentsByInputs(comments: Comment[], inputs: InputValues) {
        if (inputs.confidenceMode) {
            const { filteredOut, remaining } = this.filterCommentsByConfidence(comments, inputs.confidenceMinimum);
            return { filteredOut, remaining };
        }
        return { filteredOut: [], remaining: comments };
    }

    /**
     * Filter comments by confidence score.
     */
    static filterCommentsByConfidence(comments: Comment[], confidenceMinimum: number) {
        const filteredOut: Comment[] = [];
        const remaining: Comment[] = [];
        comments.forEach((comment) => {
            if (comment.confidenceScore !== undefined && comment.confidenceScore < confidenceMinimum) {
                filteredOut.push(comment);
            } else {
                remaining.push(comment);
            }
        });
        return { filteredOut, remaining };
    }

    /**
     * Determines which comment contents should be excluded based on deduplication logic.
     * File comments are always excluded. Run comments are excluded if deduplication criteria are met (based on flag and threshold).
     *
     * @param fileComments - Comments already present in the file.
     * @param runComments - Comments generated in the current review run.
     * @param inputs - Input values controlling deduplication and filtering.
     * @param deduplicationCriteriaMet - Whether deduplication criteria has already been met.
     * @returns A tuple: [array of comment contents to exclude, updated deduplication criteria state].
     */
    static getCommentContentForExclusion(
        fileComments: Comment[],
        runComments: Comment[],
        inputs: InputValues,
        deduplicationCriteriaMet: boolean
    ): [string[], boolean] {
        let commentsForExclusion = [...fileComments];
        let dedupeMet = deduplicationCriteriaMet;
        if (inputs.dedupeAcrossFiles) {
            if (!dedupeMet) {
                const currentRunCommentCount = this.filterCommentsByInputs(runComments, inputs).remaining.length;
                Logger.info(`Current run comment count: ${currentRunCommentCount}`);

                if (currentRunCommentCount > inputs.dedupeAcrossFilesThreshold) {
                    dedupeMet = true;
                    Logger.info('Deduplicate comments across files criteria met.');
                } else {
                    Logger.info('Deduplicate comments across files criteria has NOT been met.');
                }
            }
            if (dedupeMet) {
                commentsForExclusion = [...fileComments, ...runComments];
            }
        }
        return [commentsForExclusion.map((comment) => comment.content), dedupeMet];
    }
}

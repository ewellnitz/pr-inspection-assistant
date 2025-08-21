import { CommentUtils } from './commentUtils';
import { InputValues } from './types/inputValues';
import { Comment } from './types/comment';

describe('CommentUtils.getCommentContentForExclusion', () => {
    const fileComments: Comment[] = [
        { content: 'A', confidenceScore: 0.9, commentType: 0 },
        { content: 'B', confidenceScore: 0.5, commentType: 0 },
    ];
    const runComments: Comment[] = [
        { content: 'C', confidenceScore: 0.7, commentType: 0 },
        { content: 'D', confidenceScore: 0.3, commentType: 0 },
    ];
    const baseInputs = {
        confidenceMode: true,
        confidenceMinimum: 0.6,
        dedupeAcrossFiles: true,
        dedupeAcrossFilesThreshold: 1,
    } as InputValues;

    it('returns only file comments if deduplication threshold is not met', () => {
        const [excluded, dedupeMet] = CommentUtils.getCommentContentForExclusion(
            fileComments,
            runComments.slice(0, 1), // Only 1 run comment, threshold is 1
            baseInputs,
            false
        );
        expect(excluded).toEqual(['A', 'B']);
        expect(dedupeMet).toBe(false);
    });

    it('returns only file comments if not enough run comments pass confidence to exceed threshold', () => {
        const [excluded, dedupeMet] = CommentUtils.getCommentContentForExclusion(
            fileComments,
            runComments, // Only 1 run comment passes confidence, threshold is 1
            baseInputs,
            false
        );
        expect(excluded).toEqual(['A', 'B']);
        expect(dedupeMet).toBe(false);
    });

    it('returns file and run comments and sets deduplication flag to true when threshold is exceeded (all run comments pass confidence)', () => {
        const passingRunComments: Comment[] = [
            { content: 'C', confidenceScore: 0.7, commentType: 0 },
            { content: 'D', confidenceScore: 0.8, commentType: 0 },
        ];
        const [excluded, dedupeMet] = CommentUtils.getCommentContentForExclusion(
            fileComments,
            passingRunComments, // 2 run comments pass confidence, threshold is 1
            baseInputs,
            false
        );
        expect(excluded).toEqual(['A', 'B', 'C', 'D']);
        expect(dedupeMet).toBe(true);
    });

    it('returns file and run comments if deduplication already met', () => {
        const [excluded, dedupeMet] = CommentUtils.getCommentContentForExclusion(
            fileComments,
            runComments,
            baseInputs,
            true // Deduplication already met
        );
        expect(excluded).toEqual(['A', 'B', 'C', 'D']);
        expect(dedupeMet).toBe(true);
    });

    it('returns only file comments if dedupeAcrossFiles mode is off', () => {
        const inputs = { ...baseInputs, dedupeAcrossFiles: false };
        const [excluded, dedupeMet] = CommentUtils.getCommentContentForExclusion(
            fileComments,
            runComments,
            inputs,
            false
        );
        expect(excluded).toEqual(['A', 'B']);
        expect(dedupeMet).toBe(false);
    });

    it('returns file and run comments if deduplication threshold is exceeded and confidenceMode is false', () => {
        const inputs = {
            ...baseInputs,
            confidenceMode: false,
        };
        // All run comments are counted, so 2 > 1 triggers deduplication
        const [excluded, dedupeMet] = CommentUtils.getCommentContentForExclusion(
            fileComments,
            runComments,
            inputs,
            false
        );
        expect(excluded).toEqual(['A', 'B', 'C', 'D']);
        expect(dedupeMet).toBe(true);
    });
});

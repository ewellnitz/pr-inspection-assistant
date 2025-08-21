import { CommentUtils } from './commentUtils';
import { InputValues } from './types/inputValues';
import { Comment } from './types/comment';

describe('CommentUtils', () => {
    const baseComments: Comment[] = [
        { content: 'A', confidenceScore: 0.9, commentType: 0 },
        { content: 'B', confidenceScore: 0.5, commentType: 0 },
        { content: 'C', confidenceScore: 0.2, commentType: 0 },
        { content: 'D', commentType: 0 }, // No confidenceScore
    ];

    describe('filterCommentsByConfidence', () => {
        it('filters out comments below the minimum confidence', () => {
            const { filteredOut, remaining } = CommentUtils.filterCommentsByConfidence(baseComments, 0.6);
            expect(filteredOut.map((c) => c.content)).toEqual(['B', 'C']);
            expect(remaining.map((c) => c.content)).toEqual(['A', 'D']);
        });
        it('returns all comments as remaining if all meet threshold', () => {
            const { filteredOut, remaining } = CommentUtils.filterCommentsByConfidence(baseComments, 0.1);
            expect(filteredOut).toEqual([]);
            expect(remaining.length).toBe(4);
        });
        it('returns all comments as filteredOut if all below threshold', () => {
            const { filteredOut, remaining } = CommentUtils.filterCommentsByConfidence(baseComments, 1.0);
            expect(filteredOut.length).toBe(3); // D has no score, so remains
            expect(remaining.map((c) => c.content)).toEqual(['D']);
        });
    });

    describe('filterCommentsByInputs', () => {
        const baseInputs = {
            confidenceMode: true,
            confidenceMinimum: 0.6,
        } as InputValues;

        it('filters using confidenceMode and confidenceMinimum', () => {
            const { filteredOut, remaining } = CommentUtils.filterCommentsByInputs(baseComments, baseInputs);
            expect(filteredOut.map((c) => c.content)).toEqual(['B', 'C']);
            expect(remaining.map((c) => c.content)).toEqual(['A', 'D']);
        });
        it('returns all as remaining if confidenceMode is false', () => {
            const inputs = { ...baseInputs, confidenceMode: false };
            const { filteredOut, remaining } = CommentUtils.filterCommentsByInputs(baseComments, inputs);
            expect(filteredOut).toEqual([]);
            expect(remaining.length).toBe(4);
        });
    });
});

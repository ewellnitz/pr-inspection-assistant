import { CommentLineNumberAndOffsetFixer } from './commentLineNumberAndOffsetFixer';
import { Review } from './types/review';
import testData from './commentLineNumberAndOffsetFixer.testData';

describe('CommentLineNumberAndOffsetFixer', () => {
  test('should not fix when review has no threads', () => {
    const review = { threads: [] };
    
    CommentLineNumberAndOffsetFixer.fix(review, '');

    expect(review.threads.length).toEqual(0);
  });

  test('should fix single line comment', () => {
    const review:Review = testData.reviews.singleLine;

    CommentLineNumberAndOffsetFixer.fix(review, testData.diffs.singleLine);

    const threadContext = review.threads[0].threadContext;
    expect(threadContext.rightFileStart!.line).toEqual(2543);
    expect(threadContext.rightFileStart!.offset).toEqual(17);
    expect(threadContext.rightFileEnd!.line).toEqual(2543);
    expect(threadContext.rightFileEnd!.offset).toEqual(91);
  });

  test('should fix multi-line comment', () => {
    const review: Review = testData.reviews.multiLine;  

    CommentLineNumberAndOffsetFixer.fix(review, testData.diffs.multiLine);

    const threadContext = review.threads[0].threadContext;
    expect(threadContext.rightFileStart!.line).toEqual(2543);
    expect(threadContext.rightFileStart!.offset).toEqual(17);
    expect(threadContext.rightFileEnd!.line).toEqual(2544);
    expect(threadContext.rightFileEnd!.offset).toEqual(56);
  });

  test('should fix multi-line comment w/ carriage return', () => {
    const review:Review = testData.reviews.multiLineWithCarriageReturn;

    CommentLineNumberAndOffsetFixer.fix(review, testData.diffs.multiLine);

    const threadContext = review.threads[0].threadContext;
    expect(threadContext.rightFileStart!.line).toEqual(2543);
    expect(threadContext.rightFileStart!.offset).toEqual(17);
    expect(threadContext.rightFileEnd!.line).toEqual(2544);
    expect(threadContext.rightFileEnd!.offset).toEqual(56);
  });
});

import { filterFilesForReview } from './fileUtils';

describe('filterFilesForReview', () => {
    test('should return all files when no filters are applied', async () => {
        const files = ['file1.txt', 'file2.js', 'file3.js'];
        const result = filterFilesForReview({
            files,
        });
        expect(result).toEqual(['file1.txt', 'file2.js', 'file3.js']);
    });

    test('should exclude binary files', async () => {
        const files = ['file1.txt', 'file2.js', 'file3.exe', 'file4.pdf'];
        const result = filterFilesForReview({
            files,
        });
        expect(result).toEqual(['file1.txt', 'file2.js']);
    });

    test('should filter files by fileExtensions', async () => {
        const files = ['file1.txt', 'file2.js', 'file3.cs'];
        const result = filterFilesForReview({
            fileExtensions: '.txt,.js',
            files,
        });
        expect(result).toEqual(['file1.txt', 'file2.js']);
    });

    test('should filter files by fileExtensions (w/ comma-space delimiter)', async () => {
        const files = ['file1.txt', 'file2.js', 'file3.cs', 'file4.ts'];
        const result = filterFilesForReview({
            fileExtensions: '.txt, .js,  .cs',
            files,
        });
        expect(result).toEqual(['file1.txt', 'file2.js', 'file3.cs']);
    });

    test('should exclude files by fileExtensionExcludes', async () => {
        const files = ['file1.txt', 'file2.js', 'file3.cs'];
        const result = filterFilesForReview({
            fileExtensionExcludes: '.js',
            files,
        });
        expect(result).toEqual(['file1.txt', 'file3.cs']);
    });

    test('should exclude files by multiple fileExtensionExcludes', async () => {
        const files = ['file1.txt', 'file2.js', 'file3.cs', 'file4.ts'];
        const result = filterFilesForReview({
            fileExtensionExcludes: '.js,.cs, .ts',
            files,
        });
        expect(result).toEqual(['file1.txt']);
    });

    test('should include files by filesToInclude', async () => {
        const files = ['file1.txt', 'file2.js', 'file3.cs'];
        const result = filterFilesForReview({
            filesToInclude: 'file2.js',
            files,
        });
        expect(result).toEqual(['file2.js']);
    });

    test('should exclude files by filesToExclude', async () => {
        const files = ['file1.txt', 'file2.js', 'file3.cs'];
        const result = filterFilesForReview({
            filesToExclude: 'file2.js',
            files,
        });
        expect(result).toEqual(['file1.txt', 'file3.cs']);
    });

    test('should apply multiple filters', async () => {
        const files = ['file1.txt', 'file2.js', 'file3.exe', 'file4.md'];
        const result = filterFilesForReview({
            fileExtensions: '.txt,.js',
            fileExtensionExcludes: '.js',
            filesToInclude: 'file3.txt',
            filesToExclude: 'file4.md',
            files,
        });
        expect(result).toEqual(['file1.txt']);
    });

    describe('filesToInclude with glob patterns', () => {
        test('should include files matching glob pattern for root directory', async () => {
            const files = ['file1.js', 'file2.txt', 'test/file3.js'];
            const result = filterFilesForReview({
                filesToInclude: '*.js,f*2.txt',
                files,
            });
            expect(result).toEqual(['file1.js', 'file2.txt']);
        });

        test('should include files matching glob pattern for specific directory', async () => {
            const files = ['src/file1.txt', 'src/file2.js', 'test/file3.js'];
            const result = filterFilesForReview({
                filesToInclude: 'src/*',
                files,
            });
            expect(result).toEqual(['src/file1.txt', 'src/file2.js']);
        });

        test('should include files matching glob pattern for all directories', async () => {
            const files = ['src/file1.txt', 'src/file2.js', 'test/file3.js'];
            const result = filterFilesForReview({
                filesToInclude: '**/*.js',
                files,
            });
            expect(result).toEqual(['src/file2.js', 'test/file3.js']);
        });

        test('should include files matching multiple glob patterns', async () => {
            const files = ['file1.txt', 'file2.js', 'src/file3.js', 'test/file4.js', 'docs/file5.md'];
            const result = filterFilesForReview({
                filesToInclude: '*.txt,*2.js,src/*,docs/*',
                files,
            });
            expect(result).toEqual(['file1.txt', 'file2.js', 'src/file3.js', 'docs/file5.md']);
        });
    });

    describe('filesToExclude with glob patterns', () => {
        test('should exclude files using glob patterns', async () => {
            const files = ['src/file1.txt', 'src/file2.js', 'test/file3.js'];
            const result = filterFilesForReview({
                filesToExclude: 'src/*',
                files,
            });
            expect(result).toEqual(['test/file3.js']);
        });

        test('should include files matching glob patterns', async () => {
            const files = ['src/file1.txt', 'src/file2.js', 'test/file3.js'];
            const result = filterFilesForReview({
                filesToExclude: '!test/*',
                files,
            });
            expect(result).toEqual(['test/file3.js']);
        });
    });
});

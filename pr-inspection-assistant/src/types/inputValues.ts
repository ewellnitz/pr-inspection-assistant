export interface InputValues {
    apiKey: string;
    azureApiEndpoint: string | undefined;
    azureApiVersion: string | undefined;
    azureModelDeployment: string | undefined;
    fileExtensions: string | undefined;
    fileExtensionExcludes: string | undefined;
    filesToInclude: string | undefined;
    filesToExclude: string | undefined;
    additionalPrompts: string[] | undefined;
    bugs: boolean;
    performance: boolean;
    bestPractices: boolean;
    modifiedLinesOnly: boolean;
    enableCommentLineCorrection: boolean;
    allowRequeue: boolean;
    confidenceMode: boolean;
    confidenceMinimum: number;
    dedupeAcrossFiles: boolean;
    dedupeAcrossFilesThreshold: number;
}

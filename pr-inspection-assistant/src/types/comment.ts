export interface Comment {
    content: string;
    commentType: number;
    confidenceScore?: number;
    confidenceScoreJustification?: string;
    fixSuggestion?: string;
    issueType: string;
}

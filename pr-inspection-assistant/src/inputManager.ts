import tl from './taskWrapper';
import { InputValues } from './types/inputValues';
import { Logger } from './logger';

export class InputManager {
    public static logInputs(inputs: any): void {
        for (const [key, value] of Object.entries(inputs)) {
            if (key === 'apiKey') {
                Logger.info(`${key}: ***`); // Mask sensitive fields
            } else {
                Logger.info(`${key}: ${value}`);
            }
        }
    }
    private static _inputs: InputValues;

    public static get inputs(): InputValues {
        if (!this._inputs) {
            this._inputs = this.loadInputs();
        }
        return this._inputs;
    }

    private static loadInputs(): InputValues {
        const inputs = {
            apiKey: tl.getInput('api_key', true)!,
            azureApiEndpoint: tl.getInput('api_endpoint', false)!,
            azureApiVersion: tl.getInput('api_version', false)!,
            azureModelDeployment: tl.getInput('ai_model', false)!,
            fileExtensions: tl.getInput('file_extensions', false),
            fileExtensionExcludes: tl.getInput('file_extension_excludes', false),
            filesToInclude: tl.getInput('file_includes', false),
            filesToExclude: tl.getInput('file_excludes', false),
            additionalPrompts: tl.getInput('additional_prompts', false)?.split(','),
            bugs: tl.getBoolInput('bugs', false),
            performance: tl.getBoolInput('performance', false),
            bestPractices: tl.getBoolInput('best_practices', false),
            modifiedLinesOnly: tl.getBoolInput('modified_lines_only', false),
            enableCommentLineCorrection: tl.getBoolInput('comment_line_correction', false),
            allowRequeue: tl.getBoolInput('allow_requeue', false),
            confidenceMode: tl.getBoolInput('confidence_mode', false),
            confidenceMinimum: parseInt(tl.getInput('confidence_minimum', false) ?? '9', 10),
            dedupeAcrossFiles: tl.getBoolInput('dedupe_across_files', false),
            dedupeAcrossFilesThreshold: parseInt(tl.getInput('dedupe_across_files_threshold', false) ?? '10', 10),
        };
        this.logInputs(inputs);
        return inputs;
    }
}

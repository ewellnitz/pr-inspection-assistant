import * as tl from 'azure-pipelines-task-lib/task';

export const isDev = () => process.env.Dev_Mode === 'true';
export const isVerboseLoggingEnabled = () => _getInput('verbose_logging', false) === 'true';

const envVar = (name:string) => process.env[name.replaceAll('.', '_')];

console.info('isDev: ', isDev());
console.info('verboseLogging: ', isVerboseLoggingEnabled());

function _getInput(name: string, required?: boolean): string | undefined {
    return isDev() ? envVar(name) : tl.getInput(name, required);
};

export function getInput(name: string, required?: boolean): string | undefined {
    const result = _getInput(name, required);
    if (isVerboseLoggingEnabled()) {
        console.info(`getInput: ${name} = ${result}`);
    }
    return result;
};

export function getBoolInput(name: string, required?: boolean): boolean {
    const result = isDev() ? envVar(name) === 'true' : tl.getBoolInput(name, required);
    if (isVerboseLoggingEnabled()) {
        console.info(`getBoolInput: ${name} = ${result}`);
    }
    return result;
};

export function getVariable(name: string): string | undefined {
    const result = isDev() ? envVar(name) : tl.getVariable(name);
    if (isVerboseLoggingEnabled()) {
        console.info(`getVariable: ${name} = ${result}`);
    }
    return result;
};

// re-export everything from task-lib
export * from 'azure-pipelines-task-lib/task';

export default {
    ...tl,
    getVariable,
    getInput,
    getBoolInput,
    isVerboseLoggingEnabled,
    isDev
};
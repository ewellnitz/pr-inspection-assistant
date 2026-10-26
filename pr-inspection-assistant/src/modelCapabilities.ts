export type SystemMessageRole = 'system' | 'developer' | 'assistant';

// Rules are matched in order against the model (or Azure deployment) name, so custom names are supported.
const systemMessageRoleRules: { matches: (model: string) => boolean; role: SystemMessageRole }[] = [
    { matches: (model) => model.includes('o3') || model.includes('o4'), role: 'developer' },
    { matches: (model) => model === 'o1-preview' || model === 'o1-mini', role: 'assistant' },
];

export function getSystemMessageRole(model: string): SystemMessageRole {
    return systemMessageRoleRules.find((rule) => rule.matches(model))?.role ?? 'system';
}

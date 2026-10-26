import { getSystemMessageRole } from './modelCapabilities';

describe('getSystemMessageRole', () => {
    it.each(['o4-mini', 'o3-mini', 'o3'])('uses the developer role for %s', (model) => {
        expect(getSystemMessageRole(model)).toBe('developer');
    });

    it.each(['o1-preview', 'o1-mini'])('uses the assistant role for %s', (model) => {
        expect(getSystemMessageRole(model)).toBe('assistant');
    });

    it.each(['gpt-4o', 'gpt-4', 'gpt-3.5-turbo', 'o1'])('uses the system role for %s', (model) => {
        expect(getSystemMessageRole(model)).toBe('system');
    });

    it('supports custom Azure deployment names', () => {
        expect(getSystemMessageRole('my-team-o4-mini-deployment')).toBe('developer');
        expect(getSystemMessageRole('my-team-gpt-deployment')).toBe('system');
    });
});

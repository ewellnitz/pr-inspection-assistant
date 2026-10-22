import { OpenAI } from 'openai';
import { ChatGPT } from './chatGpt';

describe('ChatGPT system message', () => {
    const buildSystemMessage = (additionalPrompts: string[]): string => {
        const chatGpt = new ChatGPT(new OpenAI({ apiKey: 'test' }), false, false, false, true, false, additionalPrompts);
        return (chatGpt as any).systemMessage;
    };

    it('keeps the response format instructions on their own line after additional prompts', () => {
        const message = buildSystemMessage(['Use Code Review Comment Prefixes']);

        expect(message).toContain('- Use Code Review Comment Prefixes\nThe response should be');
        expect(message).not.toContain('PrefixesThe response');
    });

    it('lists each additional prompt on its own line', () => {
        const message = buildSystemMessage(['First prompt', 'Second prompt']);

        expect(message).toContain('- First prompt\n- Second prompt\nThe response should be');
    });
});

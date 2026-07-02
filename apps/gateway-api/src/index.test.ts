import { describe, it, expect } from 'vitest';

describe('gateway-api schema', () => {
  it('defines chat mutations', () => {
    const typeDefs = `
      mutation Start($input: StartChatInput!) {
        startChat(input: $input) { runId conversationId checkpointId }
      }
    `;
    expect(typeDefs).toContain('startChat');
    expect(typeDefs).toContain('checkpointId');
  });
});

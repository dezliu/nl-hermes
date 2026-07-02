import { describe, it, expect, vi } from 'vitest';
import { OpenAiCompatibleClient } from './openai-compatible-client.js';

describe('OpenAiCompatibleClient.streamChat', () => {
  it('aggregates streamed deltas and invokes onDelta', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'data: {"choices":[{"delta":{"content":"{\\"sql\\":"}}]}\n\n' +
              'data: {"choices":[{"delta":{"content":"\\"SELECT 1\\"}"}}]}\n\n' +
              'data: [DONE]\n\n',
          ),
        );
        controller.close();
      },
    });

    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, body });
    const client = new OpenAiCompatibleClient({
      apiKey: 'sk-test',
      baseUrl: 'https://api.example.com/v1',
      model: 'test-model',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const deltas: string[] = [];
    const full = await client.streamChat(
      [{ role: 'user', content: 'hi' }],
      { onDelta: (chunk) => deltas.push(chunk) },
    );

    expect(full).toBe('{"sql":"SELECT 1"}');
    expect(deltas.join('')).toBe(full);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/v1/chat/completions',
      expect.objectContaining({
        body: expect.stringContaining('"stream":true'),
      }),
    );
  });
});

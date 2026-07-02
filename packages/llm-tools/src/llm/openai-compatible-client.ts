export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type OpenAiCompatibleClientOptions = {
  apiKey: string;
  baseUrl: string;
  model: string;
  fetchImpl?: typeof fetch;
};

export type ChatCompletionOptions = {
  temperature?: number;
  maxTokens?: number;
};

export type StreamChatOptions = ChatCompletionOptions & {
  onDelta: (chunk: string) => void;
};

type ChatCompletionResponse = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
};

type StreamChunkPayload = {
  choices?: { delta?: { content?: string } }[];
  error?: { message?: string };
};

export class OpenAiCompatibleClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly opts: OpenAiCompatibleClientOptions) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private completionsUrl(): string {
    return `${this.opts.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  }

  async chat(messages: ChatMessage[], options: ChatCompletionOptions = {}): Promise<string> {
    const res = await this.fetchImpl(this.completionsUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.opts.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.opts.model,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens,
      }),
    });

    const json = (await res.json()) as ChatCompletionResponse;
    if (!res.ok) {
      throw new Error(json.error?.message ?? `LLM HTTP ${res.status}`);
    }

    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error('LLM returned empty content');
    return content;
  }

  async streamChat(messages: ChatMessage[], options: StreamChatOptions): Promise<string> {
    const res = await this.fetchImpl(this.completionsUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.opts.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.opts.model,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens,
        stream: true,
      }),
    });

    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as ChatCompletionResponse;
      throw new Error(json.error?.message ?? `LLM HTTP ${res.status}`);
    }

    if (!res.body) {
      throw new Error('LLM stream body missing');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === '[DONE]') continue;

        let payload: StreamChunkPayload;
        try {
          payload = JSON.parse(data) as StreamChunkPayload;
        } catch {
          continue;
        }

        if (payload.error?.message) {
          throw new Error(payload.error.message);
        }

        const delta = payload.choices?.[0]?.delta?.content ?? '';
        if (delta) {
          full += delta;
          options.onDelta(delta);
        }
      }
    }

    if (!full) throw new Error('LLM returned empty stream content');
    return full;
  }
}

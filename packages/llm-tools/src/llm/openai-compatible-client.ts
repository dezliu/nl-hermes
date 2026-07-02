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

type ChatCompletionResponse = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
};

export class OpenAiCompatibleClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly opts: OpenAiCompatibleClientOptions) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async chat(messages: ChatMessage[], options: ChatCompletionOptions = {}): Promise<string> {
    const url = `${this.opts.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const res = await this.fetchImpl(url, {
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
}

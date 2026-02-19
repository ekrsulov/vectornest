export interface LlmAssistantProviderConfig {
  provider: 'openai' | 'openai-compatible';
  baseUrl: string;
  model: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
}

type LlmChatMessage = { role: 'system' | 'user'; content: string };

type LlmCallResult =
  | {
      ok: true;
      content: string;
      reasoningContent?: string;
      usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
      };
    }
  | { ok: false; error: string; isAbort?: boolean };

type OpenAiCompatibleErrorPayload = {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

const joinUrl = (baseUrl: string, path: string): string => {
  const trimmedBase = baseUrl.replace(/\/+$/, '');
  const trimmedPath = path.replace(/^\/+/, '');
  return `${trimmedBase}/${trimmedPath}`;
};

const isProbablyResponseFormatError = (message: string): boolean => {
  const lower = message.toLowerCase();
  return (
    lower.includes('response_format') ||
    lower.includes('response format') ||
    lower.includes('json_validate_failed') ||
    lower.includes('failed to validate json') ||
    lower.includes('validate json')
  );
};

const readErrorInfo = async (response: Response): Promise<{ message: string; code?: string }> => {
  try {
    const data = (await response.clone().json()) as OpenAiCompatibleErrorPayload;
    const message = data?.error?.message;
    const code = data?.error?.code;
    if (typeof message === 'string' && message.trim().length > 0) {
      return { message: message.trim(), code: typeof code === 'string' ? code : undefined };
    }
  } catch {
    // fall back to text
  }

  const text = await response.text().catch(() => '');
  return { message: text || `Request failed (${response.status}).` };
};

export async function callLlmChatCompletion(
  config: LlmAssistantProviderConfig,
  messages: LlmChatMessage[],
  signal?: AbortSignal,
  options?: { responseFormat?: 'json_object' }
): Promise<LlmCallResult> {
  if (!config.apiKey?.trim()) {
    return { ok: false, error: 'Missing API key.' };
  }
  if (!config.model?.trim()) {
    return { ok: false, error: 'Missing model.' };
  }
  if (!config.baseUrl?.trim()) {
    return { ok: false, error: 'Missing baseUrl.' };
  }

  const url = joinUrl(config.baseUrl, 'chat/completions');
  const supportsResponseFormat =
    options?.responseFormat === 'json_object' &&
    config.provider === 'openai' &&
    config.baseUrl.trim().toLowerCase().includes('api.openai.com');

  const request = (args: { useResponseFormat: boolean; temperature?: number }) => ({
    model: config.model,
    messages,
    temperature: args.temperature ?? config.temperature,
    max_tokens: config.maxTokens,
    ...(args.useResponseFormat ? { response_format: { type: 'json_object' } } : {}),
  });

  const doFetch = async (args: { useResponseFormat: boolean; temperature?: number }): Promise<Response> => {
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(request(args)),
      signal,
    });
  };

  try {
    let response = await doFetch({ useResponseFormat: supportsResponseFormat });

    if (!response.ok) {
      const errorInfo = await readErrorInfo(response);
      if (supportsResponseFormat && response.status === 400 && isProbablyResponseFormatError(errorInfo.message)) {
        // Some OpenAI-compatible providers validate JSON when response_format is set.
        // Retry without response_format so we can parse JSON ourselves.
        response = await doFetch({ useResponseFormat: false });
      } else {
        return {
          ok: false,
          error: errorInfo.message ? `LLM request failed (${response.status}): ${errorInfo.message}` : `LLM request failed (${response.status}).`,
        };
      }
    }

    if (!response.ok) {
      const errorInfo = await readErrorInfo(response);
      return {
        ok: false,
        error: errorInfo.message ? `LLM request failed (${response.status}): ${errorInfo.message}` : `LLM request failed (${response.status}).`,
      };
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
      error?: { message?: string };
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    const message = json.choices?.[0]?.message;
    const content = message?.content;
    const reasoningContent = message?.reasoning_content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      const errorMessage = json.error?.message;
      return { ok: false, error: errorMessage ? String(errorMessage) : 'Empty LLM response.' };
    }

    const usage = json.usage
      ? {
          promptTokens: json.usage.prompt_tokens,
          completionTokens: json.usage.completion_tokens,
          totalTokens: json.usage.total_tokens,
        }
      : undefined;

    return { ok: true, content, reasoningContent, usage };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { ok: false, error: 'Request cancelled.', isAbort: true };
    }
    return { ok: false, error: 'Network error while calling the LLM.' };
  }
}

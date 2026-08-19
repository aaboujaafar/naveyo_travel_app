type ChatMessage = { role: 'system' | 'user'; content: string }

type ChatOptions = {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  timeoutMs: number
}

const provider = (Deno.env.get('AI_PROVIDER') ?? 'openai').toLowerCase()
const endpoint = Deno.env.get('AI_BASE_URL') ?? (
  provider === 'ollama'
    ? 'http://127.0.0.1:11434/v1/chat/completions'
    : provider === 'opencode'
      ? 'https://opencode.ai/zen/go/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions'
)

/** Calls an OpenAI-compatible provider. Ollama and OpenAI use the same wire format. */
export async function completeChat(options: ChatOptions): Promise<Response> {
  const keyName = provider === 'ollama' ? 'OLLAMA_API_KEY' : provider === 'opencode' ? 'OPENCODE_GO_API_KEY' : 'OPENAI_API_KEY'
  const apiKey = Deno.env.get(keyName)
  if (provider !== 'ollama' && !apiKey) throw new Error('ai_provider_unavailable')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs)
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: options.model ?? Deno.env.get('AI_MODEL') ?? (
          provider === 'ollama' ? 'llama3.2' : provider === 'opencode' ? 'deepseek-v4-pro' : 'gpt-4o-mini'
        ),
        temperature: options.temperature ?? 0,
        messages: options.messages,
      }),
    })
    return response
  } finally {
    clearTimeout(timeout)
  }
}

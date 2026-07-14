export type AiProviderId = "mock" | "deepseek" | "groq" | "huggingface";

export interface AiCompletionRequest {
  feature: string;
  system: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AiCompletionResult {
  provider: AiProviderId;
  model: string;
  text: string;
}

interface ChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

const defaultRequestTimeoutMs = 15_000;

export async function completeAiText(request: AiCompletionRequest): Promise<AiCompletionResult> {
  const provider = providerId();

  if (provider === "deepseek") {
    return completeWithOpenAiCompatibleApi({
      provider,
      model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
      url: "https://api.deepseek.com/chat/completions",
      apiKey: process.env.DEEPSEEK_API_KEY,
      request
    });
  }

  if (provider === "groq") {
    return completeWithOpenAiCompatibleApi({
      provider,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      url: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: process.env.GROQ_API_KEY,
      request
    });
  }

  if (provider === "huggingface") {
    return completeWithOpenAiCompatibleApi({
      provider,
      model: process.env.HUGGINGFACE_MODEL || "openai/gpt-oss-20b",
      url: "https://router.huggingface.co/v1/chat/completions",
      apiKey: process.env.HUGGINGFACE_API_KEY,
      request
    });
  }

  return {
    provider: "mock",
    model: "local-product-helper",
    text: mockCompletion(request)
  };
}

function providerId(): AiProviderId {
  if (process.env.AI_PROVIDER === "deepseek" && process.env.DEEPSEEK_API_KEY) return "deepseek";
  if (process.env.AI_PROVIDER === "groq" && process.env.GROQ_API_KEY) return "groq";
  if (process.env.AI_PROVIDER === "huggingface" && process.env.HUGGINGFACE_API_KEY) return "huggingface";
  return "mock";
}

async function completeWithOpenAiCompatibleApi(options: {
  provider: AiProviderId;
  model: string;
  url: string;
  apiKey?: string;
  request: AiCompletionRequest;
}): Promise<AiCompletionResult> {
  if (!options.apiKey) {
    return {
      provider: "mock",
      model: "local-product-helper",
      text: mockCompletion(options.request)
    };
  }

  const controller = new AbortController();
  const timeoutMs = configuredTimeoutMs();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(options.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${options.apiKey}`
      },
      body: JSON.stringify({
        model: options.model,
        temperature: options.request.temperature ?? 0.3,
        max_tokens: options.request.maxTokens ?? 700,
        messages: [
          { role: "system", content: options.request.system },
          { role: "user", content: options.request.prompt }
        ]
      }),
      signal: controller.signal
    });
  } catch {
    throw new Error(`AI provider ${options.provider} request failed or timed out.`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`AI provider ${options.provider} returned ${response.status}`);
  }

  const payload = (await response.json()) as ChatResponse;
  return {
    provider: options.provider,
    model: options.model,
    text: payload.choices?.[0]?.message?.content?.trim() || "No recommendation returned."
  };
}

function configuredTimeoutMs() {
  const configured = Number(process.env.AI_REQUEST_TIMEOUT_MS ?? defaultRequestTimeoutMs);
  return Number.isFinite(configured) ? Math.min(Math.max(configured, 1_000), 60_000) : defaultRequestTimeoutMs;
}

function mockCompletion(request: AiCompletionRequest) {
  if (request.feature === "pricing") {
    return [
      "Estimated market range: 8-12% below the clean retail benchmark.",
      "Confidence: medium, because exact sold-comparable data is not connected yet.",
      "Suggested action: start with a fair fixed price and allow offers for the first 72 hours."
    ].join("\n");
  }

  if (request.feature === "listing") {
    return [
      "Recommended title: include brand, model, condition, and the strongest included accessory.",
      "Description gaps: add proof of ownership, condition notes, tested date, and shipping constraints.",
      "Trust step: upload serial or authenticity proof to the private verification field before publishing."
    ].join("\n");
  }

  return "Recommendation prepared. Connect a provider key to replace this local fallback with model output.";
}

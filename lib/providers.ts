export type ProviderPreset = {
  id: string;
  name: string;
  baseUrl: string;
  docsUrl?: string;
  suggestedModels: string[];
  visionModels?: string[];
  imageModels?: string[];
  keyPrefix?: string;
};

export const PROVIDERS: ProviderPreset[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    docsUrl: "https://api-docs.deepseek.com/",
    suggestedModels: ["deepseek-chat", "deepseek-reasoner"],
    keyPrefix: "sk-",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    docsUrl: "https://openrouter.ai/docs",
    suggestedModels: [
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "anthropic/claude-3.5-sonnet",
      "anthropic/claude-3-opus",
      "google/gemini-2.0-flash-exp",
      "meta-llama/llama-3.3-70b-instruct",
      "deepseek/deepseek-chat",
      "deepseek/deepseek-r1",
      "x-ai/grok-2-vision",
    ],
    visionModels: [
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "anthropic/claude-3.5-sonnet",
      "anthropic/claude-3-opus",
      "google/gemini-2.0-flash-exp",
      "x-ai/grok-2-vision",
    ],
    imageModels: ["openai/dall-e-3", "black-forest-labs/flux-1.1-pro"],
    keyPrefix: "sk-or-",
  },
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    docsUrl: "https://platform.openai.com/docs",
    suggestedModels: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-mini"],
    visionModels: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
    imageModels: ["dall-e-3", "dall-e-2"],
    keyPrefix: "sk-",
  },
  {
    id: "custom",
    name: "Custom (OpenAI-compatible)",
    baseUrl: "",
    suggestedModels: [],
  },
];

export function getProvider(id: string): ProviderPreset | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

// Heuristic: does this model likely accept image inputs?
export function isVisionModel(providerId: string, model: string): boolean {
  const provider = getProvider(providerId);
  if (provider?.visionModels?.some((m) => model.startsWith(m))) return true;
  const lowered = model.toLowerCase();
  return (
    lowered.includes("vision") ||
    lowered.includes("gpt-4o") ||
    lowered.includes("claude-3") ||
    lowered.includes("gemini") ||
    lowered.includes("grok-2") ||
    lowered.includes("llava") ||
    lowered.includes("pixtral")
  );
}

// Heuristic: is this an image-generation model?
export function isImageGenModel(providerId: string, model: string): boolean {
  const provider = getProvider(providerId);
  if (provider?.imageModels?.some((m) => model.startsWith(m))) return true;
  const lowered = model.toLowerCase();
  return (
    lowered.includes("dall-e") ||
    lowered.includes("flux") ||
    lowered.includes("stable-diffusion") ||
    lowered.includes("sdxl")
  );
}

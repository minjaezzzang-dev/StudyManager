import OpenAI from 'openai';
import type { EnvConfig } from '@dahamkee/shared/env';
import { applyHumanLikeToMessages, scrubAiSlop } from './humanLikePolicy';
import { quantizePromptText } from './promptQuantize';

const NIM_DEFAULT_BASE = 'https://integrate.api.nvidia.com/v1';
const NIM_DEFAULT_MODEL = 'meta/llama-3.1-8b-instruct';

export function usesNim(env: EnvConfig): boolean {
  return Boolean(env.NVIDIA_API_KEY && env.NVIDIA_API_KEY.trim());
}

export function isDemoLlm(env: EnvConfig): boolean {
  if (usesNim(env)) return false;
  const key = env.OPENAI_API_KEY || '';
  return (
    !key ||
    key.includes('test') ||
    key.includes('do-not-use') ||
    key.startsWith('sk-test')
  );
}

export function createLlmClient(env: EnvConfig): OpenAI {
  if (usesNim(env)) {
    return new OpenAI({
      apiKey: env.NVIDIA_API_KEY,
      baseURL: env.NVIDIA_API_BASE_URL || NIM_DEFAULT_BASE,
    });
  }
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

export function resolveChatModel(
  env: EnvConfig,
  tier: 'easy' | 'medium' | 'hard' = 'easy'
): string {
  if (usesNim(env)) {
    if (tier === 'hard') return env.NIM_MODEL_HARD || env.NIM_MODEL || NIM_DEFAULT_MODEL;
    if (tier === 'medium') return env.NIM_MODEL_MEDIUM || env.NIM_MODEL || NIM_DEFAULT_MODEL;
    return env.NIM_MODEL_EASY || env.NIM_MODEL || NIM_DEFAULT_MODEL;
  }
  if (tier === 'hard') return env.OPENAI_MODEL_HARD;
  if (tier === 'medium') return env.OPENAI_MODEL_MEDIUM;
  return env.OPENAI_MODEL_EASY;
}

export function supportsJsonObjectResponse(env: EnvConfig): boolean {
  // Many NIM chat models reject OpenAI-style response_format
  return !usesNim(env);
}

/** GPT-5 / o-series use max_completion_tokens instead of max_tokens */
export function usesMaxCompletionTokens(model: string): boolean {
  return /^(gpt-5|o[0-9]|chatgpt-)/i.test(model);
}

export function chatTokenLimit(model: string, maxTokens: number): Record<string, number> {
  if (usesMaxCompletionTokens(model)) {
    return { max_completion_tokens: maxTokens };
  }
  return { max_tokens: maxTokens };
}

/** GPT-5 / o-series only support default temperature (omit param). */
export function chatTemperature(model: string, temperature: number): Record<string, number> {
  if (usesMaxCompletionTokens(model)) return {};
  return { temperature };
}

/** GPT-5 reasoning models need headroom beyond visible reply length. */
export function effectiveMaxTokens(model: string, requested: number): number {
  if (!usesMaxCompletionTokens(model)) return requested;
  return Math.max(requested, 1024);
}

export async function chatCompletion(
  env: EnvConfig,
  input: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    tier?: 'easy' | 'medium' | 'hard';
    temperature?: number;
    maxTokens?: number;
    demoPrefix?: string;
    /** Default true — inject HUMAN-LIKE OUTPUT POLICY into system messages */
    humanLike?: boolean;
    /** Default true — strip common AI-slop phrases from the reply */
    scrubSlop?: boolean;
  }
): Promise<string> {
  if (isDemoLlm(env)) {
    const lastUser = [...input.messages].reverse().find((m) => m.role === 'user');
    const prefix = input.demoPrefix || '[demo]';
    return `${prefix} ${lastUser?.content || 'OK'}`;
  }

  const humanLike = input.humanLike !== false;
  const scrub = input.scrubSlop !== false;
  const prepared = humanLike
    ? applyHumanLikeToMessages(input.messages)
    : input.messages.map((m) => ({ ...m }));

  const messages = prepared.map((m) => ({
    ...m,
    content: quantizePromptText(
      m.content,
      m.role === 'user' ? 3200 : m.role === 'system' ? 2200 : 1200
    ),
  }));

  const client = createLlmClient(env);
  const model = resolveChatModel(env, input.tier || 'medium');
  const completion = await client.chat.completions.create({
    model,
    messages,
    ...chatTemperature(model, input.temperature ?? 0.7),
    ...chatTokenLimit(model, effectiveMaxTokens(model, input.maxTokens ?? 1500)),
  });
  const raw = completion.choices[0]?.message?.content?.trim() || '';
  return scrub ? scrubAiSlop(raw) : raw;
}

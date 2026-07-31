import type { EnvConfig } from '@dahamkee/shared/env';
import {
  chatCompletion,
  createLlmClient,
  isDemoLlm,
  resolveChatModel,
  supportsJsonObjectResponse,
  chatTokenLimit,
  chatTemperature,
  effectiveMaxTokens,
} from './llm';

const LANGUAGE_NAMES: Record<string, string> = {
  ko: 'Korean',
  en: 'English',
  zh: 'Chinese (Simplified)',
  vi: 'Vietnamese',
  ja: 'Japanese',
  th: 'Thai',
  uz: 'Uzbek',
  mn: 'Mongolian',
  ne: 'Nepali',
  my: 'Burmese',
  km: 'Khmer',
  tl: 'Tagalog',
  auto: 'auto-detect',
};

export async function translateTextContent(
  env: EnvConfig,
  input: { text: string; sourceLanguage: string; targetLanguage: string }
): Promise<string> {
  if (input.sourceLanguage === input.targetLanguage) {
    return input.text;
  }

  if (isDemoLlm(env)) {
    return `[${input.targetLanguage}] ${input.text}`;
  }

  const sourceLang = LANGUAGE_NAMES[input.sourceLanguage] || input.sourceLanguage;
  const targetLang = LANGUAGE_NAMES[input.targetLanguage] || input.targetLanguage;

  return chatCompletion(env, {
    tier: input.text.length > 1000 ? 'hard' : 'easy',
    temperature: 0.3,
    maxTokens: 2000,
    scrubSlop: false,
    humanLike: false,
    messages: [
      {
        role: 'system',
        content: `Professional translator. Translate from ${sourceLang} to ${targetLang}.
Keep tone. Return ONLY the translated text — no preface, no notes.`,
      },
      { role: 'user', content: input.text },
    ],
  });
}

export async function translateNoticeContent(
  env: EnvConfig,
  input: { title: string; content: string; targetLanguage: string }
): Promise<{ title: string; content: string }> {
  if (isDemoLlm(env)) {
    return {
      title: `[${input.targetLanguage}] ${input.title}`,
      content: `[${input.targetLanguage}] ${input.content}`,
    };
  }

  const langName = LANGUAGE_NAMES[input.targetLanguage] || input.targetLanguage;
  const system = `Translate the notice title and content to ${langName}.
Formal school-announcement tone.
Return ONLY a JSON object with "title" and "content". No markdown.`;
  const user = `Title: ${input.title}\n\nContent: ${input.content}`;

  if (!supportsJsonObjectResponse(env)) {
    const raw = await chatCompletion(env, {
      tier: 'medium',
      temperature: 0.3,
      maxTokens: 2000,
      scrubSlop: false,
      humanLike: false,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    return parseNoticeJson(raw, input);
  }

  const openai = createLlmClient(env);
  const model = resolveChatModel(env, 'medium');
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    ...chatTemperature(model, 0.3),
    ...chatTokenLimit(model, effectiveMaxTokens(model, 2000)),
    response_format: { type: 'json_object' as const },
  });

  return parseNoticeJson(completion.choices[0]?.message?.content?.trim() || '{}', input);
}

function parseNoticeJson(
  raw: string,
  fallback: { title: string; content: string }
): { title: string; content: string } {
  const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let parsed: { title?: string; content?: string } = {};
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    parsed = {};
  }
  return {
    title: parsed.title?.trim() || fallback.title,
    content: parsed.content?.trim() || fallback.content,
  };
}

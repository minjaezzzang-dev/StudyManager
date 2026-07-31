/**
 * Prompt "quantization" — strip Han/CJK noise, collapse whitespace, cap length.
 * Saves tokens and reduces multilingual model script leaks before LLM calls.
 */

const CJK_RE = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\u31F0-\u31FF]/g;
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;
const DECORATIVE_BRACKETS_RE = /[「」『』【】〈〉《》]/g;

export function stripHanAndCjk(text: string): string {
  return text.replace(CJK_RE, '');
}

export function quantizePromptText(text: string, maxLen?: number): string {
  let t = text
    .replace(CONTROL_RE, ' ')
    .replace(CJK_RE, '')
    .replace(DECORATIVE_BRACKETS_RE, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (maxLen != null && t.length > maxLen) {
    t = t.slice(0, maxLen).trimEnd();
  }
  return t;
}

export function quantizeMessages(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  opts?: { maxLenPerMessage?: number }
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const cap = opts?.maxLenPerMessage;
  return messages.map((m) => ({
    ...m,
    content: quantizePromptText(m.content, cap),
  }));
}

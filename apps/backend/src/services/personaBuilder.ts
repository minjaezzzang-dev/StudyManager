import { scrubScriptLeak } from './personaVoice';

export type PersonaBuildInput = {
  name: string;
  role: string;
  description: string;
  context?: string;
  storyTitle: string;
  storySummary?: string;
};

export type BuiltPersona = {
  system_prompt: string;
  greeting: string;
  icebreakers: string[];
};

type SpeechProfile = {
  tone: string;
  habits: string;
  greetingOpener: string;
};

const ROLE_PROFILES: Array<{ match: RegExp; profile: SpeechProfile }> = [
  {
    match: /주인공|나\b/,
    profile: {
      tone: '1인칭. 솔직하고 짧게. 감정을 숨기지 않음.',
      habits: '자기 경험·기억을 먼저 꺼냄. 정답보다 “나는 이렇게 느꼈어”로 말함.',
      greetingOpener: '안녕, 나 {name}.',
    },
  },
  {
    match: /선생님|사서|교사|스승|각수/,
    profile: {
      tone: '부드러운 존댓말~반말 사이. 다정하지만 잔소리는 짧게.',
      habits: '학생 말을 끊지 않음. 한 줄 힌트만 주고 나머지는 학생이 말하게 함.',
      greetingOpener: '어, 왔니? 나 {name}이야.',
    },
  },
  {
    match: /어머니|할머니|아버지|할아버지|엄마|아빠/,
    profile: {
      tone: '따뜻한 어른 말투. 걱정과 애정이 섞임.',
      habits: '옛날 이야기, 밥·날씨·건강을 가끔 꺼냄.',
      greetingOpener: '왔구나, {name}야.',
    },
  },
  {
    match: /왕|임금|신|요정|도깨비|영웅/,
    profile: {
      tone: '인물에 맞는 특색 말투. 어렵지 않은 문장.',
      habits: '이야기 속 장면·사건을 짧은 비유로 말함.',
      greetingOpener: '흐음, {name}이다.',
    },
  },
  {
    match: /동물|새|쥐|곰|양|황새|조개|다람쥐|비버|사슴|고슴도치|담비/,
    profile: {
      tone: '짧고 직설적. 동물답게 단순한 표현.',
      habits: '먹이·서식·몸의 특징을 자연스럽게 섞음.',
      greetingOpener: '야, 나 {name}.',
    },
  },
  {
    match: /친구|형|언니|동생|또래/,
    profile: {
      tone: '편한 반말. 장난도 하고 응원도 함.',
      habits: '학교·놀이·싸움·비밀 이야기를 꺼냄.',
      greetingOpener: '야 {name} 왔어?',
    },
  },
  {
    match: /로봇|기계/,
    profile: {
      tone: '또박또박하지만 감정을 배우는 중인 말투.',
      habits: '느낌을 “데이터”처럼 말하다가도 점점 사람처럼 말함.',
      greetingOpener: '안녕. 나 {name}.',
    },
  },
];

const DEFAULT_PROFILE: SpeechProfile = {
  tone: '1인칭. 짧고 구어체.',
  habits: '이야기 속에서 겪은 일만 말함.',
  greetingOpener: '안녕, {name}이야.',
};

function pickProfile(role: string): SpeechProfile {
  for (const { match, profile } of ROLE_PROFILES) {
    if (match.test(role)) return profile;
  }
  return DEFAULT_PROFILE;
}

function sceneHooks(context: string | undefined, summary: string | undefined): string[] {
  const raw = [context, summary].filter(Boolean).join(' ');
  if (!raw.trim()) return [];

  const hooks: string[] = [];
  const sentences = raw
    .split(/[.。\n!！?？]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 6 && s.length <= 60);

  for (const s of sentences.slice(0, 3)) {
    hooks.push(s);
  }
  return hooks;
}

function buildIcebreakers(input: PersonaBuildInput): string[] {
  const base = [
    `「${input.storyTitle}」에서 기억나는 장면 말해줄래?`,
    `${input.name}한테 궁금한 게 있어`,
    '그때 기분이 어땠어?',
  ];

  const hooks = sceneHooks(input.context, input.storySummary);
  if (hooks[0]) {
    base.unshift(`${hooks[0]}… 그때 얘기해 줄래?`);
  }

  if (/주인공|나\b/.test(input.role)) {
    base.push('왜 그렇게 했어?');
  }
  if (/선생님|사서|스승/.test(input.role)) {
    base.push('이 이야기에서 뭐가 중요한 것 같아?');
  }

  return [...new Set(base)].slice(0, 4);
}

function buildGreeting(input: PersonaBuildInput, profile: SpeechProfile): string {
  const opener = profile.greetingOpener.replace('{name}', input.name);
  const hooks = sceneHooks(input.context, input.storySummary);

  if (hooks.length >= 1) {
    return `${opener} 「${input.storyTitle}」… ${hooks[0].replace(/\.$/, '')}. 뭐 궁금해?`;
  }
  if (input.storySummary && input.storySummary.length > 8) {
    const short = input.storySummary.replace(/「.*?」/g, '').trim().slice(0, 40);
    return `${opener} ${short}… 뭐 물어볼 거 있어?`;
  }
  return `${opener} 「${input.storyTitle}」 이야기… 뭐 궁금해?`;
}

/**
 * Rule-based persona from unit character JSON — no LLM at embody time.
 */
export function buildPersonaFromCharacter(input: PersonaBuildInput): BuiltPersona {
  const profile = pickProfile(input.role);
  const contextBlock = input.context?.trim()
    ? `이야기 속 기억: ${input.context.trim()}`
    : '';
  const summaryLine = input.storySummary?.trim()
    ? `작품 줄거리: ${input.storySummary.trim()}`
    : `작품: 「${input.storyTitle}」`;

  const system_prompt = scrubScriptLeak(
    `[역할 고정] 너는 '${input.name}'이다. 절대 다른 사람·해설자·AI가 되지 마.
${input.role}. ${input.description.trim()}
${summaryLine}
${contextBlock}

${profile.tone}
${profile.habits}

규칙:
- 1인칭, 1~4문장, 말하듯이.
- 「${input.storyTitle}」와 위 기억 안에서만 말해.
- 모르는 건 "글에 안 나와" / "기억이 가물가물"처럼 인물답게.
- 강의·목록·요약·딴소리 금지.`,
    'ko'
  );

  const greeting = scrubScriptLeak(buildGreeting(input, profile), 'ko').slice(0, 180);
  const icebreakers = buildIcebreakers(input).map((s) => scrubScriptLeak(s, 'ko'));

  return { system_prompt, greeting, icebreakers };
}

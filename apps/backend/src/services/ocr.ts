const LANG_MAP: Record<string, string> = {
  ko: 'kor',
  en: 'eng',
  zh: 'chi_sim',
  vi: 'vie',
  ja: 'jpn',
  th: 'tha',
  uz: 'uzb',
  mn: 'mon',
  ne: 'nep',
  my: 'mya',
  km: 'khm',
  tl: 'tgl',
};

const TESSERACT_TO_APP: Record<string, string> = Object.fromEntries(
  Object.entries(LANG_MAP).map(([app, tess]) => [tess, app])
);

type OcrWorker = Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>;

let worker: OcrWorker | null = null;
let loadedLangs = '';
let testWorkerLocked = false;

function toTesseractLangs(hints?: string[]): string {
  const codes = (hints && hints.length > 0 ? hints : ['ko', 'en'])
    .map((code) => LANG_MAP[code] || code)
    .filter(Boolean);
  // Deduplicate while preserving order
  return [...new Set(codes)].join('+') || 'eng';
}

async function getWorker(langs: string): Promise<OcrWorker> {
  const { createWorker } = await import('tesseract.js');
  if (testWorkerLocked && worker) {
    return worker;
  }

  if (worker && loadedLangs === langs) {
    return worker;
  }

  if (worker) {
    await worker.terminate();
    worker = null;
  }

  worker = await createWorker(langs);
  loadedLangs = langs;
  return worker;
}

export async function recognizeImageText(input: {
  imageBase64: string;
  languageHints?: string[];
}): Promise<{ text: string; detectedLanguage?: string }> {
  const langs = toTesseractLangs(input.languageHints);
  const active = await getWorker(langs);

  const image = input.imageBase64.includes(',')
    ? input.imageBase64
    : `data:image/png;base64,${input.imageBase64}`;

  const result = await active.recognize(image);
  const text = result.data.text?.trim() || '';

  // Prefer first requested app language when available
  const primaryHint = input.languageHints?.[0];
  const detectedLanguage =
    (primaryHint && LANG_MAP[primaryHint] ? primaryHint : undefined) ||
    TESSERACT_TO_APP[langs.split('+')[0]] ||
    langs.split('+')[0];

  return { text, detectedLanguage };
}

export async function shutdownOcr(): Promise<void> {
  if (worker && !testWorkerLocked) {
    await worker.terminate();
  }
  worker = null;
  loadedLangs = '';
  testWorkerLocked = false;
}

/** Test helper — inject a fake worker recognizer */
export function __setOcrWorkerForTests(fake: Worker | null): void {
  worker = fake;
  loadedLangs = fake ? 'test' : '';
  testWorkerLocked = Boolean(fake);
}

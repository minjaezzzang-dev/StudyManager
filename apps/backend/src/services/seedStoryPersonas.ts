import { createHash } from 'crypto';
import { TEXTBOOK_CATALOG } from './textbookRag';
import {
  listAllUnitCharacterFiles,
  loadUnitCharacterFile,
} from './unitCharacterStore';
import { buildPersonaFromCharacter } from './personaBuilder';
import { getDb } from '../db/sqlite';

function slugToTextbookId(slug: string): string | null {
  return TEXTBOOK_CATALOG.find((t) => t.slug === slug)?.id ?? null;
}

function seedPersonaId(slug: string, unitId: string, storyTitle: string, name: string): string {
  const raw = `seed|${slug}|${unitId}|${storyTitle}|${name}`;
  const hex = createHash('sha256').update(raw).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function seedEmbodyKey(slug: string, unitId: string, storyTitle: string, name: string): string {
  return createHash('sha256')
    .update(['seed', slug, unitId, storyTitle, name].join('|'))
    .digest('hex')
    .slice(0, 40);
}

/** Shared story personas from unit_characters JSON — rule-based, no LLM. */
export function seedStoryPersonasFromUnitFiles(): number {
  let count = 0;
  for (const { slug, unitId } of listAllUnitCharacterFiles()) {
    const textbookId = slugToTextbookId(slug);
    if (!textbookId) continue;

    const file = loadUnitCharacterFile(textbookId, unitId);
    if (!file) continue;
    if (!file.stories?.length && !file.customCharacters?.length) continue;

    for (const story of file.stories || []) {
      for (const c of story.characters || []) {
        upsertCharacter(textbookId, unitId, slug, story.title, story.summary, c);
        count += 1;
      }
    }

    for (const c of file.customCharacters || []) {
      const storyTitle = c.story?.trim() || '단원 이야기 친구';
      upsertCharacter(textbookId, unitId, slug, storyTitle, undefined, c);
      count += 1;
    }
  }

  if (count > 0) {
    console.info(`[seedStoryPersonas] upserted ${count} story personas`);
  }
  return count;
}

function upsertCharacter(
  textbookId: string,
  unitId: string,
  slug: string,
  storyTitle: string,
  storySummary: string | undefined,
  c: { name: string; role?: string; description?: string; avatar_emoji?: string; context?: string }
): void {
  const db = getDb();
  const now = new Date().toISOString();
  const upsert = db.prepare(
    `INSERT INTO personas (
       id, name, description, system_prompt, language, avatar_emoji,
       is_active, created_at, updated_at, owner_user_id, greeting, embody_key,
       unit_id, story_title, icebreakers_json
     ) VALUES (?, ?, ?, ?, 'ko', ?, 1, ?, ?, NULL, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name=excluded.name,
       description=excluded.description,
       system_prompt=excluded.system_prompt,
       avatar_emoji=excluded.avatar_emoji,
       greeting=excluded.greeting,
       unit_id=excluded.unit_id,
       story_title=excluded.story_title,
       icebreakers_json=excluded.icebreakers_json,
       is_active=1,
       updated_at=excluded.updated_at`
  );

  const built = buildPersonaFromCharacter({
    name: c.name,
    role: c.role || '등장인물',
    description: c.description || '',
    context: c.context,
    storyTitle,
    storySummary,
  });

  const id = seedPersonaId(slug, unitId, storyTitle, c.name);
  const description = `${storyTitle} · ${c.role || '등장인물'} — ${c.description || ''}`.slice(0, 200);

  upsert.run(
    id,
    c.name.slice(0, 100),
    description,
    built.system_prompt,
    (c.avatar_emoji || '🙂').slice(0, 8),
    now,
    now,
    built.greeting,
    seedEmbodyKey(slug, unitId, storyTitle, c.name),
    unitId,
    storyTitle.slice(0, 120),
    JSON.stringify(built.icebreakers)
  );
}

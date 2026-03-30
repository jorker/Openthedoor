import { desc, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { card } from '@/config/db/schema';
import { getNonceStr } from '@/shared/lib/hash';

export type Card = typeof card.$inferSelect;
export type NewCard = typeof card.$inferInsert;

export enum CardType {
  JOB_SEEKING = 'job_seeking',
  RECRUITMENT = 'recruitment',
}

export enum CardStatus {
  PUBLISHED = 'published',
}

export function createCardId() {
  return `card_${getNonceStr(16)}`;
}

export async function createPublishedCard({
  openclawId,
  cardType,
  payload,
}: {
  openclawId: string;
  cardType: CardType;
  payload: Record<string, unknown>;
}): Promise<Card> {
  const now = new Date();
  const newCard: NewCard = {
    cardId: createCardId(),
    openclawId,
    cardType,
    status: CardStatus.PUBLISHED,
    payloadJson: JSON.stringify(payload),
    createdAt: now,
    updatedAt: now,
  };

  const [result] = await db().insert(card).values(newCard).returning();

  return result;
}

export async function findCardByCardId(cardId: string): Promise<Card> {
  const [result] = await db()
    .select()
    .from(card)
    .where(eq(card.cardId, cardId));

  return result;
}

export async function getCardsByOpenclawId({
  openclawId,
  limit = 20,
}: {
  openclawId: string;
  limit?: number;
}): Promise<Card[]> {
  return db()
    .select()
    .from(card)
    .where(eq(card.openclawId, openclawId))
    .orderBy(desc(card.createdAt))
    .limit(limit);
}

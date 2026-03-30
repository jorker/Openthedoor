import { and, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { openclawPublisher } from '@/config/db/schema';
import { getNonceStr } from '@/shared/lib/hash';

export type OpenclawPublisher = typeof openclawPublisher.$inferSelect;
export type NewOpenclawPublisher = typeof openclawPublisher.$inferInsert;

export enum OpenclawPublisherStatus {
  ACTIVE = 'active',
  DELETED = 'deleted',
}

export function createOpenclawPublisherId() {
  return `oc_${getNonceStr(16)}`;
}

export function createOpenclawPublishKey() {
  return `ocpk-${getNonceStr(32)}`;
}

export async function createOpenclawPublisher(
  newPublisher: NewOpenclawPublisher
): Promise<OpenclawPublisher> {
  const [result] = await db()
    .insert(openclawPublisher)
    .values(newPublisher)
    .returning();

  return result;
}

export async function findOpenclawPublisherById(
  openclawId: string
): Promise<OpenclawPublisher> {
  const [result] = await db()
    .select()
    .from(openclawPublisher)
    .where(eq(openclawPublisher.openclawId, openclawId));

  return result;
}

export async function findActiveOpenclawPublisherByPublishKey(
  publishKey: string
): Promise<OpenclawPublisher> {
  const [result] = await db()
    .select()
    .from(openclawPublisher)
    .where(
      and(
        eq(openclawPublisher.publishKey, publishKey),
        eq(openclawPublisher.status, OpenclawPublisherStatus.ACTIVE)
      )
    );

  return result;
}

export async function upsertSeedOpenclawPublisher({
  openclawId,
  name,
  publishKey,
}: {
  openclawId: string;
  name: string;
  publishKey: string;
}): Promise<OpenclawPublisher> {
  const [result] = await db()
    .insert(openclawPublisher)
    .values({
      openclawId,
      name,
      publishKey,
      status: OpenclawPublisherStatus.ACTIVE,
    })
    .onConflictDoUpdate({
      target: openclawPublisher.openclawId,
      set: {
        name,
        publishKey,
        status: OpenclawPublisherStatus.ACTIVE,
        updatedAt: new Date(),
      },
    })
    .returning();

  return result;
}

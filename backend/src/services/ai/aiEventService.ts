import models from '../../models';
import { Op } from 'sequelize';
import { getRedisClient } from '../redisClient';

export type AiEventSource = 'email' | 'whatsapp' | 'agenda' | 'manual';

export interface CreateAiEventInput {
  userId: string;
  source: AiEventSource;
  clientRef?: string;
  subject?: string;
  summary?: string;
  intent?: string;
  occurrenceCount?: number;
  metadata?: any;
  occurredAt?: Date | string;
}

export interface AiContextQuery {
  userId: string;
  clientRef?: string;
  source?: AiEventSource;
  windowDays?: number;
  limit?: number;
}

export async function createAiEvent(input: CreateAiEventInput) {
  const {
    userId,
    source,
    clientRef,
    subject,
    summary,
    intent,
    occurrenceCount,
    metadata,
    occurredAt,
  } = input;

  const event = await (models as any).AiEvent.create({
    user_id: userId,
    source,
    client_ref: clientRef,
    subject,
    summary,
    intent,
    occurrence_count: occurrenceCount || 1,
    metadata,
    occurred_at: occurredAt || new Date(),
  });

  const redis = await getRedisClient();
  const refKey = clientRef || 'global';
  const intentKey = `ai:intent:${userId}:${refKey}`;
  const sourceKey = `ai:source:${userId}:${refKey}`;

  if (redis) {
    try {
      if (intent) {
        await redis.hIncrBy(intentKey, intent, occurrenceCount || 1);
      }
      if (source) {
        await redis.hIncrBy(sourceKey, source, occurrenceCount || 1);
      }
      // TTL opcional para evitar crescimento infinito; 90 dias
      const ttlSeconds = 60 * 60 * 24 * 90;
      await redis.expire(intentKey, ttlSeconds);
      await redis.expire(sourceKey, ttlSeconds);
    } catch (err) {
      console.error('[AI] Redis increment failed', err);
    }
  }

  return event;
}

export async function getAiContext(query: AiContextQuery) {
  const { userId, clientRef, source, windowDays = 30, limit = 50 } = query;
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - windowDays);

  const where: any = { user_id: userId, occurred_at: { [Op.gte]: windowStart } };
  if (clientRef) where.client_ref = clientRef;
  if (source) where.source = source;

  const events = await (models as any).AiEvent.findAll({
    where,
    order: [['occurred_at', 'DESC']],
    limit,
  });

  const byIntent: Record<string, number> = {};
  const bySource: Record<string, number> = {};

  events.forEach((event: any) => {
    if (event.intent) {
      byIntent[event.intent] = (byIntent[event.intent] || 0) + (event.occurrence_count || 1);
    }
    if (event.source) {
      bySource[event.source] = (bySource[event.source] || 0) + (event.occurrence_count || 1);
    }
  });

  // Enrich with Redis counters if available
  let redisIntents: Record<string, number> | null = null;
  let redisSources: Record<string, number> | null = null;

  const redis = await getRedisClient();
  const refKey = clientRef || 'global';
  if (redis) {
    try {
      const intentKey = `ai:intent:${userId}:${refKey}`;
      const sourceKey = `ai:source:${userId}:${refKey}`;

      const [intentHash, sourceHash] = await Promise.all([
        redis.hGetAll(intentKey),
        redis.hGetAll(sourceKey),
      ]);

      if (intentHash && Object.keys(intentHash).length > 0) {
        redisIntents = Object.fromEntries(
          Object.entries(intentHash).map(([k, v]) => [k, Number(v) || 0])
        );
      }

      if (sourceHash && Object.keys(sourceHash).length > 0) {
        redisSources = Object.fromEntries(
          Object.entries(sourceHash).map(([k, v]) => [k, Number(v) || 0])
        );
      }
    } catch (err) {
      console.error('[AI] Redis read failed', err);
    }
  }

  return {
    windowStart,
    windowEnd: new Date(),
    total: events.length,
    byIntent: redisIntents || byIntent,
    bySource: redisSources || bySource,
    events,
  };
}

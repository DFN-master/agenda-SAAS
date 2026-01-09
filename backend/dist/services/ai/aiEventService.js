"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAiEvent = createAiEvent;
exports.getAiContext = getAiContext;
const models_1 = __importDefault(require("../../models"));
const sequelize_1 = require("sequelize");
const redisClient_1 = require("../redisClient");
function createAiEvent(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const { userId, source, clientRef, subject, summary, intent, occurrenceCount, metadata, occurredAt, } = input;
        const event = yield models_1.default.AiEvent.create({
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
        const redis = yield (0, redisClient_1.getRedisClient)();
        const refKey = clientRef || 'global';
        const intentKey = `ai:intent:${userId}:${refKey}`;
        const sourceKey = `ai:source:${userId}:${refKey}`;
        if (redis) {
            try {
                if (intent) {
                    yield redis.hIncrBy(intentKey, intent, occurrenceCount || 1);
                }
                if (source) {
                    yield redis.hIncrBy(sourceKey, source, occurrenceCount || 1);
                }
                // TTL opcional para evitar crescimento infinito; 90 dias
                const ttlSeconds = 60 * 60 * 24 * 90;
                yield redis.expire(intentKey, ttlSeconds);
                yield redis.expire(sourceKey, ttlSeconds);
            }
            catch (err) {
                console.error('[AI] Redis increment failed', err);
            }
        }
        return event;
    });
}
function getAiContext(query) {
    return __awaiter(this, void 0, void 0, function* () {
        const { userId, clientRef, source, windowDays = 30, limit = 50 } = query;
        const windowStart = new Date();
        windowStart.setDate(windowStart.getDate() - windowDays);
        const where = { user_id: userId, occurred_at: { [sequelize_1.Op.gte]: windowStart } };
        if (clientRef)
            where.client_ref = clientRef;
        if (source)
            where.source = source;
        const events = yield models_1.default.AiEvent.findAll({
            where,
            order: [['occurred_at', 'DESC']],
            limit,
        });
        const byIntent = {};
        const bySource = {};
        events.forEach((event) => {
            if (event.intent) {
                byIntent[event.intent] = (byIntent[event.intent] || 0) + (event.occurrence_count || 1);
            }
            if (event.source) {
                bySource[event.source] = (bySource[event.source] || 0) + (event.occurrence_count || 1);
            }
        });
        // Enrich with Redis counters if available
        let redisIntents = null;
        let redisSources = null;
        const redis = yield (0, redisClient_1.getRedisClient)();
        const refKey = clientRef || 'global';
        if (redis) {
            try {
                const intentKey = `ai:intent:${userId}:${refKey}`;
                const sourceKey = `ai:source:${userId}:${refKey}`;
                const [intentHash, sourceHash] = yield Promise.all([
                    redis.hGetAll(intentKey),
                    redis.hGetAll(sourceKey),
                ]);
                if (intentHash && Object.keys(intentHash).length > 0) {
                    redisIntents = Object.fromEntries(Object.entries(intentHash).map(([k, v]) => [k, Number(v) || 0]));
                }
                if (sourceHash && Object.keys(sourceHash).length > 0) {
                    redisSources = Object.fromEntries(Object.entries(sourceHash).map(([k, v]) => [k, Number(v) || 0]));
                }
            }
            catch (err) {
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
    });
}

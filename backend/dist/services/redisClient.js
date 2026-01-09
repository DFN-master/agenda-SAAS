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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = getRedisClient;
const redis_1 = require("redis");
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const client = (0, redis_1.createClient)({ url: redisUrl });
client.on('error', (err) => {
    console.error('[Redis] error', err);
});
let ready = false;
function getRedisClient() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!ready) {
            try {
                yield client.connect();
                ready = true;
                console.log('[Redis] connected');
            }
            catch (err) {
                console.error('[Redis] connect failed', err);
                return null;
            }
        }
        return client;
    });
}
exports.default = client;

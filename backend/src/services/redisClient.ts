import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const client = createClient({ url: redisUrl });

client.on('error', (err) => {
  console.error('[Redis] error', err);
});

let ready = false;

export async function getRedisClient() {
  if (!ready) {
    try {
      await client.connect();
      ready = true;
      console.log('[Redis] connected');
    } catch (err) {
      console.error('[Redis] connect failed', err);
      return null;
    }
  }
  return client;
}

export default client;

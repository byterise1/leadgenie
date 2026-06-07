import { Queue } from 'bullmq';
import Redis from 'ioredis';

export const redisConnection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const emailQueue = new Queue('email-sending', { connection: redisConnection });
export const warmupQueue = new Queue('warmup', { connection: redisConnection });

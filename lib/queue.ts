import { Queue } from 'bullmq';

function redisOpts() {
  const u = new URL(process.env.REDIS_URL!);
  return {
    host: u.hostname,
    port: Number(u.port),
    password: u.password ? decodeURIComponent(u.password) : undefined,
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
  };
}

export const emailQueue = new Queue('email-sending', { connection: redisOpts() });
export const warmupQueue = new Queue('warmup', { connection: redisOpts() });

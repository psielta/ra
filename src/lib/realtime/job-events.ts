import { getRedisPublisher } from "@/lib/redis";
import { JOB_EVENT_CHANNELS } from "@/lib/realtime/job-channels";
import {
  normalizeRedisJobEvent,
  type JobRealtimeEvent,
} from "@/lib/validations/job-events";

type JobEventListener = (payload: JobRealtimeEvent) => void;

class InMemoryJobEventBus {
  private listeners = new Map<string, Set<JobEventListener>>();

  subscribe(jobId: string, listener: JobEventListener) {
    const bucket = this.listeners.get(jobId) ?? new Set<JobEventListener>();
    bucket.add(listener);
    this.listeners.set(jobId, bucket);

    return () => {
      bucket.delete(listener);
      if (bucket.size === 0) {
        this.listeners.delete(jobId);
      }
    };
  }

  publish(payload: JobRealtimeEvent) {
    const bucket = this.listeners.get(payload.jobId);
    if (!bucket) return;

    for (const listener of bucket) {
      listener(payload);
    }
  }
}

const globalForJobBus = globalThis as unknown as {
  inMemoryJobEventBus: InMemoryJobEventBus | undefined;
};

function getInMemoryBus() {
  if (!globalForJobBus.inMemoryJobEventBus) {
    globalForJobBus.inMemoryJobEventBus = new InMemoryJobEventBus();
  }

  return globalForJobBus.inMemoryJobEventBus;
}

export async function publishLocalJobEvent(payload: JobRealtimeEvent) {
  getInMemoryBus().publish(payload);
}

export async function subscribeToJobEvents(
  input: { jobId: string; userId: string },
  listener: JobEventListener,
) {
  const redis = getRedisPublisher();

  if (redis) {
    const subscriber = redis.duplicate();

    if (subscriber.status !== "ready") {
      await subscriber.connect();
    }

    await subscriber.subscribe(...JOB_EVENT_CHANNELS);

    const onMessage = (channel: string, message: string) => {
      const event = normalizeRedisJobEvent(channel, message);

      if (
        !event ||
        event.jobId !== input.jobId ||
        event.userId !== input.userId
      ) {
        return;
      }

      listener(event);
    };

    subscriber.on("message", onMessage);

    return async () => {
      subscriber.off("message", onMessage);
      await subscriber.unsubscribe(...JOB_EVENT_CHANNELS);
      subscriber.disconnect();
    };
  }

  return getInMemoryBus().subscribe(input.jobId, (event) => {
    if (event.userId === input.userId) {
      listener(event);
    }
  });
}

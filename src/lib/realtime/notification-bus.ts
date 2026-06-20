import type { NotificationDto } from "@/types/notifications";
import { getRedisPublisher, notificationChannel } from "@/lib/redis";

type NotificationListener = (payload: NotificationDto) => void;

class InMemoryNotificationBus {
  private listeners = new Map<string, Set<NotificationListener>>();

  subscribe(userId: string, listener: NotificationListener) {
    const bucket =
      this.listeners.get(userId) ?? new Set<NotificationListener>();
    bucket.add(listener);
    this.listeners.set(userId, bucket);

    return () => {
      bucket.delete(listener);
      if (bucket.size === 0) {
        this.listeners.delete(userId);
      }
    };
  }

  publish(userId: string, payload: NotificationDto) {
    const bucket = this.listeners.get(userId);
    if (!bucket) return;

    for (const listener of bucket) {
      listener(payload);
    }
  }
}

const globalForBus = globalThis as unknown as {
  inMemoryNotificationBus: InMemoryNotificationBus | undefined;
};

function getInMemoryBus() {
  if (!globalForBus.inMemoryNotificationBus) {
    globalForBus.inMemoryNotificationBus = new InMemoryNotificationBus();
  }

  return globalForBus.inMemoryNotificationBus;
}

export async function deliverNotification(
  userId: string,
  payload: NotificationDto,
) {
  const redis = getRedisPublisher();

  if (redis) {
    if (redis.status !== "ready") {
      await redis.connect();
    }

    await redis.publish(notificationChannel(userId), JSON.stringify(payload));
    return;
  }

  getInMemoryBus().publish(userId, payload);
}

export async function subscribeToNotifications(
  userId: string,
  listener: NotificationListener,
) {
  const redis = getRedisPublisher();

  if (redis) {
    const subscriber = redis.duplicate();

    if (subscriber.status !== "ready") {
      await subscriber.connect();
    }

    const channel = notificationChannel(userId);
    await subscriber.subscribe(channel);

    const onMessage = (incomingChannel: string, message: string) => {
      if (incomingChannel !== channel) return;

      try {
        listener(JSON.parse(message) as NotificationDto);
      } catch {
        // ignore malformed payloads
      }
    };

    subscriber.on("message", onMessage);

    return async () => {
      subscriber.off("message", onMessage);
      await subscriber.unsubscribe(channel);
      subscriber.disconnect();
    };
  }

  return getInMemoryBus().subscribe(userId, listener);
}

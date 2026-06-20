import amqp, { type Channel } from "amqplib";

import { PORTS } from "@/config/ports";
import { createRequestLogger } from "@/lib/logger";
import {
  MEDIA_TRANSCODE_EXCHANGE,
  MEDIA_TRANSCODE_QUEUE,
  MEDIA_TRANSCODE_ROUTING_KEY,
} from "@/lib/queue/constants";

const queueLogger = createRequestLogger({ module: "rabbitmq" });

export type MediaTranscodeJobMessage = {
  jobId: string;
  userId: string;
  mediaType: "audio" | "video";
  storageKey: string;
  mimeType: string;
};

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

const globalForRabbit = globalThis as unknown as {
  rabbitConnection: AmqpConnection | undefined;
  rabbitChannel: Channel | undefined;
  rabbitTopologyReady: boolean | undefined;
};

function getRabbitmqUrl() {
  return (
    process.env.RABBITMQ_URL ?? `amqp://guest:guest@localhost:${PORTS.rabbitmq}`
  );
}

async function ensureTopology(channel: Channel) {
  if (globalForRabbit.rabbitTopologyReady) {
    return;
  }

  await channel.assertExchange(MEDIA_TRANSCODE_EXCHANGE, "direct", {
    durable: true,
  });
  await channel.assertQueue(MEDIA_TRANSCODE_QUEUE, { durable: true });
  await channel.bindQueue(
    MEDIA_TRANSCODE_QUEUE,
    MEDIA_TRANSCODE_EXCHANGE,
    MEDIA_TRANSCODE_ROUTING_KEY,
  );

  globalForRabbit.rabbitTopologyReady = true;
}

async function getChannel() {
  if (globalForRabbit.rabbitChannel) {
    return globalForRabbit.rabbitChannel;
  }

  const connection = await amqp.connect(getRabbitmqUrl());
  const channel = await connection.createChannel();
  await ensureTopology(channel);

  connection.on("close", () => {
    globalForRabbit.rabbitConnection = undefined;
    globalForRabbit.rabbitChannel = undefined;
    globalForRabbit.rabbitTopologyReady = undefined;
  });

  globalForRabbit.rabbitConnection = connection;
  globalForRabbit.rabbitChannel = channel;

  return channel;
}

export async function publishMediaTranscodeJob(
  message: MediaTranscodeJobMessage,
) {
  const channel = await getChannel();

  const published = channel.publish(
    MEDIA_TRANSCODE_EXCHANGE,
    MEDIA_TRANSCODE_ROUTING_KEY,
    Buffer.from(JSON.stringify(message)),
    {
      contentType: "application/json",
      persistent: true,
    },
  );

  if (!published) {
    throw new Error("Fila RabbitMQ indisponível no momento");
  }

  queueLogger.info({
    event: "rabbitmq.job_published",
    jobId: message.jobId,
    userId: message.userId,
    mediaType: message.mediaType,
    storageKey: message.storageKey,
  });
}

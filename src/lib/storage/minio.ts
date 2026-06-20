import * as Minio from "minio";

import { PORTS } from "@/config/ports";
import { createRequestLogger } from "@/lib/logger";

const minioLogger = createRequestLogger({ module: "minio" });

const globalForMinio = globalThis as unknown as {
  minioClient: Minio.Client | undefined;
  bucketReady: boolean | undefined;
};

export function getMinioConfig() {
  const endpoint = process.env.MINIO_ENDPOINT ?? "localhost";
  const port = Number(process.env.MINIO_PORT ?? PORTS.minio);
  const useSSL = process.env.MINIO_USE_SSL === "true";
  const accessKey = process.env.MINIO_ACCESS_KEY ?? "minio";
  const secretKey = process.env.MINIO_SECRET_KEY ?? "miniosecret";
  const bucket = process.env.MINIO_BUCKET ?? "ra-media";
  const publicUrl =
    process.env.MINIO_PUBLIC_URL ?? `http://localhost:${PORTS.minio}`;

  return {
    endpoint,
    port,
    useSSL,
    accessKey,
    secretKey,
    bucket,
    publicUrl: publicUrl.replace(/\/$/, ""),
  };
}

export function getMinioClient(): Minio.Client {
  if (!globalForMinio.minioClient) {
    const config = getMinioConfig();

    globalForMinio.minioClient = new Minio.Client({
      endPoint: config.endpoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
  }

  return globalForMinio.minioClient;
}

function avatarsBucketPolicy(bucket: string) {
  return JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { AWS: ["*"] },
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${bucket}/avatars/*`],
      },
    ],
  });
}

export async function ensureMinioBucket() {
  if (globalForMinio.bucketReady) {
    return getMinioConfig().bucket;
  }

  const client = getMinioClient();
  const { bucket } = getMinioConfig();
  const exists = await client.bucketExists(bucket);

  if (!exists) {
    await client.makeBucket(bucket);
    minioLogger.info({ event: "minio.bucket_created", bucket });
  }

  await client.setBucketPolicy(bucket, avatarsBucketPolicy(bucket));
  globalForMinio.bucketReady = true;

  return bucket;
}

export function getMinioPublicUrl(objectKey: string) {
  const { bucket, publicUrl } = getMinioConfig();
  return `${publicUrl}/${bucket}/${objectKey}`;
}

export function extractObjectKeyFromUrl(url: string | null | undefined) {
  if (!url) return null;

  const { bucket, publicUrl } = getMinioConfig();
  const prefix = `${publicUrl}/${bucket}/`;

  if (!url.startsWith(prefix)) {
    return null;
  }

  return url.slice(prefix.length);
}

export async function putMinioObject(
  objectKey: string,
  buffer: Buffer,
  contentType: string,
) {
  const client = getMinioClient();
  const bucket = await ensureMinioBucket();

  await client.putObject(bucket, objectKey, buffer, buffer.length, {
    "Content-Type": contentType,
  });

  return getMinioPublicUrl(objectKey);
}

export async function deleteMinioObject(objectKey: string) {
  const client = getMinioClient();
  const bucket = await ensureMinioBucket();

  await client.removeObject(bucket, objectKey);
}

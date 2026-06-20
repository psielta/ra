export const PORTS = {
  app: 14001,
  postgres: 14002,
  prismaStudio: 14003,
  // Pipeline de mídia (a adicionar no Docker Compose)
  rabbitmq: 14004,
  rabbitmqManagement: 14005,
  redis: 14006,
  minio: 14007,
  minioConsole: 14008,
  nginx: 14009,
  workerMetrics: 14010,
} as const;

export const APP_URL = `http://localhost:${PORTS.app}`;
export const DATABASE_URL_LOCAL = `postgresql://postgres:postgres@localhost:${PORTS.postgres}/ra?schema=public`;

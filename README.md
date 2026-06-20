<p align="center">
  <strong style="font-size: 2.5rem; letter-spacing: 0.3em; font-family: serif;">â˜€ RA</strong>
  <br />
  <em>Deus do Sol Â· Portfolio de MÃ­dia</em>
</p>

**Ra** Ã© um projeto de **portfolio pessoal** onde o usuÃ¡rio grava ou envia **mÃºsicas (MP3)** e **vÃ­deos (MP4)**, acompanha o processamento em tempo real e assiste ao prÃ³prio conteÃºdo no navegador. A identidade visual Ã© egÃ­pcia â€” lapis, ouro e papiro â€” em homenagem ao deus do sol.

O diferencial arquitetural e um **pipeline assincrono de midia**: upload pela API Next.js, armazenamento em object storage, fila de conversao com RabbitMQ, worker .NET com FFmpeg gerando **HLS para audio e video**, cover automatico de video, entrega via **Nginx** e reproducao no frontend com **hls.js**. Progresso do job e publicado em **Redis** e exibido ao usuario em **tempo real** durante a conversao.

Projeto construÃ­do como demonstraÃ§Ã£o de portfolio com foco em arquitetura distribuÃ­da, UX de processamento transparente e base web production-ready.

---

## Ideia Central

O usuÃ¡rio nÃ£o apenas â€œsobe um arquivoâ€. Ele inicia um **job de mÃ­dia** cujo ciclo de vida Ã© rastreÃ¡vel:

| Status       | Significado                                                               |
| ------------ | ------------------------------------------------------------------------- |
| `processing` | Arquivo recebido; worker convertendo (FFmpeg)                             |
| `ready`      | HLS gerado (audio/video), cover de video disponivel; pronto para playback |
| `error`      | Falha na conversÃ£o, upload ou storage                                    |

Enquanto o status Ã© `processing`, o dashboard mostra **progresso em tempo real** (percentual, etapa atual, mensagem) â€” o mesmo padrÃ£o do worker de referÃªncia `D:\globalleitorpdf\globalleitorpdf\WorkerServiceBuscaPrecoIA`, que consome jobs do RabbitMQ e publica eventos de progresso via Redis Pub/Sub.

---

## Pipeline de MÃ­dia (visÃ£o alvo)

### Fluxo completo

```text
UsuÃ¡rio (browser)
    â”‚
    â”œâ”€ grava ou seleciona MP3 / MP4
    â”‚
    â–¼
Next.js / API Routes
    â”‚  valida sessÃ£o, metadados (Zod)
    â”‚  cria registro MediaJob no PostgreSQL (status: processing)
    â”‚  grava original em Storage
    â”‚  publica mensagem na fila RabbitMQ
    â”‚
    â–¼
Storage (MinIO / S3 / disco em dev)
    â”‚  original: uploads/{userId}/{jobId}/source.mp4
    â”‚
    â–¼
RabbitMQ
    â”‚  fila: media-transcode-jobs
    â”‚  payload: jobId, userId, tipo (audio|video), path do original
    â”‚
    â–¼
Worker .NET (FFmpeg)                    Redis Pub/Sub
    â”‚  consome mensagem                      â–²
    â”‚  baixa original do storage             â”‚  job.progress
    â”‚  executa FFmpeg                        â”‚  job.completed
    â”‚  publica progresso a cada etapa â”€â”€â”€â”€â”€â”€â”€â”˜  job.failed
    â”‚  sobe artefatos convertidos
    â”‚
    â–¼
Storage
    â”‚  vÃ­deo: outputs/{userId}/{jobId}/index.m3u8 + *.ts
    │  audio/video: outputs/{userId}/{jobId}/index.m3u8 + *.ts
    â”‚
    â–¼
Worker atualiza API / PostgreSQL
    â”‚  status: ready | error
    │  urls HLS, duracao, cover de video
    â”‚
    â–¼
Nginx
    │  serve .m3u8, segmentos .ts e covers com cache
    â”‚  (CORS e paths alinhados ao player)
    â”‚
    â–¼
Frontend (dashboard)
    â”‚  biblioteca de mÃ­dia (TanStack Table)
    │  player video: hls.js
    │  player audio: hls.js anexado ao elemento audio
    â”‚  SSE ou WebSocket/Redis bridge para progresso live
```

### Fluxo de vÃ­deo (MP4 â†’ HLS)

```text
VÃ­deo MP4 (upload)
        â†“
   FFmpeg (worker .NET)
   - probe metadata
   - transcode mÃºltiplas resoluÃ§Ãµes (opcional)
   - gera playlist .m3u8 + segmentos .ts
        â†“
   HLS (.m3u8 + .ts) no Storage
        â†“
   Nginx (static / reverse proxy)
        â†“
   Player web (hls.js / Video.js)
```

### Fluxo de audio (MP3 -> HLS)

```text
MP3/WebM (upload ou gravacao)
        â†“
   FFmpeg gera HLS audio-only (AAC + .m3u8 + .ts)
        â†“
   Storage (playlist + segmentos)
        â†“
   Nginx
        â†“
   Player audio HLS no dashboard
```

Videos e audios passam por conversao HLS para streaming no browser. Videos tambem geram `cover.jpg` automaticamente para listagens e detalhes.

---

## Arquitetura de Sistemas

```text
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                         Frontend (Next.js)                       â”‚
â”‚  Auth Â· Upload UI Â· Biblioteca Â· Players Â· Progresso realtime   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                â”‚ REST / Server Actions          â”‚ SSE / WS (progresso)
                â–¼                                â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   Next.js API Routes       â”‚      â”‚   Redis (pub/sub + cache)   â”‚
â”‚   Prisma Â· Pino Â· Sentry   â”‚â—„â”€â”€â”€â”€â–ºâ”‚   canais: job.progress,     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â”‚           job.completed,     â”‚
        â”‚           â”‚               â”‚           job.failed         â”‚
        â–¼           â–¼               â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–²â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                   â”‚
â”‚ PostgreSQL  â”‚ â”‚  RabbitMQ   â”‚â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ users, jobs â”‚ â”‚  fila jobs  â”‚                   â”‚
â”‚ media meta  â”‚ â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜                   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜        â”‚                          â”‚
                       â–¼                          â”‚
              â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”              â”‚
              â”‚ Worker .NET 8       â”‚â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
              â”‚ FFmpeg Â· Serilog   â”‚
              â”‚ (mesmo padrÃ£o do   â”‚
              â”‚  WorkerService     â”‚
              â”‚  BuscaPrecoIA)     â”‚
              â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                        â”‚
        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
        â–¼               â–¼               â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ MinIO / S3  â”‚ â”‚   Nginx     â”‚ â”‚  Prometheus â”‚
│ originals + │ │ serve HLS   │ │  (opcional) │
│ HLS output  │ │ + covers    │ │             │
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## Worker .NET (referÃªncia e versÃµes)

O worker de transcodificaÃ§Ã£o serÃ¡ um **.NET 8 Worker Service**, espelhando o padrÃ£o de `D:\globalleitorpdf\globalleitorpdf\WorkerServiceBuscaPrecoIA`:

- `BackgroundService` + consumer RabbitMQ (`IRabbitMqConsumerService`)
- Processamento em `IMediaTranscodeWorkerService` (equivalente ao `IPriceSearchWorkerService`)
- Progresso via `IRedisService.PublishProgressAsync` nos canais Redis
- AtualizaÃ§Ã£o de status final no PostgreSQL via API Next.js ou acesso direto
- Logs estruturados com **Serilog**; mÃ©tricas opcionais com **prometheus-net**

### Pacotes alvo (mesmas versÃµes do worker de referÃªncia)

| Pacote                                       | VersÃ£o  |
| -------------------------------------------- | -------- |
| TargetFramework                              | `net8.0` |
| Microsoft.Extensions.Hosting                 | 9.0.9    |
| Microsoft.Extensions.Hosting.WindowsServices | 9.0.9    |
| RabbitMQ.Client                              | 6.8.1    |
| StackExchange.Redis                          | 2.8.16   |
| Newtonsoft.Json                              | 13.0.4   |
| Serilog                                      | 4.1.0    |
| Serilog.Extensions.Hosting                   | 8.0.0    |
| Serilog.Sinks.Console / File                 | 6.0.0    |
| prometheus-net                               | 8.2.1    |

Estrutura prevista no repositÃ³rio:

```text
worker/
  WorkerServiceRaMedia/          Worker .NET 8 (RabbitMQ + Redis + FFmpeg)
    Worker.cs
    Services/
      RabbitMqConsumerService.cs
      RedisService.cs              PublishProgressAsync â†’ canal job.progress
      FfmpegTranscodeService.cs
      MediaTranscodeWorkerService.cs
    Models/
      MediaTranscodeJob.cs
      JobProgressEvent.cs
```

### Eventos Redis (contrato previsto)

Inspirado no worker de referÃªncia (`RedisChannel.Literal("job.progress")`):

```json
{
  "jobId": "clx...",
  "userId": "clx...",
  "status": "processing",
  "stage": "transcoding",
  "progressPercentage": 42.5,
  "message": "Gerando segmentos HLS (720p)",
  "timestamp": "2026-06-20T12:00:00Z"
}
```

Canais: `job.progress`, `job.completed`, `job.failed`. O frontend assina via SSE exposto pela API Next.js (bridge Redis â†’ browser).

---

## Stack por camada

### Frontend / API (este repositÃ³rio â€” `D:\ra`)

| Camada          | Tecnologia                                   |
| --------------- | -------------------------------------------- |
| Framework       | Next.js 15, App Router, React 19, TypeScript |
| Auth            | Auth.js / NextAuth v5 (JWT + Credentials)    |
| ORM             | Prisma + PostgreSQL                          |
| UI              | Tailwind v4, shadcn/ui, lucide-react, sonner |
| Forms           | react-hook-form + Zod                        |
| Data            | TanStack Query, axios, TanStack Table        |
| Players         | hls.js (audio e video HLS)                   |
| Realtime        | SSE ou WebSocket (bridge Redis)              |
| Estado UI       | Zustand                                      |
| Observabilidade | Sentry + Pino                                |

### Worker de midia (`worker/`)

| Camada            | Tecnologia                        |
| ----------------- | --------------------------------- |
| Runtime           | .NET 8 Worker Service             |
| Fila              | RabbitMQ 6.8.x                    |
| Progresso / cache | Redis (StackExchange.Redis 2.8.x) |
| Transcoding       | FFmpeg (CLI via Process)          |
| Logs              | Serilog                           |
| MÃ©tricas         | prometheus-net (opcional)         |

### Infraestrutura (Docker Compose â€” visÃ£o alvo)

| ServiÃ§o            | Porta host | FunÃ§Ã£o                        |
| ------------------- | ---------- | ------------------------------- |
| Next.js             | **14001**  | App + API                       |
| PostgreSQL          | **14002**  | Metadados, jobs, usuÃ¡rios      |
| Prisma Studio       | **14003**  | InspeÃ§Ã£o do banco (dev)       |
| RabbitMQ AMQP       | **14004**  | Fila de conversÃ£o              |
| RabbitMQ Management | **14005**  | UI admin da fila (dev)          |
| Redis               | **14006**  | Pub/sub de progresso + cache    |
| MinIO API           | **14007**  | Object storage (S3-compatible)  |
| MinIO Console       | **14008**  | UI do storage (dev)             |
| Nginx               | **14009**  | Serve HLS (.m3u8/.ts) e covers  |
| Worker metrics      | **14010**  | Prometheus do worker (opcional) |
| Mailhog SMTP        | **14011**  | E-mail em dev (esqueci senha)   |
| Mailhog UI          | **14012**  | Inbox local de e-mails (dev)    |

Todas as portas ficam no range **14001-15000**. Constantes em `src/config/ports.ts`. **No Compose hoje:** Postgres, app, RabbitMQ, Redis, MinIO, Nginx, Mailhog e worker .NET.

Storage em produÃ§Ã£o pode ser **S3**, **Cloudflare R2** ou **MinIO** â€” a API e o worker falam S3-compatible API; em dev, MinIO ou volume Docker.

---

## Estado Atual (v1.0 - pipeline completo)

A base web e o **pipeline de midia end-to-end** estao implementados: upload/gravacao -> MinIO -> fila RabbitMQ -> worker .NET/FFmpeg -> Redis/SSE -> Nginx/HLS -> player no navegador. Jobs saem de `processing` para `ready`/`error` pelo callback interno do worker.

### JÃ¡ implementado

- AutenticaÃ§Ã£o completa (sign-in, sign-up, JWT, roles `USER`/`ADMIN`)
- Esqueci minha senha + reset + troca de senha no perfil (Mailhog em dev)
- Layout admin (sidebar, header, mobile nav) com tema egÃ­pcio
- Docker Compose: PostgreSQL, app Next.js, RabbitMQ, Redis, MinIO, Nginx, Mailhog e worker .NET
- Prisma migrations automÃ¡ticas no startup
- Stack frontend configurada (Query, Table, Zustand, Lexical demo)
- Sentry, Pino, Vitest, Playwright, ESLint, Husky

### Pipeline de mÃ­dia â€” checklist 100% concluido

- [x] Modelos Prisma: `MediaAsset`, `TranscodeJob`, `Series` com status `processing|ready|error`
- [x] API de upload (multipart â†’ MinIO/S3)
- [x] PublicaÃ§Ã£o de job no RabbitMQ apÃ³s upload
- [x] Docker Compose: RabbitMQ, Redis, MinIO (+ Mailhog para e-mail dev)
- [x] UI de mÃ­dia: `/resources`, `/resources/[id]`, `/series`, `/series/[id]`, `/queue`, `/dashboard/upload`
- [x] SÃ©ries como coleÃ§Ãµes (preview de itens na listagem + ediÃ§Ã£o em drawer)
- [x] Fila de processamento (`/queue`) com progresso live via Redis/SSE
- [x] Player audio HLS via hls.js quando status `ready`
- [x] Docker Compose: Nginx (HLS/covers)
- [x] Worker .NET `WorkerServiceRaMedia` (FFmpeg, padrao WorkerServiceBuscaPrecoIA)
- [x] Redis pub/sub -> SSE no Next.js para progresso live
- [x] Nginx servindo HLS e covers
- [x] Player video HLS via hls.js
- [x] TanStack Table na biblioteca
- [x] Gravacao no browser (MediaRecorder -> upload WebM)

---

## Fluxo de Produto

1. UsuÃ¡rio cria conta e entra no dashboard.
2. Cria sÃ©ries (coleÃ§Ãµes), envia MP3/MP4 em `/dashboard/upload` e classifica por sÃ©rie.
3. A API valida, persiste metadados (`processing`), salva o original no MinIO e enfileira o job no RabbitMQ.
4. `/resources`, `/series` e `/queue` exibem status e progresso em tempo real via SSE/Redis.
5. O worker .NET consome a fila, roda FFmpeg, publica progresso, grava HLS para audio/video e gera cover automatico para video.
6. Ao concluir, o banco passa para `ready`; Nginx/storage expÃµe as URLs de playback.
7. O usuÃ¡rio assiste/ouve no player integrado. O portfolio Ã© privado por padrÃ£o; vitrine pÃºblica Ã© evoluÃ§Ã£o futura.

---

## Estrutura do RepositÃ³rio (atual + prevista)

```text
D:\ra/
  src/
    app/(admin)/resources/      Biblioteca de mÃ­dia
    app/(admin)/series/         ColeÃ§Ãµes (sÃ©ries)
    app/(admin)/queue/          Fila de processamento
    app/api/media/upload/       Upload â†’ MinIO + RabbitMQ
    app/api/series|resources|queue/
  prisma/                       Schema e migrations (MediaAsset, TranscodeJob, Series)
  docker/                       Entrypoints
  worker/                       WorkerServiceRaMedia (.NET 8)
  nginx/                        conf para HLS/covers
  docker-compose.yml            Postgres, app, RabbitMQ, Redis, MinIO, Nginx, Mailhog, worker
```

---

## Como Executar (base atual)

### PrÃ©-requisitos

- Node.js 22+
- Docker + Docker Compose
- .NET SDK 8 para desenvolver/testar o worker localmente
- FFmpeg na imagem Docker do worker

### 1. VariÃ¡veis de ambiente

```bash
cp .env.example .env
```

```text
PORT=14001
DATABASE_URL=postgresql://postgres:postgres@localhost:14002/ra?schema=public
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=http://localhost:14001
NEXT_PUBLIC_APP_URL=http://localhost:14001
```

### 2. Desenvolvimento (recomendado â€” hot reload)

Para codar, testar UI e usar Playwright MCP, rode a app **localmente** e sÃ³ o Postgres no Docker:

```bash
npm run docker:db    # Postgres na 14002
docker compose stop app   # se a app Docker estiver rodando
npm run dev          # http://localhost:14001
```

| ServiÃ§o            | URL                    |
| ------------------- | ---------------------- |
| App (local)         | http://localhost:14001 |
| PostgreSQL (Docker) | localhost:14002        |

### 3. Docker completo (validar infra)

```bash
npm run docker:up
```

Use quando precisar testar o Compose/entrypoint â€” nÃ£o para iterar frontend (sem hot reload eficiente).

### 4. ValidaÃ§Ã£o

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

### Windows

```bat
cmd /c "cd /d D:\ra && npm run docker:up"
```

PowerShell quebra em `D:\ra` por causa de `\r` â€” use `cmd /c`.

---

## DecisÃµes Arquiteturais

- **Audio e video sempre em HLS** apos upload — MP3/MP4/WebM originals sao entrada; playback no browser usa `.m3u8`.
- **Fila RabbitMQ** desacopla upload (rÃ¡pido) de transcode (lento/CPU-bound).
- **Redis Pub/Sub** para progresso â€” mesmo padrÃ£o do `WorkerServiceBuscaPrecoIA`; nÃ£o bloquear o worker com polling do frontend.
- **Worker em .NET 8**, nÃ£o Node â€” FFmpeg em processo longo, Serilog maduro, reuso do template RabbitMQ+Redis jÃ¡ validado em produÃ§Ã£o.
- **Nginx** na frente dos segmentos HLS e covers — cache, range requests, MIME types corretos para `.m3u8`/`.ts`/`.jpg`.
- **Object storage** (MinIO/S3) â€” originals e outputs; banco guarda apenas metadados e URLs.
- **Status no PostgreSQL** Ã© fonte de verdade; Redis Ã© transporte efÃªmero de eventos.
- **Portas 14001â€“15000** em todos os serviÃ§os expostos no host.
- **UI pt-BR**, tema egÃ­pcio preservado em novas telas.

---

## DocumentaÃ§Ã£o para Agentes

- [`AGENT.md`](./AGENT.md) â€” instruÃ§Ãµes operacionais para qualquer agente de IA
- [`CLAUDE.md`](./CLAUDE.md) â€” guia detalhado para Claude Code / Cursor

Leia antes de implementar o pipeline de mÃ­dia, o worker .NET ou novos serviÃ§os no Compose.

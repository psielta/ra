<p align="center">
  <strong style="font-size: 2.5rem; letter-spacing: 0.3em; font-family: serif;">☀ RA</strong>
  <br />
  <em>Deus do Sol · Portfolio de Mídia</em>
</p>

**Ra** é um projeto de **portfolio pessoal** onde o usuário grava ou envia **músicas (MP3)** e **vídeos (MP4)**, acompanha o processamento em tempo real e assiste ao próprio conteúdo no navegador. A identidade visual é egípcia — lapis, ouro e papiro — em homenagem ao deus do sol.

O diferencial arquitetural é um **pipeline assíncrono de mídia**: upload pela API Next.js, armazenamento em object storage, fila de conversão com RabbitMQ, worker .NET com FFmpeg gerando **HLS**, entrega via **Nginx** e reprodução no frontend com **hls.js** (e player de áudio para MP3). Progresso do job é publicado em **Redis** e exibido ao usuário em **tempo real** durante a conversão.

Projeto construído como demonstração de portfolio com foco em arquitetura distribuída, UX de processamento transparente e base web production-ready.

---

## Ideia Central

O usuário não apenas “sobe um arquivo”. Ele inicia um **job de mídia** cujo ciclo de vida é rastreável:

| Status       | Significado                                                        |
| ------------ | ------------------------------------------------------------------ |
| `processing` | Arquivo recebido; worker convertendo (FFmpeg)                      |
| `ready`      | HLS gerado (vídeo) ou MP3 disponível (áudio); pronto para playback |
| `error`      | Falha na conversão, upload ou storage                              |

Enquanto o status é `processing`, o dashboard mostra **progresso em tempo real** (percentual, etapa atual, mensagem) — o mesmo padrão do worker de referência `D:\globalleitorpdf\globalleitorpdf\WorkerServiceBuscaPrecoIA`, que consome jobs do RabbitMQ e publica eventos de progresso via Redis Pub/Sub.

---

## Pipeline de Mídia (visão alvo)

### Fluxo completo

```text
Usuário (browser)
    │
    ├─ grava ou seleciona MP3 / MP4
    │
    ▼
Next.js / API Routes
    │  valida sessão, metadados (Zod)
    │  cria registro MediaJob no PostgreSQL (status: processing)
    │  grava original em Storage
    │  publica mensagem na fila RabbitMQ
    │
    ▼
Storage (MinIO / S3 / disco em dev)
    │  original: uploads/{userId}/{jobId}/source.mp4
    │
    ▼
RabbitMQ
    │  fila: media-transcode-jobs
    │  payload: jobId, userId, tipo (audio|video), path do original
    │
    ▼
Worker .NET (FFmpeg)                    Redis Pub/Sub
    │  consome mensagem                      ▲
    │  baixa original do storage             │  job.progress
    │  executa FFmpeg                        │  job.completed
    │  publica progresso a cada etapa ───────┘  job.failed
    │  sobe artefatos convertidos
    │
    ▼
Storage
    │  vídeo: outputs/{userId}/{jobId}/index.m3u8 + *.ts
    │  áudio: outputs/{userId}/{jobId}/track.mp3 (ou stream direto do original)
    │
    ▼
Worker atualiza API / PostgreSQL
    │  status: ready | error
    │  urls HLS / MP3, duração, thumbnail
    │
    ▼
Nginx
    │  serve .m3u8, segmentos .ts e MP3 com cache
    │  (CORS e paths alinhados ao player)
    │
    ▼
Frontend (dashboard)
    │  biblioteca de mídia (TanStack Table)
    │  player vídeo: hls.js (+ Video.js opcional)
    │  player áudio: HTML5 audio / Howler
    │  SSE ou WebSocket/Redis bridge para progresso live
```

### Fluxo de vídeo (MP4 → HLS)

```text
Vídeo MP4 (upload)
        ↓
   FFmpeg (worker .NET)
   - probe metadata
   - transcode múltiplas resoluções (opcional)
   - gera playlist .m3u8 + segmentos .ts
        ↓
   HLS (.m3u8 + .ts) no Storage
        ↓
   Nginx (static / reverse proxy)
        ↓
   Player web (hls.js / Video.js)
```

### Fluxo de áudio (MP3)

```text
MP3 (upload ou gravação)
        ↓
   [opcional] FFmpeg normaliza / gera waveform
        ↓
   Storage (arquivo final)
        ↓
   Nginx ou URL assinada do object storage
        ↓
   Player HTML5 no dashboard
```

Vídeos **sempre** passam por conversão HLS para streaming adaptativo no browser. Áudios podem ser servidos diretamente como MP3, com FFmpeg opcional para normalização.

---

## Arquitetura de Sistemas

```text
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  Auth · Upload UI · Biblioteca · Players · Progresso realtime   │
└───────────────┬───────────────────────────────┬─────────────────┘
                │ REST / Server Actions          │ SSE / WS (progresso)
                ▼                                ▼
┌───────────────────────────┐      ┌────────────────────────────┐
│   Next.js API Routes       │      │   Redis (pub/sub + cache)   │
│   Prisma · Pino · Sentry   │◄────►│   canais: job.progress,     │
└───────┬───────────┬────────┘      │           job.completed,     │
        │           │               │           job.failed         │
        ▼           ▼               └─────────────▲──────────────┘
┌─────────────┐ ┌─────────────┐                   │
│ PostgreSQL  │ │  RabbitMQ   │───────────────────┤
│ users, jobs │ │  fila jobs  │                   │
│ media meta  │ └──────┬──────┘                   │
└─────────────┘        │                          │
                       ▼                          │
              ┌────────────────────┐              │
              │ Worker .NET 8       │──────────────┘
              │ FFmpeg · Serilog   │
              │ (mesmo padrão do   │
              │  WorkerService     │
              │  BuscaPrecoIA)     │
              └─────────┬──────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ MinIO / S3  │ │   Nginx     │ │  Prometheus │
│ originals + │ │ serve HLS   │ │  (opcional) │
│ HLS output  │ │ + MP3       │ │             │
└─────────────┘ └─────────────┘ └─────────────┘
```

---

## Worker .NET (referência e versões)

O worker de transcodificação será um **.NET 8 Worker Service**, espelhando o padrão de `D:\globalleitorpdf\globalleitorpdf\WorkerServiceBuscaPrecoIA`:

- `BackgroundService` + consumer RabbitMQ (`IRabbitMqConsumerService`)
- Processamento em `IMediaTranscodeWorkerService` (equivalente ao `IPriceSearchWorkerService`)
- Progresso via `IRedisService.PublishProgressAsync` nos canais Redis
- Atualização de status final no PostgreSQL via API Next.js ou acesso direto
- Logs estruturados com **Serilog**; métricas opcionais com **prometheus-net**

### Pacotes alvo (mesmas versões do worker de referência)

| Pacote                                       | Versão   |
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

Estrutura prevista no repositório:

```text
worker/
  WorkerServiceRaMedia/          Worker .NET 8 (RabbitMQ + Redis + FFmpeg)
    Worker.cs
    Services/
      RabbitMqConsumerService.cs
      RedisService.cs              PublishProgressAsync → canal job.progress
      FfmpegTranscodeService.cs
      MediaTranscodeWorkerService.cs
    Models/
      MediaTranscodeJob.cs
      JobProgressEvent.cs
```

### Eventos Redis (contrato previsto)

Inspirado no worker de referência (`RedisChannel.Literal("job.progress")`):

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

Canais: `job.progress`, `job.completed`, `job.failed`. O frontend assina via SSE exposto pela API Next.js (bridge Redis → browser).

---

## Stack por camada

### Frontend / API (este repositório — `D:\ra`)

| Camada          | Tecnologia                                   |
| --------------- | -------------------------------------------- |
| Framework       | Next.js 15, App Router, React 19, TypeScript |
| Auth            | Auth.js / NextAuth v5 (JWT + Credentials)    |
| ORM             | Prisma + PostgreSQL                          |
| UI              | Tailwind v4, shadcn/ui, lucide-react, sonner |
| Forms           | react-hook-form + Zod                        |
| Data            | TanStack Query, axios, TanStack Table        |
| Players         | hls.js (vídeo HLS), HTML5 audio (MP3)        |
| Realtime        | SSE ou WebSocket (bridge Redis)              |
| Estado UI       | Zustand                                      |
| Observabilidade | Sentry + Pino                                |

### Worker de mídia (a implementar — `worker/`)

| Camada            | Tecnologia                        |
| ----------------- | --------------------------------- |
| Runtime           | .NET 8 Worker Service             |
| Fila              | RabbitMQ 6.8.x                    |
| Progresso / cache | Redis (StackExchange.Redis 2.8.x) |
| Transcoding       | FFmpeg (CLI via Process)          |
| Logs              | Serilog                           |
| Métricas          | prometheus-net (opcional)         |

### Infraestrutura (Docker Compose — visão alvo)

| Serviço             | Porta host | Função                          |
| ------------------- | ---------- | ------------------------------- |
| Next.js             | **14001**  | App + API                       |
| PostgreSQL          | **14002**  | Metadados, jobs, usuários       |
| Prisma Studio       | **14003**  | Inspeção do banco (dev)         |
| RabbitMQ AMQP       | **14004**  | Fila de conversão               |
| RabbitMQ Management | **14005**  | UI admin da fila (dev)          |
| Redis               | **14006**  | Pub/sub de progresso + cache    |
| MinIO API           | **14007**  | Object storage (S3-compatible)  |
| MinIO Console       | **14008**  | UI do storage (dev)             |
| Nginx               | **14009**  | Serve HLS (.m3u8/.ts) e MP3     |
| Worker metrics      | **14010**  | Prometheus do worker (opcional) |
| Mailhog SMTP        | **14011**  | E-mail em dev (esqueci senha)   |
| Mailhog UI          | **14012**  | Inbox local de e-mails (dev)    |

Todas as portas ficam no range **14001–15000**. Constantes em `src/config/ports.ts`. **No Compose hoje:** Postgres, app, RabbitMQ, Redis, MinIO e Mailhog. **Pendente:** Nginx e worker.

Storage em produção pode ser **S3**, **Cloudflare R2** ou **MinIO** — a API e o worker falam S3-compatible API; em dev, MinIO ou volume Docker.

---

## Estado Atual (v0.2 — pipeline parcial)

A base web e as **fases iniciais do pipeline de mídia** estão implementadas: upload → MinIO → fila RabbitMQ, UI de biblioteca por séries e fila de processamento. Falta o **worker .NET**, **SSE/Redis** e **Nginx/HLS** para jobs saírem de `processing` e o playback de vídeo ficar completo.

### Já implementado

- Autenticação completa (sign-in, sign-up, JWT, roles `USER`/`ADMIN`)
- Esqueci minha senha + reset + troca de senha no perfil (Mailhog em dev)
- Layout admin (sidebar, header, mobile nav) com tema egípcio
- Docker Compose: PostgreSQL, app Next.js, RabbitMQ, Redis, MinIO, Mailhog
- Prisma migrations automáticas no startup
- Stack frontend configurada (Query, Table, Zustand, Lexical demo)
- Sentry, Pino, Vitest, Playwright, ESLint, Husky

### Pipeline de mídia — checklist

- [x] Modelos Prisma: `MediaAsset`, `TranscodeJob`, `Series` com status `processing|ready|error`
- [x] API de upload (multipart → MinIO/S3)
- [x] Publicação de job no RabbitMQ após upload
- [x] Docker Compose: RabbitMQ, Redis, MinIO (+ Mailhog para e-mail dev)
- [x] UI de mídia: `/resources`, `/resources/[id]`, `/series`, `/series/[id]`, `/queue`, `/dashboard/upload`
- [x] Séries como coleções (preview de itens na listagem + edição em drawer)
- [x] Fila de processamento (`/queue`) com polling da API
- [x] Player áudio HTML5 (MP3) quando status `ready`
- [ ] Docker Compose: Nginx (HLS/MP3)
- [ ] Worker .NET `WorkerServiceRaMedia` (FFmpeg, padrão WorkerServiceBuscaPrecoIA)
- [ ] Redis pub/sub → SSE no Next.js para progresso live
- [ ] Nginx servindo HLS e MP3
- [ ] Player vídeo (hls.js) — UI com placeholder hoje
- [ ] TanStack Table na biblioteca (listagem atual usa cards + filtros)
- [ ] Gravação no browser (MediaRecorder → upload)

---

## Fluxo de Produto

1. Usuário cria conta e entra no dashboard.
2. Cria séries (coleções), envia MP3/MP4 em `/dashboard/upload` e classifica por série.
3. A API valida, persiste metadados (`processing`), salva o original no MinIO e enfileira o job no RabbitMQ.
4. `/resources`, `/series` e `/queue` exibem status e progresso (polling hoje; SSE/Redis na próxima fase).
5. O worker .NET consome a fila, roda FFmpeg, publica progresso e grava HLS (vídeo) ou finaliza MP3 (áudio).
6. Ao concluir, o banco passa para `ready`; Nginx/storage expõe as URLs de playback.
7. O usuário assiste/ouve no player integrado. O portfolio é privado por padrão; vitrine pública é evolução futura.

---

## Estrutura do Repositório (atual + prevista)

```text
D:\ra/
  src/
    app/(admin)/resources/      Biblioteca de mídia
    app/(admin)/series/         Coleções (séries)
    app/(admin)/queue/          Fila de processamento
    app/api/media/upload/       Upload → MinIO + RabbitMQ
    app/api/series|resources|queue/
  prisma/                       Schema e migrations (MediaAsset, TranscodeJob, Series)
  docker/                       Entrypoints
  worker/                       [pendente] WorkerServiceRaMedia (.NET 8)
  nginx/                        [pendente] conf para HLS/MP3
  docker-compose.yml            Postgres, app, RabbitMQ, Redis, MinIO, Mailhog
  docker-compose.media.yml      [futuro] overlay Nginx + worker
```

---

## Como Executar (base atual)

### Pré-requisitos

- Node.js 22+
- Docker + Docker Compose
- (futuro) .NET SDK 8 para o worker
- (futuro) FFmpeg na imagem do worker

### 1. Variáveis de ambiente

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

### 2. Desenvolvimento (recomendado — hot reload)

Para codar, testar UI e usar Playwright MCP, rode a app **localmente** e só o Postgres no Docker:

```bash
npm run docker:db    # Postgres na 14002
docker compose stop app   # se a app Docker estiver rodando
npm run dev          # http://localhost:14001
```

| Serviço             | URL                    |
| ------------------- | ---------------------- |
| App (local)         | http://localhost:14001 |
| PostgreSQL (Docker) | localhost:14002        |

### 3. Docker completo (validar infra)

```bash
npm run docker:up
```

Use quando precisar testar o Compose/entrypoint — não para iterar frontend (sem hot reload eficiente).

### 4. Validação

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

PowerShell quebra em `D:\ra` por causa de `\r` — use `cmd /c`.

---

## Decisões Arquiteturais

- **Vídeo sempre em HLS** após upload — MP4 original é entrada; playback no browser usa `.m3u8`.
- **Fila RabbitMQ** desacopla upload (rápido) de transcode (lento/CPU-bound).
- **Redis Pub/Sub** para progresso — mesmo padrão do `WorkerServiceBuscaPrecoIA`; não bloquear o worker com polling do frontend.
- **Worker em .NET 8**, não Node — FFmpeg em processo longo, Serilog maduro, reuso do template RabbitMQ+Redis já validado em produção.
- **Nginx** na frente dos segmentos HLS — cache, range requests, MIME types corretos para `.m3u8`/`.ts`.
- **Object storage** (MinIO/S3) — originals e outputs; banco guarda apenas metadados e URLs.
- **Status no PostgreSQL** é fonte de verdade; Redis é transporte efêmero de eventos.
- **Portas 14001–15000** em todos os serviços expostos no host.
- **UI pt-BR**, tema egípcio preservado em novas telas.

---

## Documentação para Agentes

- [`AGENT.md`](./AGENT.md) — instruções operacionais para qualquer agente de IA
- [`CLAUDE.md`](./CLAUDE.md) — guia detalhado para Claude Code / Cursor

Leia antes de implementar o pipeline de mídia, o worker .NET ou novos serviços no Compose.

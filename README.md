<p align="center">
  <strong style="font-size: 2.5rem; letter-spacing: 0.3em; font-family: serif;">☀ RA</strong>
  <br />
  <em>Deus do Sol · Portfolio de Mídia</em>
</p>

**Ra** é um projeto de **portfolio pessoal** onde o usuário grava ou envia **músicas (MP3)** e **vídeos (MP4)**, acompanha o processamento em tempo real e assiste ao próprio conteúdo no navegador. A identidade visual é egípcia — lapis, ouro e papiro — em homenagem ao deus do sol.

O diferencial arquitetural e um **pipeline assincrono de midia**: upload pela API Next.js, armazenamento em object storage, fila de conversao com RabbitMQ, worker .NET com FFmpeg gerando **HLS para audio e video**, cover automatico de video, entrega via **Nginx** e reproducao no frontend com **hls.js**. Progresso do job e publicado em **Redis** e exibido ao usuario em **tempo real** durante a conversao.

Projeto construído como demonstração de portfolio com foco em arquitetura distribuída, UX de processamento transparente e base web production-ready.

---

## Ideia Central

O usuário não apenas “sobe um arquivo”. Ele inicia um **job de mídia** cujo ciclo de vida é rastreável:

| Status       | Significado                                                               |
| ------------ | ------------------------------------------------------------------------- |
| `processing` | Arquivo recebido; worker convertendo (FFmpeg)                             |
| `ready`      | HLS gerado (audio/video), cover de video disponivel; pronto para playback |
| `error`      | Falha na conversão, upload ou storage                                     |

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
    │  audio/video: outputs/{userId}/{jobId}/index.m3u8 + *.ts
    │
    ▼
Worker atualiza API / PostgreSQL
    │  status: ready | error
    │  urls HLS, duracao, cover de video
    │
    ▼
Nginx
    │  serve .m3u8, segmentos .ts e covers com cache
    │  (CORS e paths alinhados ao player)
    │
    ▼
Frontend (dashboard)
    │  biblioteca de mídia (TanStack Table)
    │  player video: hls.js
    │  player audio: hls.js anexado ao elemento audio
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

### Fluxo de audio (MP3 -> HLS)

```text
MP3/WebM (upload ou gravacao)
        ↓
   FFmpeg gera HLS audio-only (AAC + .m3u8 + .ts)
        ↓
   Storage (playlist + segmentos)
        ↓
   Nginx
        ↓
   Player audio HLS no dashboard
```

Videos e audios passam por conversao HLS para streaming no browser. Videos tambem geram `cover.jpg` automaticamente para listagens e detalhes.

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
              │ Worker .NET 10      │──────────────┘
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
│ HLS output  │ │ + covers    │ │             │
└─────────────┘ └─────────────┘ └─────────────┘
```

---

## Worker .NET (referência e versões)

O worker de transcodificação é um **.NET 10 Worker Service**, espelhando o padrão de arquitetura de `D:\globalleitorpdf\globalleitorpdf\WorkerServiceBuscaPrecoIA`:

- `BackgroundService` + consumer RabbitMQ (`IRabbitMqConsumerService`)
- Processamento em `IMediaTranscodeWorkerService` (equivalente ao `IPriceSearchWorkerService`)
- Progresso via `IRedisService.PublishProgressAsync` nos canais Redis
- Atualização de status final no PostgreSQL via API Next.js ou acesso direto
- Logs estruturados com **Serilog**; métricas opcionais com **prometheus-net**

### Pacotes principais do worker

| Pacote                                       | Versão        |
| -------------------------------------------- | ------------- |
| TargetFramework                              | `net10.0`     |
| Microsoft.Extensions.Hosting                 | 10.0.9        |
| Microsoft.Extensions.Hosting.WindowsServices | 10.0.9        |
| Microsoft.Extensions.Http                    | 10.0.9        |
| RabbitMQ.Client                              | 6.8.1         |
| StackExchange.Redis                          | 2.8.16        |
| Newtonsoft.Json                              | 13.0.4        |
| Serilog                                      | 4.3.1         |
| Serilog.Extensions.Hosting                   | 10.0.0        |
| Serilog.Sinks.Console / File                 | 6.1.1 / 6.0.0 |
| prometheus-net                               | 8.2.1         |

Estrutura prevista no repositório:

```text
worker/
  WorkerServiceRaMedia/          Worker .NET 10 (RabbitMQ + Redis + FFmpeg)
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

| Camada          | Tecnologia                                       |
| --------------- | ------------------------------------------------ |
| Framework       | Next.js 16.2.9, App Router, React 19, TypeScript |
| Auth            | Auth.js / NextAuth v5 (JWT + Credentials)        |
| ORM             | Prisma + PostgreSQL                              |
| UI              | Tailwind v4, shadcn/ui, lucide-react, sonner     |
| Forms           | react-hook-form + Zod                            |
| Data            | TanStack Query, axios, TanStack Table            |
| Players         | hls.js (audio e video HLS)                       |
| Realtime        | SSE ou WebSocket (bridge Redis)                  |
| Estado UI       | Zustand                                          |
| Observabilidade | Sentry + Pino                                    |

### Worker de midia (`worker/`)

| Camada            | Tecnologia                        |
| ----------------- | --------------------------------- |
| Runtime           | .NET 10 Worker Service            |
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
| Nginx               | **14009**  | Serve HLS (.m3u8/.ts) e covers  |
| Worker metrics      | **14010**  | Prometheus do worker (opcional) |
| Mailhog SMTP        | **14011**  | E-mail em dev (esqueci senha)   |
| Mailhog UI          | **14012**  | Inbox local de e-mails (dev)    |

Todas as portas ficam no range **14001-15000**. Constantes em `src/config/ports.ts`. **No Compose hoje:** Postgres, app, RabbitMQ, Redis, MinIO, Nginx, Mailhog e worker .NET.

Storage em produção pode ser **S3**, **Cloudflare R2** ou **MinIO** — a API e o worker falam S3-compatible API; em dev, MinIO ou volume Docker.

---

## Estado Atual (v1.0 - pipeline completo)

A base web e o **pipeline de midia end-to-end** estao implementados: upload/gravacao -> MinIO -> fila RabbitMQ -> worker .NET/FFmpeg -> Redis/SSE -> Nginx/HLS -> player no navegador. Jobs saem de `processing` para `ready`/`error` pelo callback interno do worker.

### Já implementado

- Autenticação completa (sign-in, sign-up, JWT, roles `USER`/`ADMIN`)
- Esqueci minha senha + reset + troca de senha no perfil (Mailhog em dev)
- Layout admin (sidebar, header, mobile nav) com tema egípcio
- Docker Compose: PostgreSQL, app Next.js, RabbitMQ, Redis, MinIO, Nginx, Mailhog e worker .NET
- Prisma migrations automáticas no startup
- Stack frontend configurada (Query, Table, Zustand, Lexical demo)
- Sentry, Pino, Vitest, Playwright, ESLint, Husky

### Pipeline de mídia — checklist 100% concluido

- [x] Modelos Prisma: `MediaAsset`, `TranscodeJob`, `Series`, `Playlist` e `PlaylistItem`
- [x] API de upload (multipart → MinIO/S3)
- [x] Publicação de job no RabbitMQ após upload
- [x] Docker Compose: RabbitMQ, Redis, MinIO (+ Mailhog para e-mail dev)
- [x] UI de mídia: `/resources`, `/resources/[id]`, `/series`, `/series/[id]`, `/playlists`, `/playlists/[id]`, `/queue`, `/dashboard/upload`
- [x] Séries como coleções (preview de itens na listagem + edição em drawer)
- [x] Playlists pessoais com reproducao sequencial no mini-player persistente
- [x] Playlist especial `Favoritas` com botao de estrela nas rotas que exibem recursos
- [x] Ações em lote na biblioteca: organizar em serie, adicionar a playlist e excluir selecionados
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

1. Usuário cria conta e entra no dashboard.
2. Cria séries (coleções) e playlists, envia MP3/MP4 em `/dashboard/upload` e classifica por série.
3. A API valida, persiste metadados (`processing`), salva o original no MinIO e enfileira o job no RabbitMQ.
4. `/resources`, `/series`, `/playlists` e `/queue` exibem status e progresso em tempo real via SSE/Redis.
5. O worker .NET consome a fila, roda FFmpeg, publica progresso, grava HLS para audio/video e gera cover automatico para video.
6. Ao concluir, o banco passa para `ready`; Nginx/storage expõe as URLs de playback.
7. O usuário assiste/ouve no player integrado ou no mini-player persistente, incluindo sequencia de series/playlists. O portfolio é privado por padrão; vitrine pública é evolução futura.

---

## Estrutura do Repositório (atual + prevista)

```text
D:\ra/
  src/
    app/(admin)/resources/      Biblioteca de mídia
    app/(admin)/series/         Coleções (séries)
    app/(admin)/playlists/      Playlists pessoais
    app/(admin)/queue/          Fila de processamento
    app/api/media/upload/       Upload → MinIO + RabbitMQ
    app/api/series|playlists|resources|queue/
  prisma/                       Schema e migrations (MediaAsset, TranscodeJob, Series, Playlist)
  docker/                       Entrypoints
  worker/                       WorkerServiceRaMedia (.NET 10)
  nginx/                        conf para HLS/covers
  docker-compose.yml            Postgres, app, RabbitMQ, Redis, MinIO, Nginx, Mailhog, worker
```

---

## Como Executar (base atual)

### Pré-requisitos

- Node.js 22+
- Docker + Docker Compose
- .NET SDK 10 para desenvolver/testar o worker localmente
- FFmpeg na imagem Docker do worker

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

- **Audio e video sempre em HLS** apos upload — MP3/MP4/WebM originals sao entrada; playback no browser usa `.m3u8`.
- **Fila RabbitMQ** desacopla upload (rápido) de transcode (lento/CPU-bound).
- **Redis Pub/Sub** para progresso — mesmo padrão do `WorkerServiceBuscaPrecoIA`; não bloquear o worker com polling do frontend.
- **Worker em .NET 10**, não Node — FFmpeg em processo longo, Serilog maduro, reuso do template RabbitMQ+Redis já validado em produção.
- **Nginx** na frente dos segmentos HLS e covers — cache, range requests, MIME types corretos para `.m3u8`/`.ts`/`.jpg`.
- **Object storage** (MinIO/S3) — originals e outputs; banco guarda apenas metadados e URLs.
- **Status no PostgreSQL** é fonte de verdade; Redis é transporte efêmero de eventos.
- **Portas 14001–15000** em todos os serviços expostos no host.
- **UI pt-BR**, tema egípcio preservado em novas telas.

---

## Documentação para Agentes

- [`AGENT.md`](./AGENT.md) — instruções operacionais para qualquer agente de IA
- [`CLAUDE.md`](./CLAUDE.md) — guia detalhado para Claude Code / Cursor

Leia antes de implementar o pipeline de mídia, o worker .NET ou novos serviços no Compose.

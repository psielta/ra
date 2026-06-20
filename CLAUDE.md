# CLAUDE.md — Guia para Claude neste repositório

Documentação de contexto para agentes Claude (Claude Code, Cursor, etc.) trabalhando no projeto **Ra**.

## O que é este projeto

**Ra** é um portfolio pessoal de **música (MP3 → HLS)** e **vídeo (MP4 → HLS)**. Pipeline atual: upload via Next.js → Storage (MinIO/S3) → fila RabbitMQ → worker .NET com FFmpeg → HLS no storage → Nginx → playback com hls.js. A biblioteca tem recursos, séries, playlists pessoais com reprodução sequencial, playlist especial `Favoritas` via estrela, ações em lote e mini-player persistente. Progresso do job em tempo real via Redis pub/sub (padrão do `WorkerServiceBuscaPrecoIA`).

Idioma da UI e copy: **pt-BR**.

## Stack

| Camada             | Tecnologia                                                  |
| ------------------ | ----------------------------------------------------------- |
| Framework          | Next.js 16.2.9 (App Router, Turbopack, `src/`)              |
| Auth               | Auth.js / NextAuth v5 (JWT + Credentials)                   |
| ORM / DB           | Prisma + PostgreSQL                                         |
| UI                 | Tailwind CSS v4, shadcn/ui (new-york), lucide-react, sonner |
| Forms              | react-hook-form + zod                                       |
| Data fetching      | TanStack Query + axios                                      |
| Tables             | TanStack Table (`src/components/data-table/`)               |
| Editor             | Lexical (`src/components/editor/lexical-editor.tsx`)        |
| Estado local       | Zustand (`src/stores/ui-store.ts`)                          |
| Observabilidade    | Sentry + Pino (logs estruturados)                           |
| Testes             | Vitest, Playwright, Testing Library                         |
| Qualidade          | ESLint, Prettier, Husky, lint-staged                        |
| Infra              | Docker Compose                                              |
| Fila               | RabbitMQ (jobs de transcode)                                |
| Progresso realtime | Redis Pub/Sub → SSE no Next.js                              |
| Storage            | MinIO / S3 (originals + HLS/covers)                         |
| Entrega mídia      | Nginx (`.m3u8`, `.ts`, covers)                              |
| Worker             | .NET 10 + FFmpeg (`worker/WorkerServiceRaMedia`)            |
| Player vídeo       | hls.js                                                      |
| Player áudio       | hls.js anexado ao `<audio>`                                 |

Leia [`README.md`](./README.md) para diagramas e decisões arquiteturais completas.

## Pipeline de mídia

```text
Upload → Storage → RabbitMQ → Worker .NET (FFmpeg) → HLS/covers → Storage
                                    ↓ Redis (job.progress|completed|failed)
PostgreSQL (processing|ready|error) ←── SSE → Frontend (barra de progresso + player)
Nginx serve HLS/covers → hls.js
```

Referência de worker: `D:\globalleitorpdf\globalleitorpdf\WorkerServiceBuscaPrecoIA`

- .NET 10, RabbitMQ.Client 6.8.1, StackExchange.Redis 2.8.16, Serilog 4.3.1
- `IRedisService.PublishProgressAsync` → canal `job.progress`

**Regras:** FFmpeg nunca no Next.js. Áudio e vídeo sempre HLS no playback. PostgreSQL = status/listas; Redis = progresso efêmero. Playlists e séries devem tocar pelo mini-player persistente quando o usuário iniciar playback fora de `/resources/[id]`.

## Portas — REGRA OBRIGATÓRIA

**Todas as portas expostas no host devem ficar entre 14001 e 15000** para evitar conflitos.

| Serviço             | Porta host | Constante                  |
| ------------------- | ---------- | -------------------------- |
| App Next.js         | 14001      | `PORTS.app`                |
| PostgreSQL          | 14002      | `PORTS.postgres`           |
| Prisma Studio       | 14003      | `PORTS.prismaStudio`       |
| RabbitMQ AMQP       | 14004      | `PORTS.rabbitmq`           |
| RabbitMQ Management | 14005      | `PORTS.rabbitmqManagement` |
| Redis               | 14006      | `PORTS.redis`              |
| MinIO API           | 14007      | `PORTS.minio`              |
| MinIO Console       | 14008      | `PORTS.minioConsole`       |
| Nginx (HLS/covers)  | 14009      | `PORTS.nginx`              |
| Worker Prometheus   | 14010      | `PORTS.workerMetrics`      |

Definição central: `src/config/ports.ts`.

Dentro dos containers Docker a app usa porta `3000` e o Postgres `5432` — apenas o mapeamento externo segue o range acima.

**Nunca** usar portas padrão (3000, 5432) em URLs de host, `.env`, Playwright ou documentação deste projeto.

## Ambiente de desenvolvimento

### Pré-requisitos

- Node.js 22+
- Docker + Docker Compose (Postgres, RabbitMQ, Redis, MinIO, Nginx, Mailhog e worker)
- Copiar `.env.example` → `.env`

### Modo dev — padrão ao codar e testar

**Use este modo** ao alterar frontend, validar UI manualmente ou testar com **Playwright / Playwright MCP**. Hot reload com Turbopack.

```bash
npm run docker:db           # Postgres na 14002
docker compose stop app     # liberar porta 14001 se app Docker estiver up
npm run dev                 # http://localhost:14001
```

Não rode `docker compose up app` e `npm run dev` juntos — ambos disputam a porta **14001**.

### Modo Docker completo — validar infra/Compose

```bash
npm run docker:dev        # foreground — app + postgres no container
npm run docker:up         # background
npm run docker:down
npm run docker:logs
```

Sem hot reload eficiente. Preferir apenas para testar entrypoint, imagem ou antes de deploy — não para iterar UI.

### Comandos essenciais

```bash
# Dev local (padrão)
npm run docker:db
npm run dev               # http://localhost:14001

# Docker completo (infra)
npm run docker:dev
npm run docker:up
npm run docker:down
npm run docker:logs

# Qualidade
npm run typecheck
npm run lint
npm run test              # Vitest
npm run test:e2e          # Playwright (app em 14001)

# Banco
npm run db:migrate        # prisma migrate dev
npm run db:studio         # porta 14003
npm run docker:migrate    # migrate dentro do container

# Produção
npm run build
npm run docker:build:prod
npm run docker:up:prod
```

### Windows — atenção ao shell

O workspace fica em `D:\ra`. Em PowerShell, `\r` no caminho quebra parsing. **Use `cmd /c`** para comandos:

```bat
cmd /c "cd /d D:\ra && npm run docker:up"
```

## Estrutura de diretórios

```
src/
├── app/
│   ├── (auth)/sign-in, sign-up     # Páginas públicas de auth
│   ├── (admin)/dashboard/          # Rotas protegidas + layout admin
│   │   ├── layout.tsx              # Guard server-side + AdminShell
│   │   ├── page.tsx                # Dashboard home
│   │   ├── users/, papyri/, settings/  # Placeholders de módulos
│   └── api/
│       ├── auth/[...nextauth]/     # Auth.js handlers
│       └── auth/register/          # POST signup
├── auth.ts                         # Config completa Auth.js (Node)
├── auth.config.ts                  # Config compartilhada do Auth.js para proxy
├── proxy.ts                        # Proteção de rotas (Next.js 16)
├── components/
│   ├── admin/                      # Sidebar, header, shell
│   ├── auth/                       # Forms e layout de auth
│   ├── brand/                      # RaLogo
│   ├── data-table/                 # TanStack Table base
│   ├── editor/                     # Lexical
│   └── ui/                         # shadcn/ui
├── config/ports.ts
├── lib/
│   ├── prisma.ts                   # Singleton Prisma
│   ├── logger.ts                   # Pino estruturado
│   ├── axios.ts                    # Cliente HTTP (/api)
│   ├── utils.ts                    # cn()
│   └── validations/                # Schemas Zod
├── providers/                      # Session + Query
├── stores/                         # Zustand
└── types/next-auth.d.ts            # Extensões de sessão

prisma/
├── schema.prisma
└── migrations/

docker/                             # Entrypoints
e2e/                                # Playwright

# Pipeline de mídia:
worker/WorkerServiceRaMedia/       # .NET 10 — RabbitMQ + Redis + FFmpeg
nginx/                              # Serve HLS e covers
src/app/(admin)/resources/          # Biblioteca do usuário
src/app/api/media/                  # upload, jobs, SSE
src/components/media/               # upload UI, player HLS, progress
```

## Arquitetura de autenticação

```
Sign-up:  Form → POST /api/auth/register → bcrypt hash → Prisma User
Sign-in:  Form → signIn("credentials") → auth.ts authorize() → JWT session
Guard:    proxy (auth.config.ts) + layout server-side redirect
```

Pontos importantes:

- **`auth.config.ts`** — configuração compartilhada usada pelo proxy. Sem Prisma/bcrypt.
- **`auth.ts`** — providers, adapter Prisma, callbacks JWT/session, logging.
- Sessão JWT com `id` e `role` no token (ver `src/types/next-auth.d.ts`).
- Rotas protegidas: `/dashboard/*`, `/admin/*`.
- Rotas de auth: `/sign-in`, `/sign-up` (redireciona se já logado).

Ao adicionar nova rota protegida, atualizar **ambos**:

1. `src/auth.config.ts` → callback `authorized`
2. `src/proxy.ts` → `matcher`

## Tema visual (egípcio)

Paleta e tokens em `src/app/globals.css`:

- **Lapis** (`--lapis`, `--accent`) — azul profundo, sidebar
- **Gold** (`--gold`, `--primary`) — ouro solar, acentos
- **Papyrus** — fundos quentes
- Tipografia display: **Cinzel** (`font-display`)
- Body: **Source Sans 3**

Utilitários CSS: `.egyptian-pattern`, `.sun-disk`, `.hieroglyph-border`.

Ao criar UI nova:

- Reutilizar componentes shadcn em `src/components/ui/`
- Manter bordas `border-gold/15` ou `border-gold/20` em cards admin
- Usar `RaLogo` para branding
- Não introduzir paletas genéricas (roxo gradiente, Inter, etc.)

## Convenções de código

### Geral

- TypeScript strict; alias `@/*` → `src/*`
- Componentes client: `"use client"` no topo
- Validação de input: sempre Zod em `src/lib/validations/`
- API routes: logs estruturados via `createRequestLogger()` de `src/lib/logger.ts`
- Erros de API: `{ message: string }` com status HTTP correto
- Copy da UI em pt-BR, tom direto e funcional

### Novos componentes shadcn

```bash
npx shadcn@latest add <component>
```

Config em `components.json`. Ícones: lucide-react.

### Nova rota admin

1. Criar `src/app/(admin)/dashboard/<modulo>/page.tsx`
2. Adicionar item em `navItems` em `src/components/admin/admin-sidebar.tsx`
3. Se protegida por role no futuro, estender `authorized` em `auth.config.ts`

### Nova API route

1. Criar `src/app/api/<rota>/route.ts`
2. Validar body com Zod
3. Logar eventos com pino (`event: "modulo.acao"`)
4. Usar `prisma` de `@/lib/prisma` (nunca instanciar novo client)

### Nova migration Prisma

1. Editar `prisma/schema.prisma`
2. `npm run db:migrate` (local) ou `npm run docker:migrate` (container)
3. Commitar pasta `prisma/migrations/`

### Upload e job de mídia

1. Modelos `MediaAsset` + `TranscodeJob` com `status: processing | ready | error`
2. `POST /api/media/upload` — multipart, sessão, Zod, salva no MinIO/S3
3. Criar job `processing`, publicar RabbitMQ, retornar `jobId` imediatamente
4. SSE em `/api/media/jobs/[id]/events` — bridge Redis → browser
5. UI em `/resources` e `/queue` — biblioteca + progresso em tempo real

### Worker .NET (`worker/`)

1. Espelhar estrutura do `WorkerServiceBuscaPrecoIA` (Worker.cs, RedisService, RabbitMqConsumer)
2. `FfmpegTranscodeService`: MP4 → `index.m3u8` + `.ts`; MP3 → opcional normalização
3. Publicar `job.progress` a cada etapa; `job.completed` / `job.failed` ao final
4. Atualizar PostgreSQL para `ready` ou `error` com URLs de playback

### Player

- Vídeo `ready`: hls.js com URL do Nginx (`PORTS.nginx`) ou storage
- Áudio `ready`: hls.js anexado ao `<audio>` com URL HLS
- `processing`: não renderizar player; mostrar progresso SSE

## Docker

| Arquivo                    | Uso                                |
| -------------------------- | ---------------------------------- |
| `docker-compose.yml`       | Dev: postgres + app com hot reload |
| `docker-compose.prod.yml`  | Overlay produção                   |
| `Dockerfile.dev`           | Imagem desenvolvimento             |
| `Dockerfile`               | Imagem produção                    |
| `docker/entrypoint.dev.sh` | migrate + `npm run dev`            |
| `docker/entrypoint.sh`     | migrate + `npm start`              |

O serviço `app` sobrescreve `DATABASE_URL` para hostname `postgres` (rede interna Docker).

## Testes

- **Unitários**: `src/**/*.test.ts` com Vitest; setup em `src/test/setup.ts`
- **E2E**: `e2e/*.spec.ts` com Playwright; `baseURL` = `http://localhost:14001`
- Rodar `npm run test` antes de finalizar mudanças em validações/utils
- **E2E e Playwright MCP**: app deve estar em `npm run dev` (modo dev local), não no container Docker
- Antes de E2E: `docker compose stop app` + `npm run dev` na 14001

## Observabilidade

- **Sentry**: `src/instrumentation.ts`, `src/instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- Desabilitado quando `SENTRY_DSN` vazio
- **Logs**: Pino com `service: "ra"`; em dev usa `pino-pretty`

## O que NÃO fazer

- Não alterar portas para 3000/5432 no host
- Não importar `auth.ts` (com Prisma) no proxy — usar `auth.config.ts`
- Não criar markdown/docs não solicitados pelo usuário
- Não refatorar código fora do escopo da tarefa
- Não commitar `.env` (apenas `.env.example`)
- Não ignorar Husky/lint-staged em commits
- Não usar mensagens de commit fora do padrão Conventional Commits — ver seção em [`AGENT.md`](./AGENT.md#commits--conventional-commits-obrigatório)
- Não adicionar providers OAuth sem pedido explícito (auth atual é Credentials)
- **Não** rodar FFmpeg no Next.js — transcode é responsabilidade do worker .NET
- **Não** bloquear o upload esperando conversão — resposta imediata com `processing`
- **Não** usar polling no PostgreSQL para progresso — Redis pub/sub + SSE
- **Não** servir MP4 direto como stream principal de vídeo — usar HLS
- **Não** alterar o runtime alvo do worker sem pedido explícito — este repo usa `net10.0`
- **Não** usar `docker:up` para iterar UI — preferir `npm run dev` + `docker:db`
- **Não** deixar app Docker e `npm run dev` rodando ao mesmo tempo (conflito na 14001)

## Checklist antes de entregar

- [ ] Commits em Conventional Commits (`feat`, `fix`, `docs`, etc. + descrição imperativa)
- [ ] `npm run typecheck` passa
- [ ] `npm run lint` sem erros novos
- [ ] `npm run test` passa (se tocou validações)
- [ ] `npm run build` passa (se mudança estrutural)
- [ ] Portas no range 14001–15000 (atualizar `ports.ts` se novo serviço)
- [ ] UI consistente com tema egípcio
- [ ] Logs estruturados em novas API routes
- [ ] (mídia) Job criado com `processing` antes de enfileirar
- [ ] (mídia) Worker publica progresso Redis; frontend usa SSE
- [ ] (mídia) Playback só quando status `ready`

## Referência rápida de URLs

| URL                                      | Acesso       |
| ---------------------------------------- | ------------ |
| http://localhost:14001/sign-in           | Público      |
| http://localhost:14001/sign-up           | Público      |
| http://localhost:14001/dashboard         | Autenticado  |
| http://localhost:14001/api/auth/register | POST público |

## Estado atual

**Pronto:** auth, layout admin, Docker base/prod, tema egípcio, testes e pipeline de mídia end-to-end.

**Pipeline:** upload/gravação, MinIO, RabbitMQ, worker .NET 10/FFmpeg, Redis/SSE, Nginx, HLS para áudio/vídeo, cover automático de vídeo e player com monitor de segmentos.

## Documentação relacionada

- [`README.md`](./README.md) — visão de produto e diagramas
- [`AGENT.md`](./AGENT.md) — contratos RabbitMQ/Redis/Storage e receitas operacionais

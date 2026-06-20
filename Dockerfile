FROM node:22-alpine AS base

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

FROM base AS deps

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN mkdir -p public
RUN npx prisma generate
RUN npm run build

FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev --ignore-scripts \
  && npx prisma generate \
  && npm cache clean --force

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/next.config.ts ./next.config.ts

COPY docker/entrypoint.sh ./docker/entrypoint.sh
RUN chmod +x ./docker/entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker/entrypoint.sh"]
CMD ["npm", "start"]

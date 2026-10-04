FROM node:24-bookworm-slim AS build
WORKDIR /app
# Toolchain só para o caso de better-sqlite3 precisar compilar.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Tema visual (xepa | cordel) é decidido no build.
ARG NEXT_PUBLIC_THEME=xepa
ENV NEXT_PUBLIC_THEME=$NEXT_PUBLIC_THEME
# O build só precisa de um segredo qualquer; o real vem do .env em runtime.
RUN SESSION_SECRET=build-only-build-only-build-only-0000 npm run build \
  && npm prune --omit=dev

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATABASE_PATH=/app/data/casa.db
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/package.json /app/tsconfig.json ./
COPY --from=build /app/src ./src
COPY --from=build /app/drizzle ./drizzle
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && mkdir -p /app/data && chown -R node:node /app
USER node
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]

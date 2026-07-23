# Build context is the repo root (Railway's Docker builder always uses it),
# since this app pulls in sibling libs via "file:../../libs/..." deps.
#
# Node 24+ is required at runtime: the shared libs (@questly/shared-types,
# @questly/lesson-dsl) ship as raw .ts source with no build step, and the
# compiled dist/*.js still `require()` them by package name. That only
# resolves at runtime because Node's built-in TypeScript stripping (stable,
# unflagged since 23.6) loads the .ts file directly — an older Node here
# would crash with "Unexpected token" on the first shared-types import.

FROM node:24-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY libs/shared-types ./libs/shared-types
COPY libs/lesson-dsl ./libs/lesson-dsl
COPY apps/api ./apps/api
WORKDIR /app/apps/api
RUN npm ci
RUN npx prisma generate
RUN npm run build

FROM node:24-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/libs/shared-types ./libs/shared-types
COPY --from=build /app/libs/lesson-dsl ./libs/lesson-dsl
COPY --from=build /app/apps/api/package.json /app/apps/api/package-lock.json ./apps/api/
WORKDIR /app/apps/api
RUN npm ci --omit=dev
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/prisma ./prisma

EXPOSE 3000
CMD ["node", "dist/main.js"]

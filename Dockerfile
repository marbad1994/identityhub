# syntax=docker/dockerfile:1

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Self-hosted Node server output instead of the default Vercel preset.
ENV NITRO_PRESET=node-server
RUN node scripts/with-app-env.mjs vite build

FROM node:22-slim AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080
WORKDIR /app
# Only the migrator needs node_modules; the server bundle is self-contained.
RUN echo '{"type":"module","private":true}' > package.json \
    && npm install --omit=dev --no-audit --no-fund pg@8.23.1 \
    && npm cache clean --force
COPY --from=build /app/.output ./.output
COPY migrations ./migrations
COPY scripts/migrate.mjs scripts/migration-plan.mjs ./scripts/
COPY docker-entrypoint.sh ./
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["./docker-entrypoint.sh"]

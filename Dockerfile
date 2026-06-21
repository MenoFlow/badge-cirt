# --- Stage 1 : build frontend ---
FROM node:20-bookworm-slim AS web
WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Stage 2 : build backend ---
FROM node:20-bookworm-slim AS api
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server ./
RUN npx prisma generate && npm run build

# --- Stage 3 : runtime ---
FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=api /app ./
COPY --from=web /web/dist ../client/dist
COPY --from=web /web/node_modules ../client/node_modules
EXPOSE 3330
CMD ["sh", "-c", "npx prisma db push && npm run prisma:seed && node dist/index.js"]

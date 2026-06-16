# Stage 1: Build the application
FROM oven/bun:1.1-slim AS builder

WORKDIR /app

# Copy root configurations and workspaces lockfile
COPY package.json bun.lock turbo.json ./

# Copy packages' package.json files so workspaces can be resolved by Bun
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies (includes devDependencies for compilation)
RUN bun install

# Copy the API source code
COPY apps/api ./apps/api

# Generate Prisma Client and compile TS to JS
WORKDIR /app/apps/api
RUN bun run prisma generate
RUN bun run build

# Download and warm up the embedding model during build so it is baked into the image.
# This prevents downloading it on startup, which causes delays and timeouts on Render.
RUN bun -e "require('./dist/rag/embeddings').warmup().then(() => console.log('Fastembed model warmed up successfully')).catch(err => { console.error(err); process.exit(1); })"

# Stage 2: Production runner
FROM node:20-slim AS runner

# Install openssl (required for Prisma client) and libgomp1 (required for ONNX Runtime / fastembed)
RUN apt-get update && apt-get install -y openssl ca-certificates libgomp1 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built files, dependencies, and local cache
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/local_cache ./apps/api/local_cache
COPY --from=builder /app/node_modules ./node_modules

# Expose the API port
EXPOSE 8000

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=8000

# Start script: run pending Prisma migrations and start the Express server
WORKDIR /app/apps/api
CMD ["sh", "-c", "npx --no-install prisma migrate deploy && node --max-old-space-size=400 dist/index.js"]

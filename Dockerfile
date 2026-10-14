# ---- Stage 1: Build Frontend and Server ----
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build client + server bundle
COPY . .
RUN npm run build
RUN npx esbuild server/index.ts --bundle --platform=node --format=esm --packages=external --outfile=dist-server/index.js

# ---- Stage 2: Minimal Production Runtime ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy build artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

# Run as non-root user
USER node

EXPOSE 8080

CMD ["node", "dist-server/index.js"]

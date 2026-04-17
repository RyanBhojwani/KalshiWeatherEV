FROM node:20-alpine

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json ./

# Copy shared package
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src

# Copy worker app
COPY apps/worker/package.json ./apps/worker/
COPY apps/worker/tsconfig.json ./apps/worker/
COPY apps/worker/src ./apps/worker/src

# Copy base tsconfig
COPY tsconfig.base.json ./

# Install dependencies
RUN npm ci --workspace=packages/shared --workspace=apps/worker

# Force a clean build of shared (defense against layer-cache staleness)
RUN rm -rf packages/shared/dist apps/worker/dist
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/worker

# Run the built JS directly (bypasses npm start so env-file flags don't fight
# Railway's injected env vars).
CMD ["node", "apps/worker/dist/index.js"]

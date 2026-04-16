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

# Build shared package first, then worker
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/worker

CMD ["node", "apps/worker/dist/index.js"]

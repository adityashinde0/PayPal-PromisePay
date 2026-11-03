FROM node:20-alpine AS base

WORKDIR /app

# Install libc6-compat for Next.js SWC compatibility and curl for healthchecks
RUN apk add --no-cache libc6-compat curl

# Copy dependency manifests and configuration
COPY package.json package-lock.json* .npmrc* ./

# Install dependencies respecting legacy-peer-deps configuration
RUN npm install --legacy-peer-deps

# Copy application source code
COPY . .

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=development
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "run", "dev"]

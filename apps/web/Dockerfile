FROM node:20-alpine AS base

WORKDIR /app

RUN apk add --no-cache libc6-compat curl

COPY package.json package-lock.json* .npmrc* ./
RUN npm install --legacy-peer-deps

COPY . .

# Build production Next.js bundle
RUN npm run build

EXPOSE 8080

ENV PORT=8080
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]

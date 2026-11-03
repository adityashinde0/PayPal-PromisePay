FROM node:20-alpine AS base

WORKDIR /app

RUN apk add --no-cache libc6-compat curl

COPY package.json package-lock.json* .npmrc* ./
RUN npm install --legacy-peer-deps

COPY . .

ARG NEXT_PUBLIC_API_URL=https://promisepay-api.onrender.com
ARG NEXT_PUBLIC_PAYPAL_CLIENT_ID=BAAcPbc0EPk7_mH3sIOg_D9T0NInRRl5CYvLSrmVcIxSF0VxALdJ4NEL6iDjTQzXOZpFJwZ1hCbCaOUHvc

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_PAYPAL_CLIENT_ID=$NEXT_PUBLIC_PAYPAL_CLIENT_ID

# Build production Next.js bundle
RUN npm run build

EXPOSE 8080

ENV PORT=8080
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]

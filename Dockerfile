FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY public ./public
COPY selfhost ./selfhost
COPY vite.selfhost.config.ts ./
RUN npm run build:selfhost

FROM node:24-alpine
WORKDIR /app
COPY --from=build --chown=node:node /app/dist-selfhost ./dist-selfhost
COPY --chown=node:node scripts/serve-selfhost.mjs ./scripts/serve-selfhost.mjs
ENV HOST=0.0.0.0 PORT=3001
USER node
EXPOSE 3001
CMD ["node", "scripts/serve-selfhost.mjs"]

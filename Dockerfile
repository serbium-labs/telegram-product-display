FROM node:24-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build

COPY . .
RUN npm run build

FROM node:24-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/data ./data

USER node

EXPOSE 3000

CMD ["node", "dist-server/server/index.js"]

FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production --legacy-peer-deps

COPY --from=builder /app/dist ./dist

ENV PORT=5000
ENV NODE_ENV=production
ENV DB_PATH=/app/data/notes.db

EXPOSE 5000

CMD ["node", "dist/server.js"]

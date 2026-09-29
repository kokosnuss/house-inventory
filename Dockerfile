FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY public/ ./public/

RUN mkdir -p /data

ENV PORT=3000
ENV DATA_DIR=/data

VOLUME ["/data"]

EXPOSE 3000

USER node

CMD ["node", "server.js"]

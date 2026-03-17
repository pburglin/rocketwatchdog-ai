FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* tsconfig.json /app/

RUN npm install

COPY src /app/src
COPY config /app/config
COPY schemas /app/schemas

RUN npm run build

EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]

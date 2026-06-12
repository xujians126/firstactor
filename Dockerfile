FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build --if-present

EXPOSE 3000

CMD ["npx", "tsx", "index.ts"]

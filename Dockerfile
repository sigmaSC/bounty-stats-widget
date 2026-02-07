FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json ./
RUN bun install --production

COPY index.ts ./

ENV PORT=3000
EXPOSE 3000

CMD ["bun", "run", "index.ts"]

FROM oven/bun:latest

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile
RUN cd apps/api && bun run build

CMD cd apps/api && bun run start
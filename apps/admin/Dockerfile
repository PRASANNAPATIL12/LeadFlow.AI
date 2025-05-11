FROM node:18-alpine

WORKDIR /app

COPY . .

RUN corepack enable
RUN pnpm install --frozen-lockfile
RUN cd apps/admin && pnpm run build

CMD cd apps/admin && pnpm run start

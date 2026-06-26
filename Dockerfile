FROM node:22.13.1-slim@sha256:83fdfa2a4de32d7f8d79829ea259bd6a4821f8b2d123204ac467fbe3966450fc AS builder
WORKDIR /app
COPY . .
RUN yarn install --frozen-lockfile
RUN yarn generate
RUN yarn build

FROM node:22.13.1-slim@sha256:83fdfa2a4de32d7f8d79829ea259bd6a4821f8b2d123204ac467fbe3966450fc AS production
WORKDIR /app
COPY --from=builder ./app/dist ./dist
COPY package* ./
COPY tsconfig* ./
RUN yarn install --production --frozen-lockfile
RUN rm -rf dist/__test__
EXPOSE 3000

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
RUN chown -R appuser:appgroup /app
USER appuser:appgroup

CMD [ "yarn", "start" ]
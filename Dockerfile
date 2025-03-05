FROM node:18.13.0-alpine@sha256:fda98168118e5a8f4269efca4101ee51dd5c75c0fe56d8eb6fad80455c2f5827 AS builder
WORKDIR /app
COPY . .
RUN yarn install --frozen-lockfile
RUN yarn generate
RUN yarn build

FROM node:18.13.0-alpine@sha256:fda98168118e5a8f4269efca4101ee51dd5c75c0fe56d8eb6fad80455c2f5827 AS production
WORKDIR /app
RUN apk add --no-cache nss freetype harfbuzz ca-certificates udev chromium
COPY --from=builder ./app/dist ./dist
COPY package* ./
COPY tsconfig* ./
RUN yarn install --production --frozen-lockfile
RUN rm -rf dist/__test__
EXPOSE 3000
CMD [ "yarn", "start" ]
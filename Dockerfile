FROM node:20.18.2-alpine AS builder
WORKDIR /app
COPY . .
RUN yarn install --frozen-lockfile
RUN yarn generate
RUN yarn build

FROM node:20.18.2-alpine AS production
WORKDIR /app
RUN apk add --no-cache nss freetype harfbuzz ca-certificates udev chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
COPY --from=builder ./app/dist ./dist
COPY package* ./
COPY tsconfig* ./
RUN yarn install --production --frozen-lockfile
RUN rm -rf dist/__test__
EXPOSE 3000
CMD [ "yarn", "start" ]

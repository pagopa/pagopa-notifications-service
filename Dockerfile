FROM node:14.16.0-alpine AS builder
WORKDIR /app
COPY . .
RUN yarn
RUN yarn generate
RUN yarn build

FROM node:14.16.0-alpine AS production
WORKDIR /app
RUN apk add --no-cache nss freetype harfbuzz ca-certificates udev chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
COPY --from=builder ./app/dist ./dist
COPY package* ./
COPY tsconfig* ./
RUN yarn install --production
RUN rm -rf dist/__test__
EXPOSE 3000
CMD [ "yarn", "start" ]

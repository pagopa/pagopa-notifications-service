FROM node:22.13.1-slim AS builder
WORKDIR /app
COPY . .
RUN yarn install --frozen-lockfile
RUN yarn generate
RUN yarn build

FROM node:22.13.1-slim AS production
WORKDIR /app
COPY --from=builder ./app/dist ./dist
COPY package* ./
COPY tsconfig* ./
RUN yarn install --production --frozen-lockfile
RUN rm -rf dist/__test__
EXPOSE 3000
CMD [ "yarn", "start" ]
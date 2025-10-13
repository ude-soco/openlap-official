# syntax=docker/dockerfile:1.6
FROM node:23.10-slim AS build

WORKDIR /app
ENV PATH="$PATH:/app/node_modules/.bin"
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

COPY package*.json .
RUN  --mount=type=cache,target=/app/.npm,rw \
     npm install --cache=/app/.npm --prefer-offline --no-audit --no-fund

COPY . .
ENV  NODE_ENV=production
ARG  VITE_EMAIL_PUBLIC_KEY
ARG  VITE_EMAIL_SERVICE_ID
ARG  VITE_EMAIL_TEMPLATE_ID
RUN  --mount=type=cache,target=/app/node_modules/.cache,rw \
     npm run build



FROM nginxinc/nginx-unprivileged:1.29.2-alpine

USER root
WORKDIR /usr/share/nginx/html
RUN chown -R nginx:nginx .

USER 101
COPY --link --from=build --chown=101 /app/dist/webapp/ ./
COPY --link ./nginx/conf.d/* /etc/nginx/conf.d/

ENV NGINX_ENTRYPOINT_QUIET_LOGS=1
EXPOSE 8080

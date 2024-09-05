# syntax=docker/dockerfile:1.6
FROM node:8-stretch

WORKDIR /opt/learninglocker

ENV NODE_ENV production
ENV NPM_CONFIG_UPDATE_NOTIFIER false

ENV REPO=https://github.com/LearningLocker/learninglocker.git
ENV VERSION=v7.1.1
RUN git clone --branch $VERSION --depth 1 $REPO .
RUN yarn install && yarn build-all

# syntax=docker/dockerfile:1.5
FROM maven:3.10.0-eclipse-temurin-25@sha256:a4734fd7909a9c2beddcacfa1229bd308a349f000bea1ec8db3287c8a16ca2a3 AS build
WORKDIR /opt/app

ADD pom.xml .
RUN --mount=type=cache,target=/root/.m2 \
  MAVEN_OPTS="-XX:+TieredCompilation -XX:TieredStopAtLevel=1" \
  /usr/local/bin/mvn-entrypoint.sh mvn verify clean --fail-never

ADD . .
ARG PACKAGE_NAME=analyticsframework
ARG SEMANTIC_SEARCH=false
RUN --mount=type=cache,target=/root/.m2 \
  if [ "$SEMANTIC_SEARCH" = true ]; then set -- -Psemantic-search; fi && \
  mvn "$@" package -DfinalName=${PACKAGE_NAME}


FROM amazoncorretto:25.0.5@sha256:288b5647146a21027688b52cc23d802ee6badb6f28632111b606b79262d9fc5f
WORKDIR /opt/app

ARG PACKAGE_NAME=analyticsframework
ENV JAR=${PACKAGE_NAME}.jar
COPY --from=build /opt/app/target/${JAR} .

ENV DATA_DIR="/opt/app/data"
ENV DJL_OFFLINE=true
COPY ./jars ${DATA_DIR}/jars

CMD java -jar ${JAR}

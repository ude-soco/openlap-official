# syntax=docker/dockerfile:1.5
FROM maven:3-eclipse-temurin-26@sha256:69a6c37f0a91fca2c9d0cdd684c9c0ea7b1bc00d4196749c24440b2e02ad163d AS build
WORKDIR /opt/app

ADD pom.xml .
RUN --mount=type=cache,target=/root/.m2 \
  MAVEN_OPTS="-XX:+TieredCompilation -XX:TieredStopAtLevel=1" \
  /usr/local/bin/mvn-entrypoint.sh mvn verify clean --fail-never

ADD . .
ARG PACKAGE_NAME=analyticsframework
RUN --mount=type=cache,target=/root/.m2 \
  mvn package -DfinalName=${PACKAGE_NAME}


FROM amazoncorretto:25.0.5@sha256:019e58087ba4c114c817094f70d3d522bcd13e80ce9edbba6e1c67e5700bad63
WORKDIR /opt/app

ARG PACKAGE_NAME=analyticsframework
ENV JAR=${PACKAGE_NAME}.jar
COPY --from=build /opt/app/target/${JAR} .

ENV DATA_DIR="/opt/app/data"
COPY ./jars ${DATA_DIR}/jars

CMD java -jar ${JAR}

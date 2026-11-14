# syntax=docker/dockerfile:1.5
FROM maven:3.10.0-eclipse-temurin-25@sha256:a4734fd7909a9c2beddcacfa1229bd308a349f000bea1ec8db3287c8a16ca2a3 AS build
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

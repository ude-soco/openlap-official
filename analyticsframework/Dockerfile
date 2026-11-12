# syntax=docker/dockerfile:1.5
FROM maven:3.9-eclipse-temurin-26@sha256:b2c1ad85954592f9928e84327c65201f308ad9b5d8ed7d5b823717c97bf23fbb AS build
WORKDIR /opt/app

ADD pom.xml .
RUN --mount=type=cache,target=/root/.m2 \
  MAVEN_OPTS="-XX:+TieredCompilation -XX:TieredStopAtLevel=1" \
  /usr/local/bin/mvn-entrypoint.sh mvn verify clean --fail-never

ADD . .
ARG PACKAGE_NAME=analyticsframework
RUN --mount=type=cache,target=/root/.m2 \
  mvn package -DfinalName=${PACKAGE_NAME}


FROM amazoncorretto:25
WORKDIR /opt/app

ARG PACKAGE_NAME=analyticsframework
ENV JAR=${PACKAGE_NAME}.jar
COPY --from=build /opt/app/target/${JAR} .

ENV DATA_DIR="/opt/app/data"
COPY ./jars ${DATA_DIR}/jars

CMD java -jar ${JAR}

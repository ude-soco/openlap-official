# syntax=docker/dockerfile:1.5
FROM maven:3-jdk-11 AS build
WORKDIR /opt/app

ADD pom.xml .
RUN --mount=type=cache,target=/root/.m2 \
  MAVEN_OPTS="-XX:+TieredCompilation -XX:TieredStopAtLevel=1" \
  /usr/local/bin/mvn-entrypoint.sh mvn verify clean --fail-never

ADD . .
ARG PACKAGE_NAME=openlap-analyticsframework
RUN --mount=type=cache,target=/root/.m2 \
  mvn package -DfinalName=${PACKAGE_NAME}


FROM amazoncorretto:24
WORKDIR /opt/app

ARG PACKAGE_NAME=openlap-analyticsframework
ENV JAR=${PACKAGE_NAME}.jar
COPY --from=build /opt/app/target/${JAR} .

ENV DATA_DIR="/opt/app/data"
COPY ./jars ${DATA_DIR}/jars

CMD java -jar ${JAR}

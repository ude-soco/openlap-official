# syntax=docker/dockerfile:1.5
FROM maven:3-jdk-11 as build

WORKDIR /opt/app
ENV MAVEN_OPTS="-XX:+TieredCompilation -XX:TieredStopAtLevel=1"

ADD pom.xml .
RUN --mount=type=cache,target=/root/.m2 \
  /usr/local/bin/mvn-entrypoint.sh mvn verify clean --fail-never

ADD . .
RUN --mount=type=cache,target=/root/.m2 \
  mvn package


FROM amazoncorretto:11

WORKDIR /opt/app
COPY --from=build /opt/app/target/*.jar .

ENV DATA_DIR="/opt/app/data"
COPY ./jars ${DATA_DIR}/jars

CMD [ "java", "-jar", "*.jar" ]

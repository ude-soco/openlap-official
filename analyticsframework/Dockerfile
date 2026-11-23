# syntax=docker/dockerfile:1.5
FROM maven:3.10.0-eclipse-temurin-25@sha256:a4734fd7909a9c2beddcacfa1229bd308a349f000bea1ec8db3287c8a16ca2a3 AS build
WORKDIR /opt/app

ADD pom.xml .
RUN --mount=type=cache,target=/root/.m2 \
  MAVEN_OPTS="-XX:+TieredCompilation -XX:TieredStopAtLevel=1" \
  /usr/local/bin/mvn-entrypoint.sh mvn verify clean --fail-never

ARG SEMANTIC_SEARCH=false
COPY src/semantic-search/model.sha256 /tmp/model.sha256
RUN set -eu; \
  mkdir -p /opt/models/e5-small-v2; \
  if [ "$SEMANTIC_SEARCH" = true ]; then \
    cd /opt/models/e5-small-v2; \
    source_url=https://huggingface.co/intfloat/e5-small-v2/resolve/ffb93f3bd4047442299a41ebb6fa998a38507c52; \
    for file in model.onnx tokenizer.json README.md; do \
      curl --fail --silent --show-error --location --retry 3 --output "$file" "$source_url/$file"; \
    done; \
    curl --fail --silent --show-error --location --retry 3 --output LICENSE \
      https://raw.githubusercontent.com/microsoft/unilm/0e31c7c09737df491e7ff74ded19614b884c52b4/LICENSE; \
    sha256sum --check /tmp/model.sha256; \
  fi

ADD . .
ARG PACKAGE_NAME=analyticsframework
RUN --mount=type=cache,target=/root/.m2 \
  if [ "$SEMANTIC_SEARCH" = true ]; then set -- -Psemantic-search; fi && \
  mvn "$@" package -DfinalName=${PACKAGE_NAME}


FROM amazoncorretto:25.0.5@sha256:019e58087ba4c114c817094f70d3d522bcd13e80ce9edbba6e1c67e5700bad63
WORKDIR /opt/app

ARG PACKAGE_NAME=analyticsframework
ENV JAR=${PACKAGE_NAME}.jar
COPY --from=build /opt/app/target/${JAR} .

ENV DATA_DIR="/opt/app/data"
ENV DJL_OFFLINE=true
COPY ./jars ${DATA_DIR}/jars

ENV OPENLAP_SEMANTICSEARCH_MODELDIRECTORY=/opt/models/e5-small-v2
COPY --from=build /opt/models/e5-small-v2 /opt/models/e5-small-v2
ARG SEMANTIC_SEARCH=false
RUN --network=none \
  --mount=type=bind,from=build,source=/opt/app/target/test-classes,target=/opt/image-tests \
  --mount=type=tmpfs,target=/tmp \
  if [ "$SEMANTIC_SEARCH" = true ]; then \
    DJL_CACHE_DIR=/tmp/djl java -XX:ActiveProcessorCount=2 -Duser.home=/tmp \
      -Dloader.path=/opt/image-tests -Dloader.main=com.openlap.community.E5ImageCheck \
      -cp "$JAR" org.springframework.boot.loader.launch.PropertiesLauncher; \
  fi

CMD java -jar ${JAR}

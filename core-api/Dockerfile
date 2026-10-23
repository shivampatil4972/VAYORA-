FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -q -B dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -q -B package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
# An unprivileged user, as the gateway runs: core-api writes no files.
RUN groupadd --system app && useradd --system --gid app --no-create-home app
COPY --from=build /src/target/core-api.jar app.jar
USER app
EXPOSE 8080
# The heap is sized from the container's memory, not the host's; running out of memory
# restarts the service rather than leaving it half alive.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-XX:+ExitOnOutOfMemoryError", "-jar", "app.jar"]

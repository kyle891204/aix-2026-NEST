FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
COPY src/ src/
RUN chmod +x mvnw && ./mvnw -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN groupadd --system app && useradd --system --gid app app
COPY --from=build --chown=app:app /app/target/backend-0.0.1-SNAPSHOT.jar app.jar
USER app
ENV SERVER_ADDRESS=0.0.0.0 \
    SPRING_PROFILES_ACTIVE=prod \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70.0"
EXPOSE 10000
ENTRYPOINT ["java", "-jar", "app.jar"]

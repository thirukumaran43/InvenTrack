
# Stage 1: Build Spring Boot application
FROM maven:3.9.11-eclipse-temurin-25 AS builder

WORKDIR /app

COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .

RUN chmod +x mvnw

RUN ./mvnw dependency:go-offline

COPY src ./src

RUN ./mvnw clean package -DskipTests

# Stage 2: Run Spring Boot application
FROM eclipse-temurin:25-jre

WORKDIR /app

# Import TiDB CA certificate into Java truststore
COPY certs/ca.pem /tmp/tidb-ca.pem

RUN keytool -importcert \
    -alias tidb-ca \
    -file /tmp/tidb-ca.pem \
    -keystore /opt/java/openjdk/lib/security/cacerts \
    -storepass changeit \
    -noprompt && \
    rm /tmp/tidb-ca.pem

# Copy executable Spring Boot JAR
COPY --from=builder /app/target/*.jar app.jar

# Render provides PORT at runtime
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]

# Multi-stage build for Spring Boot application
FROM maven:3.9-eclipse-temurin-17 AS build

# Set working directory
WORKDIR /app

# Copy pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

# Create app directory
WORKDIR /app

# Copy the built jar from build stage
COPY --from=build /app/target/*.jar app.jar

# Expose port
EXPOSE 8080

# Set environment variables with defaults
ENV PORT=8080

# Run the application using shell form to allow variable expansion
CMD java -Xmx512m -Xms256m -Dserver.port=$PORT -jar app.jar

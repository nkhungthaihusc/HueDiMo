package com.huedimo.common.config;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class ExternalConfigurationTest {

    @TempDir
    Path temporaryDirectory;

    @Test
    void loadsLocalCredentialsWithoutStartingDatabaseOrMailConnections() throws Exception {
        Path localEnvironment = temporaryDirectory.resolve(".env");
        Files.writeString(localEnvironment, """
                DB_HOST=database.example.test
                DB_PORT=6543
                DB_NAME=fixture_database
                DB_USER=fixture_user
                DB_PASSWORD=fixture-database-password
                JWT_SECRET=fixture-access-signing-secret-32-bytes
                JWT_REFRESH_SECRET=fixture-refresh-signing-secret-32-bytes
                GEMINI_API_KEY=fixture-gemini
                OPENCODE_ZEN_API_KEY=fixture-opencode
                SUPABASE_URL=https://storage.example.test
                SUPABASE_ANON_KEY=fixture-public-client
                MAIL_USERNAME=mailer@example.test
                MAIL_PASSWORD=fixture-mail-password
                """);

        new ApplicationContextRunner()
                .withInitializer(new ConfigDataApplicationContextInitializer())
                .withPropertyValues("spring.config.import=optional:" + localEnvironment.toUri() + "[.properties]")
                .run(context -> {
                    var environment = context.getEnvironment();
                    assertEquals("fixture-gemini", environment.getProperty("ai.gemini.api-key"));
                    assertEquals("fixture-gemini", environment.getProperty("gemini.api-key"));
                    assertEquals("fixture-opencode", environment.getProperty("ai.opencode.zen-api-key"));
                    assertEquals("fixture-access-signing-secret-32-bytes", environment.getProperty("jwt.access-secret"));
                    assertEquals("fixture-refresh-signing-secret-32-bytes", environment.getProperty("jwt.refresh-secret"));
                    assertEquals("fixture-database-password", environment.getProperty("spring.datasource.password"));
                    assertEquals("fixture_user", environment.getProperty("spring.datasource.username"));
                    assertEquals("jdbc:postgresql://database.example.test:6543/fixture_database?sslmode=require",
                            environment.getProperty("spring.datasource.url"));
                    assertEquals("mailer@example.test", environment.getProperty("spring.mail.username"));
                    assertEquals("fixture-mail-password", environment.getProperty("spring.mail.password"));
                    assertEquals("fixture-public-client", environment.getProperty("supabase.anon-key"));
                });
    }
}

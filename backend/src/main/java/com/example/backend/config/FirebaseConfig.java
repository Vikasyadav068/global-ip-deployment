package com.example.backend.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;

@Configuration
public class FirebaseConfig {
    
    private static final Logger logger = LoggerFactory.getLogger(FirebaseConfig.class);
    
    @Bean
    public FirebaseApp initializeFirebase() {
        try {
            // Check if Firebase is already initialized
            if (!FirebaseApp.getApps().isEmpty()) {
                logger.info("ℹ️ Firebase Admin SDK already initialized");
                return FirebaseApp.getInstance();
            }
            
            // Try to load from classpath first
            InputStream serviceAccount = new ClassPathResource("firebase-service-account.json").getInputStream();
            
            FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                .build();
            
            FirebaseApp app = FirebaseApp.initializeApp(options);
            logger.info("✅ Firebase Admin SDK initialized successfully");
            return app;
        } catch (IOException e) {
            logger.warn("⚠️ Firebase service account file not found. Firebase features will be disabled.");
            logger.warn("⚠️ To enable Firebase, place firebase-service-account.json in src/main/resources/");
            // Return null - service methods will handle null checks
            return null;
        } catch (Exception e) {
            logger.error("❌ Error initializing Firebase Admin SDK: {}", e.getMessage());
            return null;
        }
    }
}

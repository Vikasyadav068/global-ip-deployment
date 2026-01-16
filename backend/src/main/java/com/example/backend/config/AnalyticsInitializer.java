package com.example.backend.config;

import com.example.backend.model.DailyAnalytics;
import com.example.backend.repository.DailyAnalyticsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Optional;

@Component
public class AnalyticsInitializer implements CommandLineRunner {
    
    @Autowired
    private DailyAnalyticsRepository dailyAnalyticsRepository;
    
    @Override
    public void run(String... args) throws Exception {
        try {
            System.out.println("========================================");
            System.out.println("Initializing Analytics Database...");
            System.out.println("========================================");
            
            LocalDate today = LocalDate.now();
            LocalDate startDate = today.minusDays(89); // Last 90 days including today
            
            int initialized = 0;
            int existing = 0;
            
            for (LocalDate date = startDate; !date.isAfter(today); date = date.plusDays(1)) {
                Optional<DailyAnalytics> existingRecord = dailyAnalyticsRepository.findByMetricDate(date);
                
                if (existingRecord.isEmpty()) {
                    DailyAnalytics analytics = new DailyAnalytics();
                    analytics.setMetricDate(date);
                    analytics.setTotalUsers(0);
                    analytics.setTotalPatents(0);
                    analytics.setTotalFilings(0);
                    dailyAnalyticsRepository.save(analytics);
                    initialized++;
                } else {
                    existing++;
                }
            }
            
            System.out.println("✓ Analytics database initialized");
            System.out.println("  - New records created: " + initialized);
            System.out.println("  - Existing records: " + existing);
            System.out.println("  - Total days of data: " + (initialized + existing));
            System.out.println("  - Date range: " + startDate + " to " + today);
            System.out.println("========================================");
        } catch (Exception e) {
            System.err.println("Error initializing analytics database:");
            e.printStackTrace();
            // Don't throw - allow application to continue
        }
    }
}

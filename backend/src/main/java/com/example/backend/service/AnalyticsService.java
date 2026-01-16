package com.example.backend.service;

import com.example.backend.dto.AnalyticsDataPoint;
import com.example.backend.model.DailyAnalytics;
import com.example.backend.repository.DailyAnalyticsRepository;
import com.example.backend.repository.PatentRepository;
import com.example.backend.repository.PatentFilingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class AnalyticsService {
    
    @Autowired
    private DailyAnalyticsRepository dailyAnalyticsRepository;
    
    @Autowired
    private PatentRepository patentRepository;
    
    @Autowired
    private PatentFilingRepository patentFilingRepository;
    
    private static final DateTimeFormatter MONTH_DAY_FORMATTER = DateTimeFormatter.ofPattern("MMM d");
    private static final DateTimeFormatter FULL_DATE_FORMATTER = DateTimeFormatter.ofPattern("MMMM d, yyyy");
    
    /**
     * Update or create today's analytics data
     */
    @Transactional
    public DailyAnalytics updateTodayMetrics(int totalUsers, int totalPatents, int totalFilings) {
        LocalDate today = LocalDate.now();
        
        Optional<DailyAnalytics> existingOpt = dailyAnalyticsRepository.findByMetricDate(today);
        
        DailyAnalytics analytics;
        if (existingOpt.isPresent()) {
            analytics = existingOpt.get();
            analytics.setTotalUsers(totalUsers);
            analytics.setTotalPatents(totalPatents);
            analytics.setTotalFilings(totalFilings);
        } else {
            analytics = new DailyAnalytics();
            analytics.setMetricDate(today);
            analytics.setTotalUsers(totalUsers);
            analytics.setTotalPatents(totalPatents);
            analytics.setTotalFilings(totalFilings);
        }
        
        return dailyAnalyticsRepository.save(analytics);
    }
    
    /**
     * Initialize missing dates with forward-filled values from previous day
     * This ensures the chart shows the last known values when no new data is recorded
     */
    @Transactional
    public void initializeDateRange(int days) {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(days - 1);
        
        // Track the last known values for forward-filling
        int lastUsers = 0;
        int lastPatents = 0;
        int lastFilings = 0;
        
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            Optional<DailyAnalytics> existing = dailyAnalyticsRepository.findByMetricDate(date);
            
            if (existing.isPresent()) {
                // Update last known values from existing data
                DailyAnalytics analytics = existing.get();
                lastUsers = analytics.getTotalUsers();
                lastPatents = analytics.getTotalPatents();
                lastFilings = analytics.getTotalFilings();
            } else {
                // Create new entry with forward-filled values from previous day
                DailyAnalytics analytics = new DailyAnalytics();
                analytics.setMetricDate(date);
                analytics.setTotalUsers(lastUsers);
                analytics.setTotalPatents(lastPatents);
                analytics.setTotalFilings(lastFilings);
                dailyAnalyticsRepository.save(analytics);
            }
        }
    }
    
    /**
     * Get analytics data for the specified number of days with forward-fill strategy
     * Missing dates will show the previous day's values instead of zeros
     */
    public List<AnalyticsDataPoint> getAnalyticsData(int days) {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(days - 1);
        
        // Initialize missing dates with forward-filled values
        initializeDateRange(days);
        
        List<DailyAnalytics> analyticsData = dailyAnalyticsRepository
                .findByMetricDateBetweenOrderByMetricDateAsc(startDate, endDate);
        
        List<AnalyticsDataPoint> dataPoints = new ArrayList<>();
        
        // Apply forward-fill strategy when converting to data points
        int lastUsers = 0;
        int lastPatents = 0;
        int lastFilings = 0;
        
        for (DailyAnalytics analytics : analyticsData) {
            // If current values are non-zero, update last known values
            if (analytics.getTotalUsers() > 0 || analytics.getTotalPatents() > 0 || analytics.getTotalFilings() > 0) {
                lastUsers = analytics.getTotalUsers() > 0 ? analytics.getTotalUsers() : lastUsers;
                lastPatents = analytics.getTotalPatents() > 0 ? analytics.getTotalPatents() : lastPatents;
                lastFilings = analytics.getTotalFilings() > 0 ? analytics.getTotalFilings() : lastFilings;
            }
            
            AnalyticsDataPoint point = new AnalyticsDataPoint();
            point.setDate(analytics.getMetricDate().format(MONTH_DAY_FORMATTER));
            point.setFullDate(analytics.getMetricDate().format(FULL_DATE_FORMATTER));
            
            // Use forward-filled values if current values are zero
            point.setUsers(analytics.getTotalUsers() > 0 ? analytics.getTotalUsers() : lastUsers);
            point.setPatents(analytics.getTotalPatents() > 0 ? analytics.getTotalPatents() : lastPatents);
            point.setFilings(analytics.getTotalFilings() > 0 ? analytics.getTotalFilings() : lastFilings);
            
            dataPoints.add(point);
        }
        
        return dataPoints;
    }
    
    /**
     * Scheduled task to clean up data older than 90 days
     * Runs daily at midnight
     */
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void cleanupOldData() {
        LocalDate cutoffDate = LocalDate.now().minusDays(90);
        dailyAnalyticsRepository.deleteOlderThan(cutoffDate);
        System.out.println("Cleaned up analytics data older than: " + cutoffDate);
    }
    
    /**
     * Sync current database counts to today's analytics
     * This can be called periodically to keep analytics up to date
     */
    @Transactional
    public DailyAnalytics syncCurrentMetrics() {
        try {
            int patentCount = (int) patentRepository.count();
            int filingCount = (int) patentFilingRepository.count();
            
            // For users, we'll use the count passed from frontend (from Firestore)
            // or keep the existing count if available
            LocalDate today = LocalDate.now();
            Optional<DailyAnalytics> existing = dailyAnalyticsRepository.findByMetricDate(today);
            
            int userCount = existing.map(DailyAnalytics::getTotalUsers).orElse(0);
            
            return updateTodayMetrics(userCount, patentCount, filingCount);
        } catch (Exception e) {
            System.err.println("Error syncing current metrics: " + e.getMessage());
            return null;
        }
    }
}

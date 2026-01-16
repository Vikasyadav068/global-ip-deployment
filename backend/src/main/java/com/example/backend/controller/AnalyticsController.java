package com.example.backend.controller;

import com.example.backend.dto.AnalyticsDataPoint;
import com.example.backend.model.DailyAnalytics;
import com.example.backend.service.AnalyticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = "*")
public class AnalyticsController {
    
    @Autowired
    private AnalyticsService analyticsService;
    
    /**
     * Update today's metrics
     */
    @PostMapping("/update")
    public ResponseEntity<DailyAnalytics> updateTodayMetrics(@RequestBody Map<String, Integer> metrics) {
        int totalUsers = metrics.getOrDefault("totalUsers", 0);
        int totalPatents = metrics.getOrDefault("totalPatents", 0);
        int totalFilings = metrics.getOrDefault("totalFilings", 0);
        
        DailyAnalytics updated = analyticsService.updateTodayMetrics(totalUsers, totalPatents, totalFilings);
        return ResponseEntity.ok(updated);
    }
    
    /**
     * Get analytics data for specified time range
     */
    @GetMapping("/growth")
    public ResponseEntity<List<AnalyticsDataPoint>> getGrowthData(
            @RequestParam(defaultValue = "7") int days) {
        
        if (days > 90) {
            days = 90;
        }
        
        // Sync current database metrics before returning data
        analyticsService.syncCurrentMetrics();
        
        List<AnalyticsDataPoint> data = analyticsService.getAnalyticsData(days);
        return ResponseEntity.ok(data);
    }
    
    /**
     * Initialize date range with zeros (useful for setup)
     */
    @PostMapping("/initialize")
    public ResponseEntity<String> initializeDateRange(@RequestParam(defaultValue = "90") int days) {
        if (days > 90) {
            days = 90;
        }
        
        analyticsService.initializeDateRange(days);
        return ResponseEntity.ok("Initialized " + days + " days of analytics data");
    }
    
    /**
     * Sync current database metrics to today's analytics
     */
    @PostMapping("/sync")
    public ResponseEntity<DailyAnalytics> syncCurrentMetrics() {
        DailyAnalytics updated = analyticsService.syncCurrentMetrics();
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
        return ResponseEntity.internalServerError().build();
    }
}

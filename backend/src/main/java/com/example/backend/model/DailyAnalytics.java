package com.example.backend.model;

import lombok.Data;
import jakarta.persistence.*;
import java.time.LocalDate;

@Data
@Entity
@Table(name = "daily_analytics")
public class DailyAnalytics {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "metric_date", unique = true, nullable = false)
    private LocalDate metricDate;
    
    @Column(name = "total_users", nullable = false)
    private Integer totalUsers = 0;
    
    @Column(name = "total_patents", nullable = false)
    private Integer totalPatents = 0;
    
    @Column(name = "total_filings", nullable = false)
    private Integer totalFilings = 0;
    
    @PrePersist
    protected void onCreate() {
        if (metricDate == null) {
            metricDate = LocalDate.now();
        }
    }
}

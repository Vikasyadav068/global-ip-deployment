package com.example.backend.repository;

import com.example.backend.model.DailyAnalytics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DailyAnalyticsRepository extends JpaRepository<DailyAnalytics, Long> {
    
    Optional<DailyAnalytics> findByMetricDate(LocalDate date);
    
    List<DailyAnalytics> findByMetricDateBetweenOrderByMetricDateAsc(LocalDate startDate, LocalDate endDate);
    
    @Modifying
    @Transactional
    @Query("DELETE FROM DailyAnalytics d WHERE d.metricDate < :cutoffDate")
    void deleteOlderThan(LocalDate cutoffDate);
}

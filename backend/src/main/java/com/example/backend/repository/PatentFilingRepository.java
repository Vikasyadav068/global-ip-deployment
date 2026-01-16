package com.example.backend.repository;

import com.example.backend.model.PatentFiling;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PatentFilingRepository extends JpaRepository<PatentFiling, Long> {
    
    // Find all patent filings by user ID
    List<PatentFiling> findByUserId(String userId);
    
    // Find by status
    List<PatentFiling> findByStatus(String status);
    
    // Find by user ID and status
    List<PatentFiling> findByUserIdAndStatus(String userId, String status);
    
    // Find by payment status
    List<PatentFiling> findByPaymentStatus(String paymentStatus);
    
    // Find granted or rejected patents (case-insensitive)
    @Query("SELECT p FROM PatentFiling p WHERE LOWER(p.status) IN ('granted', 'rejected')")
    List<PatentFiling> findGrantedOrRejectedPatents();
    
    // Count patents by state
    @Query("SELECT p.applicantState, COUNT(p) FROM PatentFiling p GROUP BY p.applicantState")
    List<Object[]> countPatentsByState();
    
    // Get distinct cities by state (case-insensitive, excluding nulls and empty strings)
    @Query("SELECT DISTINCT p.applicantCity FROM PatentFiling p WHERE LOWER(p.applicantState) = LOWER(:state) AND p.applicantCity IS NOT NULL AND p.applicantCity != '' ORDER BY p.applicantCity")
    List<String> findDistinctCitiesByState(@org.springframework.data.repository.query.Param("state") String state);
    
    // Date-based analytics queries
    @Query("SELECT COUNT(p) FROM PatentFiling p WHERE p.applicationDate >= :startDate")
    long countPatentsFiledSince(@org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate);
    
    @Query("SELECT p.applicantState, COUNT(p) FROM PatentFiling p WHERE p.applicationDate >= :startDate GROUP BY p.applicantState ORDER BY COUNT(p) DESC")
    List<Object[]> countPatentsByStateSince(@org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate);
    
    @Query("SELECT p.applicantCity, COUNT(p) FROM PatentFiling p WHERE p.applicationDate >= :startDate AND LOWER(p.applicantState) = LOWER(:state) GROUP BY p.applicantCity ORDER BY COUNT(p) DESC")
    List<Object[]> countPatentsByCityInStateSince(@org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate, @org.springframework.data.repository.query.Param("state") String state);
    
    @Query("SELECT p.applicantCity, COUNT(p) FROM PatentFiling p WHERE p.applicationDate >= :startDate GROUP BY p.applicantCity ORDER BY COUNT(p) DESC")
    List<Object[]> countPatentsByCitySince(@org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate);
    
    // Leaderboard query - Get top users by patent count (all time) - Groups by userId only for accurate distinct counting
    @Query("SELECT p.userId, MAX(p.userName) as userName, COUNT(p) as patentCount FROM PatentFiling p WHERE p.userId IS NOT NULL AND p.userId != '' GROUP BY p.userId ORDER BY patentCount DESC")
    List<Object[]> findTopUsersByPatentCount();
    
    // Leaderboard query - Get top users by patent count (with date filter) - Groups by userId only for accurate distinct counting
    @Query("SELECT p.userId, MAX(p.userName) as userName, COUNT(p) as patentCount FROM PatentFiling p WHERE p.userId IS NOT NULL AND p.userId != '' AND p.applicationDate >= :startDate GROUP BY p.userId ORDER BY patentCount DESC")
    List<Object[]> findTopUsersByPatentCountSince(@org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate);
    
    // Count patents by specific state (case-insensitive)
    @Query("SELECT COUNT(p) FROM PatentFiling p WHERE LOWER(p.applicantState) = LOWER(:state)")
    long countByApplicantState(@org.springframework.data.repository.query.Param("state") String state);
    
    // Count filings since date
    @Query("SELECT COUNT(p) FROM PatentFiling p WHERE p.applicationDate >= :startDate")
    long countFilingsSince(@org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate);
}

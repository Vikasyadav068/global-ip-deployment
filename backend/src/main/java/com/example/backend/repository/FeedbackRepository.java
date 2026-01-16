package com.example.backend.repository;

import com.example.backend.model.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    List<Feedback> findByEmailSent(Boolean emailSent);
    List<Feedback> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    List<Feedback> findByUserId(String userId);
    List<Feedback> findByAverageRatingGreaterThanEqual(Double rating);
}

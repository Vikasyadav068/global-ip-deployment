package com.example.backend.controller;

import com.example.backend.model.Feedback;
import com.example.backend.repository.FeedbackRepository;
import com.example.backend.service.EmailService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/feedback")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class FeedbackController {
    
    private final FeedbackRepository feedbackRepository;
    private final EmailService emailService;
    
    @Value("${app.email.enabled:true}")
    private boolean emailEnabled;

    /**
     * Submit feedback form
     */
    @PostMapping("/submit")
    public ResponseEntity<Map<String, Object>> submitFeedback(@Valid @RequestBody Feedback feedback) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Feedback savedFeedback = feedbackRepository.save(feedback);
            log.info("Feedback saved to database with ID: {}", savedFeedback.getId());
            
            if (emailEnabled) {
                try {
                    if (savedFeedback.getUserEmail() != null && !savedFeedback.getUserEmail().isEmpty()) {
                        emailService.sendFeedbackConfirmation(savedFeedback);
                    }
                    emailService.sendFeedbackNotificationToAdmin(savedFeedback);
                    savedFeedback.setEmailSent(true);
                    feedbackRepository.save(savedFeedback);
                    log.info("Emails sent successfully for feedback ID: {}", savedFeedback.getId());
                } catch (Exception e) {
                    log.error("Failed to send emails for feedback ID: {}", savedFeedback.getId(), e);
                    response.put("emailWarning", "Feedback saved but email notification failed");
                }
            } else {
                log.info("Email disabled - skipping email notification for feedback ID: {}", savedFeedback.getId());
            }
            
            response.put("success", true);
            response.put("message", "Thank you for your feedback! We appreciate your input.");
            response.put("feedbackId", savedFeedback.getId());
            response.put("averageRating", savedFeedback.getAverageRating());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error processing feedback form", e);
            response.put("success", false);
            response.put("message", "Failed to submit feedback. Please try again.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Get all feedbacks (Admin endpoint) with optional minRating filter
     */
    @GetMapping("/all")
    public ResponseEntity<List<Feedback>> getAllFeedbacks(
            @RequestParam(required = false) Integer minRating) {
        List<Feedback> feedbacks = feedbackRepository.findAll();
        
        if (minRating != null) {
            feedbacks = feedbacks.stream()
                    .filter(f -> f.getOverallRating() != null && f.getOverallRating() >= minRating)
                    .toList();
        }
        
        return ResponseEntity.ok(feedbacks);
    }
    
    /**
     * Get feedback by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<Feedback> getFeedbackById(@PathVariable Long id) {
        return feedbackRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    /**
     * Get feedback by user ID
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Feedback>> getFeedbackByUserId(@PathVariable String userId) {
        try {
            List<Feedback> feedbacks = feedbackRepository.findByUserId(userId);
            return ResponseEntity.ok(feedbacks);
        } catch (Exception e) {
            log.error("Error fetching feedbacks for user: {}", userId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Get feedback statistics
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getFeedbackStats() {
        try {
            List<Feedback> allFeedbacks = feedbackRepository.findAll();
            
            Map<String, Object> stats = new HashMap<>();
            stats.put("totalFeedbacks", allFeedbacks.size());
            
            if (!allFeedbacks.isEmpty()) {
                double avgUI = allFeedbacks.stream()
                        .mapToInt(f -> f.getUserInterfaceRating() != null ? f.getUserInterfaceRating() : 0)
                        .average().orElse(0.0);
                double avgPerformance = allFeedbacks.stream()
                        .mapToInt(f -> f.getPerformanceRating() != null ? f.getPerformanceRating() : 0)
                        .average().orElse(0.0);
                double avgFeatures = allFeedbacks.stream()
                        .mapToInt(f -> f.getFeaturesRating() != null ? f.getFeaturesRating() : 0)
                        .average().orElse(0.0);
                double avgSupport = allFeedbacks.stream()
                        .mapToInt(f -> f.getSupportRating() != null ? f.getSupportRating() : 0)
                        .average().orElse(0.0);
                double avgOverall = allFeedbacks.stream()
                        .mapToInt(f -> f.getOverallRating() != null ? f.getOverallRating() : 0)
                        .average().orElse(0.0);
                
                stats.put("averageUIRating", avgUI);
                stats.put("averagePerformanceRating", avgPerformance);
                stats.put("averageFeaturesRating", avgFeatures);
                stats.put("averageSupportRating", avgSupport);
                stats.put("averageOverallRating", avgOverall);
                stats.put("overallAverageRating", (avgUI + avgPerformance + avgFeatures + avgSupport + avgOverall) / 5.0);
            }
            
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Error calculating feedback stats", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Delete feedback by ID
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteFeedback(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            if (feedbackRepository.existsById(id)) {
                feedbackRepository.deleteById(id);
                response.put("success", true);
                response.put("message", "Feedback deleted successfully");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Feedback not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            log.error("Error deleting feedback", e);
            response.put("success", false);
            response.put("message", "Failed to delete feedback");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}

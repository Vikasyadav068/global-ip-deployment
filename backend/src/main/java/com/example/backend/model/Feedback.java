package com.example.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "feedbacks")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Feedback {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_name")
    private String userName;
    
    @Email(message = "Invalid email format")
    @Column(name = "user_email")
    private String userEmail;
    
    @Column(name = "user_id")
    private String userId;
    
    @Min(value = 0, message = "Rating must be between 0 and 5")
    @Max(value = 5, message = "Rating must be between 0 and 5")
    @Column(name = "ui_rating")
    private Integer userInterfaceRating;
    
    @Min(value = 0, message = "Rating must be between 0 and 5")
    @Max(value = 5, message = "Rating must be between 0 and 5")
    @Column(name = "performance_rating")
    private Integer performanceRating;
    
    @Min(value = 0, message = "Rating must be between 0 and 5")
    @Max(value = 5, message = "Rating must be between 0 and 5")
    @Column(name = "features_rating")
    private Integer featuresRating;
    
    @Min(value = 0, message = "Rating must be between 0 and 5")
    @Max(value = 5, message = "Rating must be between 0 and 5")
    @Column(name = "support_rating")
    private Integer supportRating;
    
    @Min(value = 0, message = "Rating must be between 0 and 5")
    @Max(value = 5, message = "Rating must be between 0 and 5")
    @Column(name = "overall_rating")
    private Integer overallRating;
    
    @Column(name = "feedback_message", columnDefinition = "TEXT")
    private String feedbackMessage;
    
    @Column(name = "average_rating")
    private Double averageRating;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "email_sent")
    private Boolean emailSent = false;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        calculateAverageRating();
    }
    
    private void calculateAverageRating() {
        int total = (userInterfaceRating != null ? userInterfaceRating : 0) +
                    (performanceRating != null ? performanceRating : 0) +
                    (featuresRating != null ? featuresRating : 0) +
                    (supportRating != null ? supportRating : 0) +
                    (overallRating != null ? overallRating : 0);
        averageRating = total / 5.0;
    }
}

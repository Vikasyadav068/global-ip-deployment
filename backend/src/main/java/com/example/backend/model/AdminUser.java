package com.example.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "admin_users")
public class AdminUser {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "admin_id")
    private Long adminId;
    
    @Column(name = "admin_name", nullable = false, length = 100)
    private String adminName;
    
    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;
    
    @Column(name = "password", nullable = false, length = 255)
    private String password;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Admin action tracking fields
    @Column(name = "patents_granted", columnDefinition = "integer default 0")
    private Integer patentsGranted = 0;
    
    @Column(name = "patents_rejected", columnDefinition = "integer default 0")
    private Integer patentsRejected = 0;
    
    @Column(name = "patents_activated", columnDefinition = "integer default 0")
    private Integer patentsActivated = 0;
    
    @Column(name = "patents_deactivated", columnDefinition = "integer default 0")
    private Integer patentsDeactivated = 0;

    // Constructors
    public AdminUser() {
    }

    public AdminUser(String adminName, String email, String password) {
        this.adminName = adminName;
        this.email = email;
        this.password = password;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getAdminId() {
        return adminId;
    }

    public void setAdminId(Long adminId) {
        this.adminId = adminId;
    }

    public String getAdminName() {
        return adminName;
    }

    public void setAdminName(String adminName) {
        this.adminName = adminName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    // Getters and Setters for tracking fields
    public Integer getPatentsGranted() {
        return patentsGranted != null ? patentsGranted : 0;
    }

    public void setPatentsGranted(Integer patentsGranted) {
        this.patentsGranted = patentsGranted;
    }

    public Integer getPatentsRejected() {
        return patentsRejected != null ? patentsRejected : 0;
    }

    public void setPatentsRejected(Integer patentsRejected) {
        this.patentsRejected = patentsRejected;
    }

    public Integer getPatentsActivated() {
        return patentsActivated != null ? patentsActivated : 0;
    }

    public void setPatentsActivated(Integer patentsActivated) {
        this.patentsActivated = patentsActivated;
    }

    public Integer getPatentsDeactivated() {
        return patentsDeactivated != null ? patentsDeactivated : 0;
    }

    public void setPatentsDeactivated(Integer patentsDeactivated) {
        this.patentsDeactivated = patentsDeactivated;
    }
}

package com.example.backend.dto;

import java.time.LocalDateTime;

public class AdminResponse {
    
    private Long adminId;
    private String adminName;
    private String email;
    private LocalDateTime createdAt;
    private Integer patentsGranted;
    private Integer patentsRejected;
    private Integer patentsActivated;
    private Integer patentsDeactivated;

    // Constructors
    public AdminResponse() {
    }

    public AdminResponse(Long adminId, String adminName, String email, LocalDateTime createdAt) {
        this.adminId = adminId;
        this.adminName = adminName;
        this.email = email;
        this.createdAt = createdAt;
    }

    public AdminResponse(Long adminId, String adminName, String email, LocalDateTime createdAt,
                        Integer patentsGranted, Integer patentsRejected, 
                        Integer patentsActivated, Integer patentsDeactivated) {
        this.adminId = adminId;
        this.adminName = adminName;
        this.email = email;
        this.createdAt = createdAt;
        this.patentsGranted = patentsGranted;
        this.patentsRejected = patentsRejected;
        this.patentsActivated = patentsActivated;
        this.patentsDeactivated = patentsDeactivated;
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Integer getPatentsGranted() {
        return patentsGranted;
    }

    public void setPatentsGranted(Integer patentsGranted) {
        this.patentsGranted = patentsGranted;
    }

    public Integer getPatentsRejected() {
        return patentsRejected;
    }

    public void setPatentsRejected(Integer patentsRejected) {
        this.patentsRejected = patentsRejected;
    }

    public Integer getPatentsActivated() {
        return patentsActivated;
    }

    public void setPatentsActivated(Integer patentsActivated) {
        this.patentsActivated = patentsActivated;
    }

    public Integer getPatentsDeactivated() {
        return patentsDeactivated;
    }

    public void setPatentsDeactivated(Integer patentsDeactivated) {
        this.patentsDeactivated = patentsDeactivated;
    }
}

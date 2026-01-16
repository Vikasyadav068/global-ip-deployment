package com.example.backend.dto;

/**
 * Data Transfer Object for Leaderboard User information
 */
public class LeaderboardUserDTO {
    
    private String userId;
    private String userName;
    private String userPhoto;
    private Long patentCount;
    private Integer rank;
    
    // Constructors
    public LeaderboardUserDTO() {
    }
    
    public LeaderboardUserDTO(String userId, String userName, Long patentCount) {
        this.userId = userId;
        this.userName = userName;
        this.userPhoto = null; // Will be set from user profile later
        this.patentCount = patentCount;
    }
    
    public LeaderboardUserDTO(String userId, String userName, String userPhoto, Long patentCount, Integer rank) {
        this.userId = userId;
        this.userName = userName;
        this.userPhoto = userPhoto;
        this.patentCount = patentCount;
        this.rank = rank;
    }
    
    // Getters and Setters
    public String getUserId() {
        return userId;
    }
    
    public void setUserId(String userId) {
        this.userId = userId;
    }
    
    public String getUserName() {
        return userName;
    }
    
    public void setUserName(String userName) {
        this.userName = userName;
    }
    
    public String getUserPhoto() {
        return userPhoto;
    }
    
    public void setUserPhoto(String userPhoto) {
        this.userPhoto = userPhoto;
    }
    
    public Long getPatentCount() {
        return patentCount;
    }
    
    public void setPatentCount(Long patentCount) {
        this.patentCount = patentCount;
    }
    
    public Integer getRank() {
        return rank;
    }
    
    public void setRank(Integer rank) {
        this.rank = rank;
    }
    
    @Override
    public String toString() {
        return "LeaderboardUserDTO{" +
                "userId='" + userId + '\'' +
                ", userName='" + userName + '\'' +
                ", userPhoto='" + userPhoto + '\'' +
                ", patentCount=" + patentCount +
                ", rank=" + rank +
                '}';
    }
}

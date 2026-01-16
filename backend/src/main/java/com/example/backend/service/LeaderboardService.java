package com.example.backend.service;

import com.example.backend.dto.LeaderboardUserDTO;
import com.example.backend.model.User;
import com.example.backend.repository.PatentFilingRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class LeaderboardService {
    
    @Autowired
    private PatentFilingRepository patentFilingRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    /**
     * Get top 10 users by patent filing count with time filter
     * @param filter Time filter: all, weekly, monthly
     * @return List of top users with their patent counts
     */
    public List<LeaderboardUserDTO> getTopUsersByPatentCount(String filter) {
        System.out.println("🔍 Querying database for top users by patent count with filter: " + filter);
        
        List<Object[]> results;
        
        // Calculate date range based on filter
        if ("weekly".equalsIgnoreCase(filter)) {
            LocalDate weekAgo = LocalDate.now().minusWeeks(1);
            System.out.println("📅 Filtering patents from last week (since " + weekAgo + ")");
            results = patentFilingRepository.findTopUsersByPatentCountSince(weekAgo);
        } else if ("monthly".equalsIgnoreCase(filter)) {
            LocalDate monthAgo = LocalDate.now().minusMonths(1);
            System.out.println("📅 Filtering patents from last month (since " + monthAgo + ")");
            results = patentFilingRepository.findTopUsersByPatentCountSince(monthAgo);
        } else {
            System.out.println("📅 Fetching all-time patent counts");
            results = patentFilingRepository.findTopUsersByPatentCount();
        }
        
        System.out.println("📊 Found " + results.size() + " users with patent filings");
        
        // Convert to DTOs and assign ranks
        List<LeaderboardUserDTO> leaderboard = results.stream()
            .map(result -> {
                String userId = (String) result[0];
                String userName = (String) result[1];
                Long patentCount = (Long) result[2];
                
                // Fetch user profile photo from User table using email (userId is email)
                String userPhoto = null;
                try {
                    User user = userRepository.findByEmail(userId).orElse(null);
                    if (user != null && user.getProfilePhoto() != null) {
                        userPhoto = user.getProfilePhoto();
                    }
                } catch (Exception e) {
                    System.out.println("⚠️ Could not fetch photo for user: " + userId);
                }
                
                LeaderboardUserDTO dto = new LeaderboardUserDTO(userId, userName, patentCount);
                dto.setUserPhoto(userPhoto);
                return dto;
            })
            .collect(Collectors.toList());
        
        // Assign ranks (1-based)
        for (int i = 0; i < leaderboard.size(); i++) {
            leaderboard.get(i).setRank(i + 1);
        }
        
        return leaderboard;
    }
    
    /**
     * Get specific user's rank and statistics
     * @param userId The user ID to query
     * @return User's rank information or null if not found
     */
    public LeaderboardUserDTO getUserRank(String userId) {
        System.out.println("🔍 Getting rank for user: " + userId);
        
        List<LeaderboardUserDTO> allUsers = getTopUsersByPatentCount("all");
        
        return allUsers.stream()
            .filter(user -> user.getUserId().equals(userId))
            .findFirst()
            .orElse(null);
    }
}

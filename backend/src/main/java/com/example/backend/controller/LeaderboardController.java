package com.example.backend.controller;

import com.example.backend.dto.LeaderboardUserDTO;
import com.example.backend.service.LeaderboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/leaderboard")
@CrossOrigin(origins = "*")
public class LeaderboardController {
    
    @Autowired
    private LeaderboardService leaderboardService;
    
    /**
     * Get top users by patent filing count
     * @param filter Time filter: all, weekly, monthly
     * @return List of top 10 users with their patent counts
     */
    @GetMapping("/top-users")
    public ResponseEntity<List<LeaderboardUserDTO>> getTopUsers(
            @RequestParam(defaultValue = "all") String filter) {
        try {
            System.out.println("🏆 Fetching leaderboard data with filter: " + filter);
            List<LeaderboardUserDTO> topUsers = leaderboardService.getTopUsersByPatentCount(filter);
            System.out.println("✅ Found " + topUsers.size() + " users in leaderboard");
            return ResponseEntity.ok(topUsers);
        } catch (Exception e) {
            System.err.println("❌ ERROR fetching leaderboard data:");
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
    
    /**
     * Get user's rank and position
     * @param userId The user ID to check
     * @return User's rank information
     */
    @GetMapping("/user-rank/{userId}")
    public ResponseEntity<LeaderboardUserDTO> getUserRank(@PathVariable String userId) {
        try {
            System.out.println("🔍 Fetching rank for user: " + userId);
            LeaderboardUserDTO userRank = leaderboardService.getUserRank(userId);
            
            if (userRank != null) {
                System.out.println("✅ User rank found: " + userRank.getRank());
                return ResponseEntity.ok(userRank);
            } else {
                System.out.println("⚠️ User not found in leaderboard");
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            System.err.println("❌ ERROR fetching user rank:");
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
}

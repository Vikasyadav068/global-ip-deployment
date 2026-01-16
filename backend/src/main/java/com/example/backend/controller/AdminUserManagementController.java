package com.example.backend.controller;

import com.example.backend.dto.UserActionRequest;
import com.example.backend.dto.UserActionResponse;
import com.example.backend.service.FirebaseUserManagementService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@CrossOrigin(origins = "*")
public class AdminUserManagementController {
    
    private static final Logger logger = LoggerFactory.getLogger(AdminUserManagementController.class);
    
    private final FirebaseUserManagementService firebaseUserManagementService;
    
    public AdminUserManagementController(FirebaseUserManagementService firebaseUserManagementService) {
        this.firebaseUserManagementService = firebaseUserManagementService;
    }
    
    /**
     * POST /api/admin/users/deactivate
     * Deactivate a user account
     */
    @PostMapping("/deactivate")
    public ResponseEntity<UserActionResponse> deactivateUser(@RequestBody UserActionRequest request) {
        logger.info("📥 Request to deactivate user: {}", request.getUserId());
        
        if (request.getUserId() == null || request.getUserId().trim().isEmpty()) {
            return ResponseEntity.badRequest()
                .body(UserActionResponse.error(null, "deactivate", "User ID is required"));
        }
        
        Map<String, Object> result = firebaseUserManagementService.deactivateUser(request.getUserId());
        
        if ((boolean) result.get("success")) {
            return ResponseEntity.ok(UserActionResponse.success(
                request.getUserId(),
                "deactivate",
                (String) result.get("message")
            ));
        } else {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(UserActionResponse.error(
                    request.getUserId(),
                    "deactivate",
                    (String) result.get("message")
                ));
        }
    }
    
    /**
     * POST /api/admin/users/activate
     * Activate a previously deactivated user account
     */
    @PostMapping("/activate")
    public ResponseEntity<UserActionResponse> activateUser(@RequestBody UserActionRequest request) {
        logger.info("📥 Request to activate user: {}", request.getUserId());
        
        if (request.getUserId() == null || request.getUserId().trim().isEmpty()) {
            return ResponseEntity.badRequest()
                .body(UserActionResponse.error(null, "activate", "User ID is required"));
        }
        
        Map<String, Object> result = firebaseUserManagementService.activateUser(request.getUserId());
        
        if ((boolean) result.get("success")) {
            return ResponseEntity.ok(UserActionResponse.success(
                request.getUserId(),
                "activate",
                (String) result.get("message")
            ));
        } else {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(UserActionResponse.error(
                    request.getUserId(),
                    "activate",
                    (String) result.get("message")
                ));
        }
    }
    
    /**
     * POST /api/admin/users/ban
     * Ban a user permanently
     */
    @PostMapping("/ban")
    public ResponseEntity<UserActionResponse> banUser(@RequestBody UserActionRequest request) {
        logger.info("📥 Request to ban user: {}", request.getUserId());
        
        if (request.getUserId() == null || request.getUserId().trim().isEmpty()) {
            return ResponseEntity.badRequest()
                .body(UserActionResponse.error(null, "ban", "User ID is required"));
        }
        
        Map<String, Object> result = firebaseUserManagementService.banUser(
            request.getUserId(),
            request.getReason()
        );
        
        if ((boolean) result.get("success")) {
            return ResponseEntity.ok(UserActionResponse.success(
                request.getUserId(),
                "ban",
                (String) result.get("message")
            ));
        } else {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(UserActionResponse.error(
                    request.getUserId(),
                    "ban",
                    (String) result.get("message")
                ));
        }
    }
    
    /**
     * POST /api/admin/users/unban
     * Unban a previously banned user
     */
    @PostMapping("/unban")
    public ResponseEntity<UserActionResponse> unbanUser(@RequestBody UserActionRequest request) {
        logger.info("📥 Request to unban user: {}", request.getUserId());
        
        if (request.getUserId() == null || request.getUserId().trim().isEmpty()) {
            return ResponseEntity.badRequest()
                .body(UserActionResponse.error(null, "unban", "User ID is required"));
        }
        
        Map<String, Object> result = firebaseUserManagementService.unbanUser(request.getUserId());
        
        if ((boolean) result.get("success")) {
            return ResponseEntity.ok(UserActionResponse.success(
                request.getUserId(),
                "unban",
                (String) result.get("message")
            ));
        } else {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(UserActionResponse.error(
                    request.getUserId(),
                    "unban",
                    (String) result.get("message")
                ));
        }
    }
    
    /**
     * DELETE /api/admin/users/{userId}
     * Permanently delete a user from Firebase
     */
    @DeleteMapping("/{userId}")
    public ResponseEntity<UserActionResponse> deleteUser(@PathVariable String userId) {
        logger.info("📥 Request to delete user: {}", userId);
        
        if (userId == null || userId.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                .body(UserActionResponse.error(null, "delete", "User ID is required"));
        }
        
        Map<String, Object> result = firebaseUserManagementService.deleteUser(userId);
        
        if ((boolean) result.get("success")) {
            return ResponseEntity.ok(UserActionResponse.success(
                userId,
                "delete",
                (String) result.get("message")
            ));
        } else {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(UserActionResponse.error(
                    userId,
                    "delete",
                    (String) result.get("message")
                ));
        }
    }
}

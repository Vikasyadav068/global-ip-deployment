package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserActionResponse {
    private boolean success;
    private String message;
    private String userId;
    private String action;
    
    public static UserActionResponse success(String userId, String action, String message) {
        return new UserActionResponse(true, message, userId, action);
    }
    
    public static UserActionResponse error(String userId, String action, String message) {
        return new UserActionResponse(false, message, userId, action);
    }
}

package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatbotResponse {
    private String message;
    private String type; // 'text', 'data', 'suggestion'
    private Object data; // For structured data responses
    private List<String> suggestions; // Quick reply suggestions
    private String queryType;
    private LocalDateTime timestamp;
    
    public ChatbotResponse(String message) {
        this.message = message;
        this.type = "text";
        this.timestamp = LocalDateTime.now();
    }
    
    public ChatbotResponse(String message, String type, Object data) {
        this.message = message;
        this.type = type;
        this.data = data;
        this.timestamp = LocalDateTime.now();
    }
}

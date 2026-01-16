package com.example.backend.controller;

import com.example.backend.dto.ChatbotRequest;
import com.example.backend.dto.ChatbotResponse;
import com.example.backend.model.ChatbotConversation;
import com.example.backend.service.ChatbotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chatbot")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class ChatbotController {
    
    private final ChatbotService chatbotService;
    
    /**
     * Process a chatbot message and return response
     */
    @PostMapping("/chat")
    public ResponseEntity<ChatbotResponse> chat(@RequestBody ChatbotRequest request) {
        try {
            log.info("Received chatbot request from user: {}, message: {}", request.getUserId(), request.getMessage());
            // Generate session ID if not provided
            if (request.getSessionId() == null || request.getSessionId().isEmpty()) {
                request.setSessionId(UUID.randomUUID().toString());
            }
            
            ChatbotResponse response = chatbotService.processMessage(request);
            log.info("Chatbot response generated successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error processing chatbot request: ", e);
            ChatbotResponse errorResponse = new ChatbotResponse(
                "I apologize, but I encountered an error processing your request. Please try again."
            );
            return ResponseEntity.ok(errorResponse);
        }
    }
    
    /**
     * Get conversation history for a user
     */
    @GetMapping("/history/{userId}")
    public ResponseEntity<List<ChatbotConversation>> getUserHistory(@PathVariable String userId) {
        try {
            List<ChatbotConversation> history = chatbotService.getConversationHistory(userId);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Get conversation history for a session
     */
    @GetMapping("/session/{sessionId}")
    public ResponseEntity<List<ChatbotConversation>> getSessionHistory(@PathVariable String sessionId) {
        try {
            List<ChatbotConversation> history = chatbotService.getSessionHistory(sessionId);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Chatbot service is running");
    }
}

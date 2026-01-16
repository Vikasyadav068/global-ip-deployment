package com.example.backend.repository;

import com.example.backend.model.ChatbotConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ChatbotConversationRepository extends JpaRepository<ChatbotConversation, Long> {
    
    // Find conversations by user ID
    List<ChatbotConversation> findByUserIdOrderByCreatedAtDesc(String userId);
    
    // Find conversations by session ID
    List<ChatbotConversation> findBySessionIdOrderByCreatedAtAsc(String sessionId);
    
    // Find recent conversations
    List<ChatbotConversation> findTop10ByOrderByCreatedAtDesc();
    
    // Count total conversations
    long countByUserId(String userId);
    
    // Find conversations within date range
    List<ChatbotConversation> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
}

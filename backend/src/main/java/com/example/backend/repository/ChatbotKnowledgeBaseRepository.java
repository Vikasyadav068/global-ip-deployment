package com.example.backend.repository;

import com.example.backend.model.ChatbotKnowledgeBase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatbotKnowledgeBaseRepository extends JpaRepository<ChatbotKnowledgeBase, Long> {
    
    // Find by category
    List<ChatbotKnowledgeBase> findByCategoryAndIsActiveTrue(String category);
    
    // Find all active knowledge base entries
    List<ChatbotKnowledgeBase> findByIsActiveTrueOrderByPriorityDesc();
    
    // Search by keyword (case-insensitive)
    @Query("SELECT c FROM ChatbotKnowledgeBase c WHERE c.isActive = true AND " +
           "(LOWER(c.question) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(c.answer) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<ChatbotKnowledgeBase> searchByKeyword(@Param("keyword") String keyword);
    
    // Find by priority range
    List<ChatbotKnowledgeBase> findByIsActiveTrueAndPriorityGreaterThanEqualOrderByPriorityDesc(Integer priority);
}

package com.example.backend.controller;

import com.example.backend.model.Faq;
import com.example.backend.repository.FaqRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/faq")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class FaqController {
    
    private final FaqRepository faqRepository;
    
    /**
     * Get all active FAQs
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllFaqs() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<Faq> faqs = faqRepository.findByIsActiveTrueOrderByDisplayOrderAsc();
            
            response.put("success", true);
            response.put("data", faqs);
            response.put("count", faqs.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error fetching FAQs: ", e);
            response.put("success", false);
            response.put("message", "Failed to fetch FAQs");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Get FAQs by category
     */
    @GetMapping("/category/{category}")
    public ResponseEntity<Map<String, Object>> getFaqsByCategory(@PathVariable String category) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<Faq> faqs = faqRepository.findByCategoryAndIsActiveTrueOrderByDisplayOrderAsc(category);
            
            response.put("success", true);
            response.put("data", faqs);
            response.put("category", category);
            response.put("count", faqs.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error fetching FAQs for category {}: ", category, e);
            response.put("success", false);
            response.put("message", "Failed to fetch FAQs for category: " + category);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Get FAQ by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getFaqById(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            return faqRepository.findById(id)
                .map(faq -> {
                    response.put("success", true);
                    response.put("data", faq);
                    return ResponseEntity.ok(response);
                })
                .orElseGet(() -> {
                    response.put("success", false);
                    response.put("message", "FAQ not found");
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
                });
            
        } catch (Exception e) {
            log.error("Error fetching FAQ {}: ", id, e);
            response.put("success", false);
            response.put("message", "Failed to fetch FAQ");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}

package com.example.backend.controller;

import com.example.backend.repository.TermsConditionsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/terms")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class TermsConditionsController {
    
    private final TermsConditionsRepository termsConditionsRepository;
    
    /**
     * Get active Terms and Conditions
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getActiveTerms() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            return termsConditionsRepository.findFirstByIsActiveTrueOrderByEffectiveDateDesc()
                .map(terms -> {
                    response.put("success", true);
                    response.put("data", terms);
                    return ResponseEntity.ok(response);
                })
                .orElseGet(() -> {
                    response.put("success", false);
                    response.put("message", "No active Terms and Conditions found");
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
                });
            
        } catch (Exception e) {
            log.error("Error fetching Terms and Conditions: ", e);
            response.put("success", false);
            response.put("message", "Failed to fetch Terms and Conditions");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Get Terms and Conditions by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getTermsById(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            return termsConditionsRepository.findById(id)
                .map(terms -> {
                    response.put("success", true);
                    response.put("data", terms);
                    return ResponseEntity.ok(response);
                })
                .orElseGet(() -> {
                    response.put("success", false);
                    response.put("message", "Terms and Conditions not found");
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
                });
            
        } catch (Exception e) {
            log.error("Error fetching Terms and Conditions {}: ", id, e);
            response.put("success", false);
            response.put("message", "Failed to fetch Terms and Conditions");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}

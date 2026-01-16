package com.example.backend.controller;
import com.example.backend.repository.PrivacyPolicyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/privacy")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class PrivacyPolicyController {
    
    private final PrivacyPolicyRepository privacyPolicyRepository;
    
    /**
     * Get active Privacy Policy
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getActivePrivacyPolicy() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            return privacyPolicyRepository.findFirstByIsActiveTrueOrderByEffectiveDateDesc()
                .map(privacy -> {
                    response.put("success", true);
                    response.put("data", privacy);
                    return ResponseEntity.ok(response);
                })
                .orElseGet(() -> {
                    response.put("success", false);
                    response.put("message", "No active Privacy Policy found");
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
                });
            
        } catch (Exception e) {
            log.error("Error fetching Privacy Policy: ", e);
            response.put("success", false);
            response.put("message", "Failed to fetch Privacy Policy");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Get Privacy Policy by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getPrivacyPolicyById(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            return privacyPolicyRepository.findById(id)
                .map(privacy -> {
                    response.put("success", true);
                    response.put("data", privacy);
                    return ResponseEntity.ok(response);
                })
                .orElseGet(() -> {
                    response.put("success", false);
                    response.put("message", "Privacy Policy not found");
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
                });
            
        } catch (Exception e) {
            log.error("Error fetching Privacy Policy {}: ", id, e);
            response.put("success", false);
            response.put("message", "Failed to fetch Privacy Policy");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}

package com.example.backend.controller;

import com.example.backend.repository.CookiePolicyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/cookie")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class CookiePolicyController {
    
    private final CookiePolicyRepository cookiePolicyRepository;
    
    /**
     * Get active Cookie Policy
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getActiveCookiePolicy() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            return cookiePolicyRepository.findFirstByIsActiveTrueOrderByEffectiveDateDesc()
                .map(cookie -> {
                    response.put("success", true);
                    response.put("data", cookie);
                    return ResponseEntity.ok(response);
                })
                .orElseGet(() -> {
                    response.put("success", false);
                    response.put("message", "No active Cookie Policy found");
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
                });
            
        } catch (Exception e) {
            log.error("Error fetching Cookie Policy: ", e);
            response.put("success", false);
            response.put("message", "Failed to fetch Cookie Policy");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Get Cookie Policy by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getCookiePolicyById(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            return cookiePolicyRepository.findById(id)
                .map(cookie -> {
                    response.put("success", true);
                    response.put("data", cookie);
                    return ResponseEntity.ok(response);
                })
                .orElseGet(() -> {
                    response.put("success", false);
                    response.put("message", "Cookie Policy not found");
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
                });
            
        } catch (Exception e) {
            log.error("Error fetching Cookie Policy by ID: ", e);
            response.put("success", false);
            response.put("message", "Failed to fetch Cookie Policy");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Get all Cookie Policies
     */
    @GetMapping("/all")
    public ResponseEntity<Map<String, Object>> getAllCookiePolicies() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            response.put("success", true);
            response.put("data", cookiePolicyRepository.findAll());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error fetching all Cookie Policies: ", e);
            response.put("success", false);
            response.put("message", "Failed to fetch Cookie Policies");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}

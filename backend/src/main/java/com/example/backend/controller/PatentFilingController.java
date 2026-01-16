package com.example.backend.controller;

import com.example.backend.model.PatentFiling;
import com.example.backend.repository.PatentFilingRepository;
import com.example.backend.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/patent-filing")
@CrossOrigin(origins = "*")
public class PatentFilingController {
    
    @Autowired
    private PatentFilingRepository patentFilingRepository;
    
    @Autowired
    private EmailService emailService;
    
    // Get total count of patent filings
    @GetMapping("/count")
    public ResponseEntity<Long> getPatentFilingsCount() {
        try {
            long count = patentFilingRepository.count();
            System.out.println("📊 Patent filings count requested: " + count);
            return ResponseEntity.ok(count);
        } catch (Exception e) {
            System.err.println("❌ ERROR getting patent filings count:");
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(0L);
        }
    }
    
    // Submit new patent filing
    @PostMapping("/submit")
    public ResponseEntity<Map<String, Object>> submitPatentFiling(@RequestBody PatentFiling patentFiling) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            System.out.println("=== Received Patent Filing Request ===");
            System.out.println("User ID: " + patentFiling.getUserId());
            System.out.println("User Email: " + patentFiling.getUserEmail());
            System.out.println("Applicant Name: " + patentFiling.getApplicantName());
            System.out.println("Applicant Email: " + patentFiling.getApplicantEmail());
            System.out.println("Invention Title: " + patentFiling.getInventionTitle());
            System.out.println("Payment ID: " + patentFiling.getPaymentId());
            
            // Save patent filing to database
            PatentFiling savedFiling = patentFilingRepository.save(patentFiling);
            
            System.out.println("✅ Patent filing saved successfully!");
            System.out.println("   ID: " + savedFiling.getId());
            System.out.println("   User Email: " + savedFiling.getUserEmail());
            System.out.println("   Applicant Email: " + savedFiling.getApplicantEmail());
            
            response.put("success", true);
            response.put("message", "Patent filing submitted successfully");
            response.put("id", savedFiling.getId());
            response.put("filingId", savedFiling.getId());
            response.put("savedData", Map.of(
                "userEmail", savedFiling.getUserEmail(),
                "applicantEmail", savedFiling.getApplicantEmail(),
                "inventionTitle", savedFiling.getInventionTitle()
            ));
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("❌ ERROR saving patent filing:");
            e.printStackTrace();
            
            response.put("success", false);
            response.put("message", "Failed to submit patent filing: " + e.getMessage());
            response.put("error", e.getClass().getSimpleName());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get all patent filings for a user
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<PatentFiling>> getUserPatentFilings(@PathVariable String userId) {
        try {
            System.out.println("📋 Fetching patent filings for user: " + userId);
            List<PatentFiling> filings = patentFilingRepository.findByUserId(userId);
            System.out.println("✅ Found " + filings.size() + " filings for user: " + userId);
            return ResponseEntity.ok(filings);
        } catch (Exception e) {
            System.err.println("❌ ERROR fetching filings for user " + userId + ":");
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
    
    // Get ALL patent filings (for admin/debugging)
    @GetMapping("/all")
    public ResponseEntity<List<PatentFiling>> getAllPatentFilings() {
        try {
            System.out.println("📋 Fetching ALL patent filings");
            List<PatentFiling> filings = patentFilingRepository.findAll();
            System.out.println("✅ Found " + filings.size() + " total filings");
            return ResponseEntity.ok(filings);
        } catch (Exception e) {
            System.err.println("❌ ERROR fetching all filings:");
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
    
    // Get patent filing by ID
    @GetMapping("/{id}")
    public ResponseEntity<PatentFiling> getPatentFilingById(@PathVariable Long id) {
        try {
            return patentFilingRepository.findById(id)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
    
    // Get all patent filings by status
    @GetMapping("/status/{status}")
    public ResponseEntity<List<PatentFiling>> getPatentFilingsByStatus(@PathVariable String status) {
        try {
            List<PatentFiling> filings = patentFilingRepository.findByStatus(status);
            return ResponseEntity.ok(filings);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
    
    // Update patent filing status
    @PutMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> updatePatentFilingStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> statusUpdate) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            return patentFilingRepository.findById(id)
                    .map(filing -> {
                        filing.setStatus(statusUpdate.get("status"));
                        patentFilingRepository.save(filing);
                        
                        response.put("success", true);
                        response.put("message", "Status updated successfully");
                        return ResponseEntity.ok(response);
                    })
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to update status: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Update patent filing stages with email notification on grant
    @PutMapping("/{id}/stages")
    public ResponseEntity<Map<String, Object>> updatePatentFilingStages(
            @PathVariable Long id,
            @RequestBody Map<String, Object> stageUpdates) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            return patentFilingRepository.findById(id)
                    .map(filing -> {
                        boolean wasGranted = filing.getStage5Granted() != null && filing.getStage5Granted();
                        
                        // Update stages based on request
                        if (stageUpdates.containsKey("stage1Filed")) {
                            filing.setStage1Filed((Boolean) stageUpdates.get("stage1Filed"));
                        }
                        if (stageUpdates.containsKey("stage2AdminReview")) {
                            filing.setStage2AdminReview((Boolean) stageUpdates.get("stage2AdminReview"));
                        }
                        if (stageUpdates.containsKey("stage3TechnicalReview")) {
                            filing.setStage3TechnicalReview((Boolean) stageUpdates.get("stage3TechnicalReview"));
                        }
                        if (stageUpdates.containsKey("stage4Verification")) {
                            filing.setStage4Verification((Boolean) stageUpdates.get("stage4Verification"));
                        }
                        if (stageUpdates.containsKey("stage5Granted")) {
                            filing.setStage5Granted((Boolean) stageUpdates.get("stage5Granted"));
                        }
                        
                        // Save admin processing details if provided
                        if (stageUpdates.containsKey("patentNumber")) {
                            filing.setPatentNumber((String) stageUpdates.get("patentNumber"));
                        }
                        if (stageUpdates.containsKey("grantedPatentPersonName")) {
                            filing.setGrantedPatentPersonName((String) stageUpdates.get("grantedPatentPersonName"));
                        }
                        if (stageUpdates.containsKey("location")) {
                            filing.setLocation((String) stageUpdates.get("location"));
                        }
                        
                        // Check if all stages are complete
                        boolean allStagesComplete = 
                            filing.getStage1Filed() != null && filing.getStage1Filed() &&
                            filing.getStage2AdminReview() != null && filing.getStage2AdminReview() &&
                            filing.getStage3TechnicalReview() != null && filing.getStage3TechnicalReview() &&
                            filing.getStage4Verification() != null && filing.getStage4Verification() &&
                            filing.getStage5Granted() != null && filing.getStage5Granted();
                        
                        // Update status based on stages
                        if (allStagesComplete) {
                            filing.setStatus("Granted");
                            
                            // Send email notification if patent just became granted
                            if (!wasGranted && filing.getStage5Granted()) {
                                try {
                                    emailService.sendPatentGrantedEmail(
                                        filing.getApplicantEmail(),
                                        filing.getApplicantName(),
                                        filing.getInventionTitle(),
                                        filing.getId()
                                    );
                                    System.out.println("✅ Patent granted email sent to: " + filing.getApplicantEmail());
                                } catch (Exception emailException) {
                                    System.err.println("❌ Failed to send patent granted email: " + emailException.getMessage());
                                    emailException.printStackTrace();
                                    // Continue even if email fails
                                }
                            }
                        } else if (filing.getStage4Verification() != null && filing.getStage4Verification()) {
                            filing.setStatus("Under Verification");
                        } else if (filing.getStage3TechnicalReview() != null && filing.getStage3TechnicalReview()) {
                            filing.setStatus("Technical Review");
                        } else if (filing.getStage2AdminReview() != null && filing.getStage2AdminReview()) {
                            filing.setStatus("Admin Review");
                        } else {
                            filing.setStatus("Filed");
                        }
                        
                        PatentFiling savedFiling = patentFilingRepository.save(filing);
                        
                        response.put("success", true);
                        response.put("message", "Stages updated successfully");
                        response.put("status", savedFiling.getStatus());
                        response.put("allStagesComplete", allStagesComplete);
                        response.put("emailSent", !wasGranted && allStagesComplete);
                        
                        return ResponseEntity.ok(response);
                    })
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            System.err.println("❌ ERROR updating patent filing stages:");
            e.printStackTrace();
            
            response.put("success", false);
            response.put("message", "Failed to update stages: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Reject patent filing with email notification
    @PutMapping("/{id}/reject")
    public ResponseEntity<Map<String, Object>> rejectPatentFiling(
            @PathVariable Long id,
            @RequestBody Map<String, Object> rejectionDetails) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            return patentFilingRepository.findById(id)
                    .map(filing -> {
                        // Update rejection details
                        String rejectedPatentNumber = (String) rejectionDetails.get("rejectedPatentNumber");
                        String rejectedPersonName = (String) rejectionDetails.get("rejectedPersonName");
                        String location = (String) rejectionDetails.get("location");
                        String status = (String) rejectionDetails.get("status");
                        
                        // Save rejection details to database
                        filing.setRejectedPatentNumber(rejectedPatentNumber);
                        filing.setRejectedPatentPersonName(rejectedPersonName);
                        filing.setLocation(location);
                        
                        // Set status to rejected
                        filing.setStatus(status != null ? status : "Patent is Rejected");
                        
                        PatentFiling savedFiling = patentFilingRepository.save(filing);
                        
                        // Send rejection email
                        boolean emailSent = false;
                        try {
                            emailService.sendPatentRejectedEmail(
                                filing.getApplicantEmail(),
                                filing.getApplicantName(),
                                filing.getInventionTitle(),
                                filing.getId(),
                                rejectedPatentNumber,
                                rejectedPersonName,
                                location
                            );
                            emailSent = true;
                            System.out.println("✅ Patent rejection email sent to: " + filing.getApplicantEmail());
                        } catch (Exception emailException) {
                            System.err.println("❌ Failed to send patent rejection email: " + emailException.getMessage());
                            emailException.printStackTrace();
                            // Continue even if email fails
                        }
                        
                        response.put("success", true);
                        response.put("message", "Patent rejected successfully");
                        response.put("status", savedFiling.getStatus());
                        response.put("emailSent", emailSent);
                        
                        return ResponseEntity.ok(response);
                    })
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            System.err.println("❌ ERROR rejecting patent filing:");
            e.printStackTrace();
            
            response.put("success", false);
            response.put("message", "Failed to reject patent: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Save user message to patent filing
    @PutMapping("/{id}/message")
    public ResponseEntity<?> saveMessage(@PathVariable Long id, @RequestBody Map<String, String> messageData) {
        try {
            String messageField = messageData.get("messageField"); // e.g., "m1", "m2", etc.
            String messageContent = messageData.get("messageContent");
            
            System.out.println("=== Saving Message to Patent Filing ===");
            System.out.println("Patent Filing ID: " + id);
            System.out.println("Message Field: " + messageField);
            System.out.println("Message Content: " + messageContent);
            
            return patentFilingRepository.findById(id)
                    .map(filing -> {
                        // Set the message based on the field name
                        switch (messageField) {
                            case "m1":
                                filing.setM1(messageContent);
                                break;
                            case "m2":
                                filing.setM2(messageContent);
                                break;
                            case "m3":
                                filing.setM3(messageContent);
                                break;
                            case "m4":
                                filing.setM4(messageContent);
                                break;
                            case "m5":
                                filing.setM5(messageContent);
                                break;
                            default:
                                return ResponseEntity.badRequest().body("Invalid message field: " + messageField);
                        }
                        
                        PatentFiling savedFiling = patentFilingRepository.save(filing);
                        System.out.println("✅ Message saved successfully to field: " + messageField);
                        
                        return ResponseEntity.ok(savedFiling);
                    })
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            System.err.println("❌ ERROR saving message:");
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to save message: " + e.getMessage());
        }
    }

    // Save admin reply to patent filing
    @PutMapping("/{id}/reply")
    public ResponseEntity<?> saveAdminReply(@PathVariable Long id, @RequestBody Map<String, String> replyData) {
        try {
            String replyField = replyData.get("replyField"); // e.g., "r1", "r2", "r3", "r4"
            String replyContent = replyData.get("replyContent");
            
            System.out.println("=== Saving Admin Reply to Patent Filing ===");
            System.out.println("Patent Filing ID: " + id);
            System.out.println("Reply Field: " + replyField);
            System.out.println("Reply Content: " + replyContent);
            
            return patentFilingRepository.findById(id)
                    .map(filing -> {
                        // Set the reply based on the field name
                        switch (replyField) {
                            case "r1":
                                filing.setR1(replyContent);
                                break;
                            case "r2":
                                filing.setR2(replyContent);
                                break;
                            case "r3":
                                filing.setR3(replyContent);
                                break;
                            case "r4":
                                filing.setR4(replyContent);
                                break;
                            default:
                                return ResponseEntity.badRequest().body("Invalid reply field: " + replyField);
                        }
                        
                        PatentFiling savedFiling = patentFilingRepository.save(filing);
                        System.out.println("✅ Admin reply saved successfully to field: " + replyField);
                        
                        return ResponseEntity.ok(savedFiling);
                    })
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            System.err.println("❌ ERROR saving admin reply:");
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to save admin reply: " + e.getMessage());
        }
    }
    
    // Search granted or rejected patent filings
    @GetMapping("/search/granted-rejected")
    public ResponseEntity<List<PatentFiling>> searchGrantedOrRejectedPatents() {
        try {
            System.out.println("🔍 Searching for granted or rejected patent filings...");
            
            // Find all patent filings with status "granted" or "rejected" (case-insensitive)
            List<PatentFiling> filings = patentFilingRepository.findGrantedOrRejectedPatents();
            
            System.out.println("✅ Found " + filings.size() + " granted or rejected patent filings");
            return ResponseEntity.ok(filings);
        } catch (Exception e) {
            System.err.println("❌ ERROR searching granted/rejected patents:");
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
    
    // Get patent count by state
    @GetMapping("/count-by-state")
    public ResponseEntity<Map<String, Long>> getPatentCountByState() {
        try {
            System.out.println("📊 Getting patent count by state...");
            
            List<Object[]> results = patentFilingRepository.countPatentsByState();
            Map<String, Long> stateCountMap = new HashMap<>();
            
            for (Object[] result : results) {
                String state = (String) result[0];
                Long count = (Long) result[1];
                stateCountMap.put(state, count);
            }
            
            System.out.println("✅ State-wise patent count retrieved: " + stateCountMap.size() + " states");
            return ResponseEntity.ok(stateCountMap);
        } catch (Exception e) {
            System.err.println("❌ ERROR getting state-wise patent count:");
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new HashMap<>());
        }
    }
    
    // Get distinct cities by state
    @GetMapping("/cities-by-state")
    public ResponseEntity<List<String>> getCitiesByState(@RequestParam("state") String state) {
        try {
            System.out.println("🏙️ Getting cities for state: '" + state + "'");
            
            if (state == null || state.trim().isEmpty()) {
                System.err.println("❌ ERROR: State parameter is null or empty");
                return ResponseEntity.badRequest().body(new ArrayList<>());
            }
            
            List<String> cities = patentFilingRepository.findDistinctCitiesByState(state.trim());
            
            System.out.println("✅ Found " + cities.size() + " unique cities in '" + state + "'");
            if (cities.size() > 0) {
                System.out.println("🌆 Cities: " + cities);
            } else {
                System.out.println("⚠️ No cities found - checking if state exists in database...");
            }
            
            return ResponseEntity.ok(cities);
        } catch (Exception e) {
            System.err.println("❌ ERROR getting cities by state:");
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ArrayList<>());
        }
    }
    
    // Activate patent (Admin only)
    @PutMapping("/{id}/activate")
    public ResponseEntity<Map<String, Object>> activatePatent(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            return patentFilingRepository.findById(id)
                    .map(filing -> {
                        filing.setIsActive(true);
                        PatentFiling savedFiling = patentFilingRepository.save(filing);
                        
                        System.out.println("✅ Patent " + id + " activated successfully");
                        
                        response.put("success", true);
                        response.put("message", "Patent activated successfully");
                        response.put("isActive", savedFiling.getIsActive());
                        
                        return ResponseEntity.ok(response);
                    })
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            System.err.println("❌ ERROR activating patent:");
            e.printStackTrace();
            
            response.put("success", false);
            response.put("message", "Failed to activate patent: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Deactivate patent (Admin only)
    @PutMapping("/{id}/deactivate")
    public ResponseEntity<Map<String, Object>> deactivatePatent(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            return patentFilingRepository.findById(id)
                    .map(filing -> {
                        filing.setIsActive(false);
                        PatentFiling savedFiling = patentFilingRepository.save(filing);
                        
                        System.out.println("✅ Patent " + id + " deactivated successfully");
                        
                        response.put("success", true);
                        response.put("message", "Patent deactivated successfully");
                        response.put("isActive", savedFiling.getIsActive());
                        
                        return ResponseEntity.ok(response);
                    })
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            System.err.println("❌ ERROR deactivating patent:");
            e.printStackTrace();
            
            response.put("success", false);
            response.put("message", "Failed to deactivate patent: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}

package com.example.backend.controller;

import com.example.backend.model.Patent;
import com.example.backend.model.SearchRequest;
import com.example.backend.model.YearlyPatentCount;
import com.example.backend.service.PatentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/patents")
@CrossOrigin(origins = "*")
public class PatentController {

    private final PatentService patentService;

    public PatentController(PatentService patentService) {
        this.patentService = patentService;
    }

    /**
     * CUSTOMIZATION 1:
     * Optional status-based filtering (backward compatible)
     * Example: GET /api/patents?status=APPROVED
     */
    @GetMapping
    public ResponseEntity<List<Patent>> getAllPatents(
            @RequestParam(required = false) String status) {

        List<Patent> patents;

        if (status != null && !status.trim().isEmpty()) {
            patents = patentService.getPatentsByStatus(status);
        } else {
            patents = patentService.getAllPatents();
        }

        return ResponseEntity.ok(patents);
    }

    @GetMapping("/count")
    public ResponseEntity<Long> getPatentCount() {
        long count = patentService.getPatentCount();
        return ResponseEntity.ok(count);
    }

    @GetMapping("/yearly-counts")
    public ResponseEntity<List<YearlyPatentCount>> getYearlyPatentCounts() {
        List<YearlyPatentCount> yearlyCounts = patentService.getYearlyPatentCounts();
        return ResponseEntity.ok(yearlyCounts);
    }

    @GetMapping("/status-counts")
    public ResponseEntity<java.util.Map<String, Long>> getPatentStatusCounts() {
        java.util.Map<String, Long> statusCounts = patentService.getPatentStatusCounts();
        return ResponseEntity.ok(statusCounts);
    }

    @GetMapping("/status-counts-by-date")
    public ResponseEntity<List<java.util.Map<String, Object>>> getPatentStatusCountsByDate() {
        List<java.util.Map<String, Object>> statusCountsByDate =
                patentService.getPatentStatusCountsByDate();
        return ResponseEntity.ok(statusCountsByDate);
    }

    @GetMapping("/local")
    public ResponseEntity<List<Patent>> getAllLocalPatents() {
        List<Patent> results = patentService.searchInLocalDatabase("");
        return ResponseEntity.ok(results);
    }

    @PostMapping("/search")
    public ResponseEntity<List<Patent>> searchPatents(@RequestBody SearchRequest request) {
        List<Patent> results = patentService.quickSearch(request);
        return ResponseEntity.ok(results);
    }

    @GetMapping("/{patentId}")
    public ResponseEntity<Patent> getPatent(@PathVariable String patentId) {
        Patent patent = patentService.getPatentById(patentId);
        if (patent != null) {
            return ResponseEntity.ok(patent);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * CUSTOMIZATION 2:
     * Input validation for request parameter
     */
    @GetMapping("/count-by-state")
    public ResponseEntity<?> getPatentCountByState(@RequestParam String state) {

        if (state == null || state.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body("State parameter is required");
        }

        long count = patentService.getPatentCountByState(state);
        return ResponseEntity.ok(count);
    }

    @GetMapping("/revenue")
    public ResponseEntity<java.util.Map<String, Object>> getPatentFilingRevenue(
            @RequestParam String filter) {

        java.util.Map<String, Object> revenue =
                patentService.getPatentFilingRevenue(filter);
        return ResponseEntity.ok(revenue);
    }
}

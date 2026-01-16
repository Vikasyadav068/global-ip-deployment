package com.example.backend.service;

import com.example.backend.model.Patent;
import com.example.backend.model.SearchRequest;
import com.example.backend.model.YearlyPatentCount;
import com.example.backend.repository.PatentRepository;
import com.example.backend.repository.PatentFilingRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class PatentService {

    private static final Logger logger = LoggerFactory.getLogger(PatentService.class);

    private final RestTemplate restTemplate;
    private final PatentRepository patentRepository;
    private final PatentFilingRepository patentFilingRepository;
    
    @Value("${serpapi.key}")
    private String serpApiKey;
    
    @Value("${serpapi.base.url}")
    private String serpApiBaseUrl;

    public PatentService(PatentRepository patentRepository, PatentFilingRepository patentFilingRepository) {
        this.restTemplate = new RestTemplate();
        this.patentRepository = patentRepository;
        this.patentFilingRepository = patentFilingRepository;
    }

    public List<Patent> getAllPatents() {
        List<Patent> patents = patentRepository.findAll();
        logger.info("Retrieved {} patents from database", patents.size());
        return patents;
    }

    public List<Patent> getPatentsByStatus(String status) {
        List<Patent> patents = patentRepository.findByStatusIgnoreCase(status);
        logger.info("Retrieved {} patents with status: {}", patents.size(), status);
        return patents;
    }

    public List<Patent> quickSearch(SearchRequest request) {
        List<Patent> results = new ArrayList<>();
        
        // First check local database
        List<Patent> dbResults = searchInDatabase(request.getQuery());
        if (!dbResults.isEmpty()) {
            logger.info("Found {} patents in local database", dbResults.size());
            return dbResults;
        }
        
        // If not found in database, try external API
        try {
            // Use google_patents engine with q parameter for keyword search
            String url = serpApiBaseUrl + "?engine=google_patents&q=" 
                + URLEncoder.encode(request.getQuery(), StandardCharsets.UTF_8.toString()) 
                + "&api_key=" + serpApiKey;
            logger.info("Calling SerpAPI with URL: {}", url.replaceAll("api_key=[^&]*", "api_key=***HIDDEN***"));
            String response = restTemplate.getForObject(url, String.class);
            logger.info("API Response received");

            JsonObject json = JsonParser.parseString(response).getAsJsonObject();
            
            // Check if organic_results exists
            if (json.has("organic_results") && json.get("organic_results").isJsonArray()) {
                var resultsArray = json.getAsJsonArray("organic_results");
                int count = Math.min(10, resultsArray.size()); // Get first 10 results
                
                for (int i = 0; i < count; i++) {
                    JsonObject patentObj = resultsArray.get(i).getAsJsonObject();
                    
                    // Skip scholar results, only process patent results
                    if (patentObj.has("is_scholar") && patentObj.get("is_scholar").getAsBoolean()) {
                        continue;
                    }
                    
                    Patent patent = new Patent();
                    
                    // Get patent ID
                    String patentId = patentObj.has("patent_id") ? patentObj.get("patent_id").getAsString() : 
                                     (patentObj.has("publication_number") ? patentObj.get("publication_number").getAsString() : "PATENT-" + i);
                    patent.setId(patentId);
                    patent.setIpRightIdentifier(patentId);
                    patent.setType("Patent");
                    patent.setAssetNumber(patentObj.has("publication_number") ? patentObj.get("publication_number").getAsString() : patentId);
                    
                    // Title
                    patent.setTitle(patentObj.has("title") ? patentObj.get("title").getAsString() : "Untitled Patent");
                    
                    // Abstract/Snippet
                    patent.setAbstractText(patentObj.has("snippet") ? patentObj.get("snippet").getAsString() : "No abstract available");
                    
                    // Assignee
                    patent.setAssignee(patentObj.has("assignee") ? patentObj.get("assignee").getAsString() : "N/A");
                    
                    // Inventor
                    patent.setInventor(patentObj.has("inventor") ? patentObj.get("inventor").getAsString() : "N/A");
                    
                    // Language as jurisdiction indicator
                    String jurisdiction = "N/A";
                    if (patentObj.has("language")) {
                        jurisdiction = patentObj.get("language").getAsString();
                    }
                    patent.setJurisdiction(jurisdiction);
                    
                    // Filing Date
                    patent.setFilingDate(patentObj.has("filing_date") ? patentObj.get("filing_date").getAsString() : 
                                        (patentObj.has("priority_date") ? patentObj.get("priority_date").getAsString() : "N/A"));
                    
                    // Status - determine from grant_date or country_status
                    String status = "Active";
                    if (patentObj.has("grant_date")) {
                        status = "Granted";
                    } else if (patentObj.has("filing_date") && !patentObj.has("grant_date")) {
                        status = "Application";
                    }
                    patent.setStatus(status);
                    
                    // CPC Classification
                    String classInfo = "N/A";
                    if (patentObj.has("cpc")) {
                        classInfo = patentObj.get("cpc").getAsString();
                        if (patentObj.has("cpc_description")) {
                            classInfo += " - " + patentObj.get("cpc_description").getAsString();
                        }
                    }
                    patent.setClassInfo(classInfo);
                    
                    // Additional details - combine multiple fields
                    StringBuilder details = new StringBuilder();
                    if (patentObj.has("publication_date")) {
                        details.append("Publication Date: ").append(patentObj.get("publication_date").getAsString()).append("; ");
                    }
                    if (patentObj.has("grant_date")) {
                        details.append("Grant Date: ").append(patentObj.get("grant_date").getAsString()).append("; ");
                    }
                    if (patentObj.has("priority_date")) {
                        details.append("Priority Date: ").append(patentObj.get("priority_date").getAsString()).append("; ");
                    }
                    if (patentObj.has("pdf")) {
                        details.append("PDF: ").append(patentObj.get("pdf").getAsString());
                    }
                    patent.setDetails(details.length() > 0 ? details.toString() : "N/A");
                    
                    patent.setApiSource("SerpAPI - Google Patents");
                    patent.setLastUpdated(java.time.LocalDateTime.now().toString());
                    
                    // Save to database
                    try {
                        patentRepository.save(patent);
                        logger.info("Saved patent to database: {}", patentId);
                    } catch (Exception e) {
                        logger.warn("Could not save patent to database: {}", e.getMessage());
                    }
                    
                    results.add(patent);
                    logger.info("Parsed patent: {} ({})", patent.getTitle(), patentId);
                }
                logger.info("Successfully parsed {} patents from API and saved to database", results.size());
            } else {
                logger.warn("No organic_results found in API response");
            }
        } catch (Exception e) {
            logger.error("Error calling SerpApi", e);
        }
        
        return results;
    }

    public Patent getPatentById(String patentId) {
        // First try to find in database
        var dbPatent = patentRepository.findById(patentId);
        if (dbPatent.isPresent()) {
            logger.info("Found patent in database: {}", patentId);
            return dbPatent.get();
        }
        
        // If not found, try API
        try {
            String url = serpApiBaseUrl + "?engine=google_patents_details&patent_id=" 
                + patentId + "&api_key=" + serpApiKey;
            logger.info("Fetching patent details for: {} (API key hidden)", patentId);
            String response = restTemplate.getForObject(url, String.class);

            JsonObject json = JsonParser.parseString(response).getAsJsonObject();
            Patent patent = new Patent();
            
            // Map API response to Patent model
            patent.setId(patentId);
            patent.setIpRightIdentifier(patentId);
            patent.setType("Patent");
            patent.setAssetNumber(patentId);
            patent.setTitle(json.has("title") ? json.get("title").getAsString() : "No title available");
            patent.setAbstractText(json.has("abstract") ? json.get("abstract").getAsString() : "No abstract available");
            patent.setAssignee(json.has("assignee") ? json.get("assignee").getAsString() : "N/A");
            patent.setInventor(json.has("inventor") ? json.get("inventor").getAsString() : "N/A");
            patent.setJurisdiction(json.has("jurisdiction") ? json.get("jurisdiction").getAsString() : "N/A");
            patent.setFilingDate(json.has("filing_date") ? json.get("filing_date").getAsString() : "N/A");
            patent.setStatus(json.has("status") ? json.get("status").getAsString() : "Active");
            patent.setClassInfo(json.has("classifications") ? json.get("classifications").toString() : "N/A");
            patent.setApiSource("SerpAPI");
            patent.setLastUpdated(java.time.LocalDateTime.now().toString());
            
            // Save to database
            try {
                patentRepository.save(patent);
                logger.info("Saved patent to database: {}", patentId);
            } catch (Exception e) {
                logger.warn("Could not save patent to database: {}", e.getMessage());
            }
            
            return patent;
        } catch (Exception e) {
            logger.error("Error fetching patent details", e);
            // Return mock data as fallback
            Patent patent = new Patent();
            patent.setIpRightIdentifier(patentId);
            patent.setTitle("Detailed Patent: " + patentId);
            patent.setAbstractText("This is detailed patent information for: " + patentId + ". Additional details would be fetched from the API.");
            patent.setFilingDate("2023-01-01");
            return patent;
        }
    }

    private List<Patent> getLocalPatents(String query) {
        // This method is deprecated - use searchInDatabase instead
        return searchInDatabase(query);
    }
    
    private List<Patent> searchInDatabase(String query) {
        List<Patent> dbPatents = new ArrayList<>();
        
        if (query == null || query.trim().isEmpty()) {
            dbPatents = patentRepository.findAll();
            logger.info("Retrieved {} patents from database (all)", dbPatents.size());
        } else {
            // Search by title, assignee, and inventor
            dbPatents.addAll(patentRepository.findByTitleContainingIgnoreCase(query));
            dbPatents.addAll(patentRepository.findByAssigneeContainingIgnoreCase(query));
            dbPatents.addAll(patentRepository.findByInventorContainingIgnoreCase(query));
            
            logger.info("Retrieved {} patents from database matching query: {}", dbPatents.size(), query);
        }
        
        return dbPatents;
    }

    /**
     * Search only in local database (my_project_db) - does NOT call external API
     */
    public List<Patent> searchInLocalDatabase(String query) {
        logger.info("Searching local database (my_project_db) for query: {}", query);
        return searchInDatabase(query);
    }

    /**
     * Get total count of patents stored in local database
     */
    public long getPatentCount() {
        long count = patentRepository.count();
        logger.info("Total patents in database (my_project_db): {}", count);
        return count;
    }
    
    /**
     * Get yearly patent counts for the last 7 years
     */
    public List<YearlyPatentCount> getYearlyPatentCounts() {
        logger.info("Fetching yearly patent counts from database");
        List<Object[]> results = patentRepository.getYearlyPatentCounts();
        
        return results.stream()
            .map(row -> {
                int year;
                if (row[0] instanceof String) {
                    year = Integer.parseInt((String) row[0]);
                } else {
                    year = ((Number) row[0]).intValue();
                }
                long count = ((Number) row[1]).longValue();
                return new YearlyPatentCount(year, count);
            })
            .collect(Collectors.toList());
    }
    
    /**
     * Get patent counts grouped by status
     */
    public java.util.Map<String, Long> getPatentStatusCounts() {
        logger.info("Fetching patent status counts from database");
        List<Patent> allPatents = patentRepository.findAll();
        
        return allPatents.stream()
            .collect(Collectors.groupingBy(
                patent -> patent.getStatus() != null && !patent.getStatus().trim().isEmpty() 
                    ? patent.getStatus() 
                    : "Unknown",
                Collectors.counting()
            ));
    }
    
    /**
     * Get patent status counts grouped by date (year/month)
     */
    public List<java.util.Map<String, Object>> getPatentStatusCountsByDate() {
        logger.info("Fetching patent status counts by date from database");
        List<Object[]> results = patentRepository.getPatentStatusCountsByDate();
        
        return results.stream()
            .map(row -> {
                java.util.Map<String, Object> map = new java.util.HashMap<>();
                map.put("status", row[0] != null ? row[0].toString() : "Unknown");
                map.put("count", ((Number) row[1]).longValue());
                map.put("year", row[2] != null ? row[2].toString() : null);
                map.put("month", row[3] != null ? row[3].toString() : null);
                return map;
            })
            .collect(Collectors.toList());
    }

    /**
     * Get count of patents from a specific state
     */
    public long getPatentCountByState(String state) {
        logger.info("Getting patent count for state: '{}'", state);
        long count = patentFilingRepository.countByApplicantState(state);
        logger.info("Found {} patents for state: '{}'", count, state);
        return count;
    }
    
    /**
     * Get patent filing revenue with filter (weekly or monthly)
     */
    public java.util.Map<String, Object> getPatentFilingRevenue(String filter) {
        logger.info("Getting patent filing revenue with filter: '{}'", filter);
        
        java.time.LocalDate startDate;
        java.time.LocalDate now = java.time.LocalDate.now();
        
        if ("weekly".equalsIgnoreCase(filter)) {
            startDate = now.minusDays(7);
        } else {
            startDate = now.minusMonths(1);
        }
        
        // Get count of filings in the date range
        long count = patentFilingRepository.countFilingsSince(startDate);
        
        // Calculate revenue as count * 500
        double totalRevenue = count * 500.0;
        
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("total", totalRevenue);
        response.put("count", count);
        
        logger.info("Found {} filings with total revenue: {}", count, totalRevenue);
        
        return response;
    }
}

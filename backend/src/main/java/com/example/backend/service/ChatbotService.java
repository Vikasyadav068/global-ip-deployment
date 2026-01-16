package com.example.backend.service;

import com.example.backend.dto.ChatbotRequest;
import com.example.backend.dto.ChatbotResponse;
import com.example.backend.model.ChatbotConversation;
import com.example.backend.model.ChatbotKnowledgeBase;
import com.example.backend.model.PatentFiling;
import com.example.backend.repository.ChatbotConversationRepository;
import com.example.backend.repository.ChatbotKnowledgeBaseRepository;
import com.example.backend.repository.PatentFilingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatbotService {
    
    private final ChatbotKnowledgeBaseRepository knowledgeBaseRepository;
    private final ChatbotConversationRepository conversationRepository;
    private final PatentFilingRepository patentFilingRepository;
    private final com.example.backend.repository.UserRepository userRepository;
    
    // @Transactional // Temporarily removed for debugging
    public ChatbotResponse processMessage(ChatbotRequest request) {
        try {
            if (request == null || request.getMessage() == null || request.getMessage().trim().isEmpty()) {
                ChatbotResponse errorResponse = new ChatbotResponse(
                    "I didn't receive a message. Please type something and try again."
                );
                errorResponse.setQueryType("error");
                return errorResponse;
            }
            
            String userMessage = request.getMessage().trim().toLowerCase();
            ChatbotResponse response;
            
            // Determine query type and generate response
            if (isGreeting(userMessage)) {
                response = handleGreeting(request);
            } else if (isPatentCountQuery(userMessage)) {
                response = handlePatentCountQuery(userMessage);
            } else if (isStatePatentQuery(userMessage)) {
                response = handleStatePatentQuery(userMessage);
            } else if (isCityPatentQuery(userMessage)) {
                response = handleCityPatentQuery(userMessage);
            } else if (isStatusQuery(userMessage)) {
                response = handleStatusQuery(userMessage);
            } else if (isUserRegistrationQuery(userMessage)) {
                response = handleUserRegistrationQuery(userMessage);
            } else if (isPatentAnalyticsQuery(userMessage)) {
                response = handlePatentAnalyticsQuery(userMessage);
            } else {
                response = handleGeneralQuery(userMessage);
            }
            
            // Ensure response is never null
            if (response == null) {
                response = new ChatbotResponse(
                    "I apologize, but I couldn't generate a response. Please try rephrasing your question."
                );
                response.setQueryType("error");
            }
            
            // Save conversation history (non-blocking)
            try {
                saveConversation(request, response);
            } catch (Exception e) {
                // Log error but don't fail the response
                System.err.println("Error saving conversation: " + e.getMessage());
            }
            
            return response;
        } catch (Exception e) {
            System.err.println("Error processing message: " + e.getMessage());
            e.printStackTrace();
            
            ChatbotResponse errorResponse = new ChatbotResponse(
                "I apologize, but I encountered an unexpected error. Please try again or contact support if the issue persists."
            );
            errorResponse.setQueryType("error");
            errorResponse.setSuggestions(Arrays.asList(
                "How many patents are there?",
                "Show subscription plans",
                "What features are available?"
            ));
            return errorResponse;
        }
    }
    
    private boolean isGreeting(String message) {
        if (message == null || message.isEmpty()) {
            return false;
        }
        String[] greetings = {"hi", "hello", "hey", "hi there", "hello there", "hey there", "greetings", "good morning", "good afternoon", "good evening"};
        for (String greeting : greetings) {
            if (message.equals(greeting) || message.startsWith(greeting + " ") || message.startsWith(greeting + ",")) {
                return true;
            }
        }
        return false;
    }
    
    private boolean isPatentCountQuery(String message) {
        return message.contains("how many patent") || 
               message.contains("total patent") ||
               message.contains("number of patent") ||
               message.contains("patent count");
    }
    
    private boolean isStatePatentQuery(String message) {
        return (message.contains("patent") && message.contains("state")) ||
               message.contains("state wise") ||
               message.contains("patents by state");
    }
    
    private boolean isCityPatentQuery(String message) {
        return (message.contains("patent") && message.contains("city")) ||
               message.contains("patents in") ||
               message.contains("patents by city");
    }
    
    private boolean isUserRegistrationQuery(String message) {
        return (message.contains("how many user") || message.contains("total user") ||
                message.contains("user registered") || message.contains("new user")) &&
               (message.contains("today") || message.contains("this week") || 
                message.contains("this month") || message.contains("last week") ||
                message.contains("last month") || message.contains("yesterday"));
    }
    
    private boolean isPatentAnalyticsQuery(String message) {
        return (message.contains("patent") && 
                (message.contains("today") || message.contains("this week") || 
                 message.contains("this month") || message.contains("yesterday") ||
                 message.contains("last week") || message.contains("last month"))) ||
               (message.contains("how many patent") && message.contains("filed")) ||
               (message.contains("patent") && message.contains("state") && 
                (message.contains("today") || message.contains("this week"))) ||
               (message.contains("patent") && (message.contains("city") || message.contains("district")) && 
                (message.contains("today") || message.contains("this week"))) ||
               message.contains("patents in") ||
               (message.contains("which district") && message.contains("patent")) ||
               (message.contains("which city") && message.contains("patent"));
    }
    
    private boolean isStatusQuery(String message) {
        return message.contains("patent status") ||
               message.contains("status") && message.contains("patent") ||
               message.contains("granted") ||
               message.contains("pending") ||
               message.contains("abandoned");
    }
    
    private ChatbotResponse handleGreeting(ChatbotRequest request) {
        try {
            String firstName = "there";
            
            // Try to get user's first name from database
            if (request.getUserId() != null && !request.getUserId().isEmpty()) {
                try {
                    Long userId = Long.parseLong(request.getUserId());
                    Optional<com.example.backend.model.User> userOpt = userRepository.findById(userId);
                    if (userOpt.isPresent() && userOpt.get().getFirstName() != null && !userOpt.get().getFirstName().isEmpty()) {
                        firstName = userOpt.get().getFirstName();
                    }
                } catch (NumberFormatException e) {
                    // If userId is email or other format, try to find by email
                    Optional<com.example.backend.model.User> userOpt = userRepository.findByEmail(request.getUserId());
                    if (userOpt.isPresent() && userOpt.get().getFirstName() != null && !userOpt.get().getFirstName().isEmpty()) {
                        firstName = userOpt.get().getFirstName();
                    }
                }
            }
            
            String greetingMessage = String.format(
                "Hi %s! 👋\n\nHow may I help you? I can assist you with:",
                firstName
            );
            
            // Get quick queries from knowledge base (top priority questions)
            List<String> quickQueries = new ArrayList<>();
            try {
                List<ChatbotKnowledgeBase> topQuestions = knowledgeBaseRepository.findByIsActiveTrueOrderByPriorityDesc();
                if (topQuestions != null && !topQuestions.isEmpty()) {
                    quickQueries = topQuestions.stream()
                        .filter(kb -> kb != null && kb.getQuestion() != null)
                        .limit(6)
                        .map(ChatbotKnowledgeBase::getQuestion)
                        .collect(Collectors.toList());
                }
            } catch (Exception e) {
                System.err.println("Error fetching quick queries: " + e.getMessage());
            }
            
            // Add default quick queries if none found
            if (quickQueries.isEmpty()) {
                quickQueries.add("How many patents are there?");
                quickQueries.add("Show subscription plans");
                quickQueries.add("How do I file a patent?");
                quickQueries.add("What features are available?");
                quickQueries.add("Show patents by state");
                quickQueries.add("What are the payment methods?");
            }
            
            ChatbotResponse response = new ChatbotResponse(greetingMessage);
            response.setQueryType("greeting");
            response.setSuggestions(quickQueries);
            
            return response;
        } catch (Exception e) {
            System.err.println("Error in handleGreeting: " + e.getMessage());
            e.printStackTrace();
            
            // Fallback greeting
            ChatbotResponse response = new ChatbotResponse(
                "Hi there! 👋\n\nHow may I help you? I can assist you with patent information, subscriptions, and more!"
            );
            response.setQueryType("greeting");
            response.setSuggestions(Arrays.asList(
                "How many patents are there?",
                "Show subscription plans",
                "How do I file a patent?",
                "What features are available?"
            ));
            return response;
        }
    }
    
    private ChatbotResponse handlePatentCountQuery(String message) {
        try {
            long totalPatents = patentFilingRepository.count();
            
            String responseMessage = String.format(
                "There are currently **%d patent filings** in the database. " +
                "This includes patents in all statuses (pending, granted, abandoned, etc.). " +
                "You can view detailed statistics on the dashboard.",
                totalPatents
            );
            
            Map<String, Object> data = new HashMap<>();
            data.put("totalPatents", totalPatents);
            data.put("timestamp", LocalDateTime.now());
            
            List<String> suggestions = Arrays.asList(
                "Show patents by state",
                "Show patent status distribution",
                "What features are available?"
            );
            
            ChatbotResponse response = new ChatbotResponse(
                responseMessage,
                "data",
                data
            );
            response.setSuggestions(suggestions);
            response.setQueryType("patent_count");
            
            return response;
        } catch (Exception e) {
            return new ChatbotResponse(
                "I encountered an error while fetching patent count. Please try again or contact support."
            );
        }
    }
    
    private ChatbotResponse handleStatePatentQuery(String message) {
        try {
            // Extract state name if mentioned
            String stateName = extractStateName(message);
            
            List<Object[]> statePatentCounts = patentFilingRepository.countPatentsByState();
            
            if (stateName != null && !stateName.isEmpty()) {
                // Find specific state count
                Optional<Object[]> stateData = statePatentCounts.stream()
                    .filter(data -> data[0] != null && 
                           data[0].toString().toLowerCase().contains(stateName.toLowerCase()))
                    .findFirst();
                
                if (stateData.isPresent()) {
                    String state = stateData.get()[0].toString();
                    Long count = ((Number) stateData.get()[1]).longValue();
                    
                    String responseMessage = String.format(
                        "**%s** has **%d patent filings**. " +
                        "You can view a detailed breakdown on the dashboard's State Patent Count panel.",
                        state, count
                    );
                    
                    Map<String, Object> data = new HashMap<>();
                    data.put("state", state);
                    data.put("count", count);
                    
                    ChatbotResponse response = new ChatbotResponse(responseMessage, "data", data);
                    response.setQueryType("state_patent_query");
                    return response;
                } else {
                    return new ChatbotResponse(
                        String.format("I couldn't find patent data for '%s'. Please check the state name and try again.", stateName)
                    );
                }
            } else {
                // Show all states summary
                Map<String, Long> stateMap = new HashMap<>();
                for (Object[] stateData : statePatentCounts) {
                    if (stateData[0] != null) {
                        stateMap.put(stateData[0].toString(), ((Number) stateData[1]).longValue());
                    }
                }
                
                // Get top 5 states
                List<Map.Entry<String, Long>> topStates = stateMap.entrySet().stream()
                    .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                    .limit(5)
                    .collect(Collectors.toList());
                
                StringBuilder responseMsg = new StringBuilder("**Top 5 states by patent count:**\n\n");
                for (int i = 0; i < topStates.size(); i++) {
                    Map.Entry<String, Long> entry = topStates.get(i);
                    responseMsg.append(String.format("%d. **%s**: %d patents\n", 
                        i + 1, entry.getKey(), entry.getValue()));
                }
                responseMsg.append("\nView the complete list on the dashboard's India Patent Panel.");
                
                ChatbotResponse response = new ChatbotResponse(responseMsg.toString(), "data", stateMap);
                response.setQueryType("state_patent_summary");
                response.setSuggestions(Arrays.asList(
                    "Show patents in Maharashtra",
                    "Show patents in Karnataka",
                    "Show patents by city"
                ));
                return response;
            }
        } catch (Exception e) {
            return new ChatbotResponse(
                "I encountered an error while fetching state-wise patent data. Please try again."
            );
        }
    }
    
    private ChatbotResponse handleCityPatentQuery(String message) {
        try {
            String cityName = extractCityName(message);
            
            if (cityName != null && !cityName.isEmpty()) {
                // Search for patents in specific city
                List<PatentFiling> allPatents = patentFilingRepository.findAll();
                long cityPatentCount = allPatents.stream()
                    .filter(p -> p.getApplicantCity() != null && 
                           p.getApplicantCity().toLowerCase().contains(cityName.toLowerCase()))
                    .count();
                
                String responseMessage;
                if (cityPatentCount > 0) {
                    responseMessage = String.format(
                        "**%s** has **%d patent filings**. " +
                        "Use the dashboard filters to explore these patents in detail.",
                        cityName, cityPatentCount
                    );
                } else {
                    responseMessage = String.format(
                        "I couldn't find any patents for '%s'. " +
                        "Please check the city name or try searching by state.",
                        cityName
                    );
                }
                
                Map<String, Object> data = new HashMap<>();
                data.put("city", cityName);
                data.put("count", cityPatentCount);
                
                ChatbotResponse response = new ChatbotResponse(responseMessage, "data", data);
                response.setQueryType("city_patent_query");
                return response;
            } else {
                return new ChatbotResponse(
                    "Please specify a city name. For example: 'How many patents in Mumbai?' or 'Patents in Bangalore'"
                );
            }
        } catch (Exception e) {
            return new ChatbotResponse(
                "I encountered an error while fetching city patent data. Please try again."
            );
        }
    }
    
    private ChatbotResponse handleStatusQuery(String message) {
        try {
            // Count patents by status
            List<PatentFiling> allPatents = patentFilingRepository.findAll();
            
            Map<String, Long> statusCounts = allPatents.stream()
                .filter(p -> p.getStatus() != null)
                .collect(Collectors.groupingBy(
                    p -> p.getStatus(),
                    Collectors.counting()
                ));
            
            StringBuilder responseMessage = new StringBuilder("**Patent Status Distribution:**\n\n");
            
            statusCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .forEach(entry -> {
                    responseMessage.append(String.format("- **%s**: %d patents\n", 
                        entry.getKey(), entry.getValue()));
                });
            
            responseMessage.append("\nYou can filter by specific status on the dashboard.");
            
            ChatbotResponse response = new ChatbotResponse(
                responseMessage.toString(),
                "data",
                statusCounts
            );
            response.setQueryType("status_query");
            response.setSuggestions(Arrays.asList(
                "Show granted patents",
                "Show pending patents",
                "What are patent statuses?"
            ));
            
            return response;
        } catch (Exception e) {
            return new ChatbotResponse(
                "I encountered an error while fetching patent status data. Please try again."
            );
        }
    }
    
    private ChatbotResponse handleUserRegistrationQuery(String message) {
        try {
            java.time.LocalDateTime startDate = getStartDateFromQuery(message);
            String timeFrame = getTimeFrameFromQuery(message);
            
            long userCount = userRepository.countUsersRegisteredSince(startDate);
            
            String responseMessage = String.format(
                "📊 **User Registration Analytics - %s**\n\n" +
                "✅ Total users registered: **%d**\n\n" +
                "💡 *This data is fetched in real-time from the database.*",
                timeFrame,
                userCount
            );
            
            ChatbotResponse response = new ChatbotResponse(
                responseMessage,
                "analytics",
                java.util.Map.of("count", userCount, "timeFrame", timeFrame)
            );
            response.setQueryType("user_registration_analytics");
            response.setSuggestions(Arrays.asList(
                "How many patents filed today?",
                "Show patents by state this week",
                "How many users registered this month?"
            ));
            
            return response;
        } catch (Exception e) {
            System.err.println("Error in user registration query: " + e.getMessage());
            return new ChatbotResponse(
                "I encountered an error while fetching user registration data. Please try again."
            );
        }
    }
    
    private ChatbotResponse handlePatentAnalyticsQuery(String message) {
        try {
            java.time.LocalDate startDate = getStartDateFromQuery(message).toLocalDate();
            String timeFrame = getTimeFrameFromQuery(message);
            
            long totalPatents = patentFilingRepository.countPatentsFiledSince(startDate);
            
            StringBuilder responseMessage = new StringBuilder();
            responseMessage.append(String.format("📊 **Patent Filing Analytics - %s**\n\n", timeFrame));
            responseMessage.append(String.format("✅ Total patents filed: **%d**\n\n", totalPatents));
            
            // Check if query asks for specific state's districts/cities
            String specificState = extractStateName(message);
            
            // Check if query asks for state-wise breakdown
            if (message.contains("state") && specificState == null) {
                List<Object[]> stateData = patentFilingRepository.countPatentsByStateSince(startDate);
                if (!stateData.isEmpty()) {
                    responseMessage.append("**State-wise breakdown:**\n");
                    for (Object[] row : stateData) {
                        String state = (String) row[0];
                        Long count = (Long) row[1];
                        responseMessage.append(String.format("- **%s**: %d patents\n", state, count));
                    }
                    responseMessage.append("\n");
                }
            }
            
            // Check if query asks for city-wise breakdown in a specific state
            if (specificState != null && (message.contains("city") || message.contains("district") || message.contains("in " + specificState.toLowerCase()))) {
                List<Object[]> cityData = patentFilingRepository.countPatentsByCityInStateSince(startDate, specificState);
                if (!cityData.isEmpty()) {
                    responseMessage.append(String.format("**Cities/Districts in %s:**\n", specificState));
                    for (Object[] row : cityData) {
                        String city = (String) row[0];
                        Long count = (Long) row[1];
                        responseMessage.append(String.format("- **%s**: %d patents\n", city, count));
                    }
                    responseMessage.append("\n");
                } else {
                    responseMessage.append(String.format("No patents found in %s for %s.\n\n", specificState, timeFrame.toLowerCase()));
                }
            }
            // Check if query asks for general city-wise breakdown
            else if (message.contains("city") || message.contains("district")) {
                List<Object[]> cityData = patentFilingRepository.countPatentsByCitySince(startDate);
                if (!cityData.isEmpty()) {
                    responseMessage.append("**City/District-wise breakdown (Top 10):**\n");
                    int limit = Math.min(10, cityData.size());
                    for (int i = 0; i < limit; i++) {
                        Object[] row = cityData.get(i);
                        String city = (String) row[0];
                        Long count = (Long) row[1];
                        responseMessage.append(String.format("- **%s**: %d patents\n", city, count));
                    }
                    if (cityData.size() > 10) {
                        responseMessage.append(String.format("... and %d more cities\n", cityData.size() - 10));
                    }
                    responseMessage.append("\n");
                }
            }
            
            responseMessage.append("💡 *This data is fetched in real-time from the database.*");
            
            ChatbotResponse response = new ChatbotResponse(
                responseMessage.toString(),
                "analytics",
                java.util.Map.of("count", totalPatents, "timeFrame", timeFrame)
            );
            response.setQueryType("patent_analytics");
            response.setSuggestions(Arrays.asList(
                "How many users registered today?",
                "Show patents by state this week",
                "Which cities have most patents today?"
            ));
            
            return response;
        } catch (Exception e) {
            System.err.println("Error in patent analytics query: " + e.getMessage());
            e.printStackTrace();
            return new ChatbotResponse(
                "I encountered an error while fetching patent analytics data. Please try again."
            );
        }
    }
    
    private java.time.LocalDateTime getStartDateFromQuery(String message) {
        String lowerMessage = message.toLowerCase();
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        
        if (lowerMessage.contains("today")) {
            return now.toLocalDate().atStartOfDay();
        } else if (lowerMessage.contains("yesterday")) {
            return now.minusDays(1).toLocalDate().atStartOfDay();
        } else if (lowerMessage.contains("this week")) {
            return now.minusDays(now.getDayOfWeek().getValue() - 1).toLocalDate().atStartOfDay();
        } else if (lowerMessage.contains("last week")) {
            return now.minusDays(now.getDayOfWeek().getValue() + 6).toLocalDate().atStartOfDay();
        } else if (lowerMessage.contains("this month")) {
            return now.withDayOfMonth(1).toLocalDate().atStartOfDay();
        } else if (lowerMessage.contains("last month")) {
            return now.minusMonths(1).withDayOfMonth(1).toLocalDate().atStartOfDay();
        } else if (lowerMessage.contains("last 7 days")) {
            return now.minusDays(7);
        } else if (lowerMessage.contains("last 30 days")) {
            return now.minusDays(30);
        }
        
        // Default to today
        return now.toLocalDate().atStartOfDay();
    }
    
    private String getTimeFrameFromQuery(String message) {
        String lowerMessage = message.toLowerCase();
        
        if (lowerMessage.contains("today")) return "Today";
        if (lowerMessage.contains("yesterday")) return "Yesterday";
        if (lowerMessage.contains("this week")) return "This Week";
        if (lowerMessage.contains("last week")) return "Last Week";
        if (lowerMessage.contains("this month")) return "This Month";
        if (lowerMessage.contains("last month")) return "Last Month";
        if (lowerMessage.contains("last 7 days")) return "Last 7 Days";
        if (lowerMessage.contains("last 30 days")) return "Last 30 Days";
        
        return "Today";
    }
    
    private ChatbotResponse handleGeneralQuery(String message) {
        try {
            // Search knowledge base
            List<ChatbotKnowledgeBase> allKnowledge = knowledgeBaseRepository.findByIsActiveTrueOrderByPriorityDesc();
            
            // Find best match based on keywords
            ChatbotKnowledgeBase bestMatch = null;
            int highestScore = 0;
            
            // Also track top 3 matches for better suggestions
            List<ChatbotKnowledgeBase> topMatches = new ArrayList<>();
            
            for (ChatbotKnowledgeBase kb : allKnowledge) {
                int score = calculateMatchScore(message, kb);
                if (score > highestScore) {
                    highestScore = score;
                    bestMatch = kb;
                }
                if (score > 0) {
                    topMatches.add(kb);
                }
            }
            
            // Sort top matches by score
            topMatches.sort((a, b) -> Integer.compare(
                calculateMatchScore(message, b),
                calculateMatchScore(message, a)
            ));
            
            // Lower threshold to accept any match with score >= 3 (very lenient)
            // This ensures almost all knowledge base entries can be matched
            if (bestMatch != null && highestScore >= 3) {
                ChatbotResponse response = new ChatbotResponse(bestMatch.getAnswer());
                response.setQueryType("knowledge_base");
                
                // Add related suggestions from top matches
                List<String> suggestions = new ArrayList<>();
                for (int i = 0; i < Math.min(4, topMatches.size()); i++) {
                    ChatbotKnowledgeBase kb = topMatches.get(i);
                    if (kb != null && kb.getQuestion() != null && !kb.equals(bestMatch)) {
                        suggestions.add(kb.getQuestion());
                    }
                }
                
                // Also add category-related suggestions
                if (suggestions.size() < 3) {
                    List<String> categorySuggestions = getRelatedSuggestions(bestMatch.getCategory());
                    if (categorySuggestions != null) {
                        for (String suggestion : categorySuggestions) {
                            if (!suggestions.contains(suggestion) && suggestions.size() < 4) {
                                suggestions.add(suggestion);
                            }
                        }
                    }
                }
                
                if (!suggestions.isEmpty()) {
                    response.setSuggestions(suggestions);
                }
                
                return response;
            } else {
                // Default response
                String defaultMessage = "I'm here to help! I can assist you with:\n\n" +
                    "- **Patent Information**: Total patents, patents by state/city\n" +
                    "- **Payment & Subscriptions**: Plans, pricing, payment methods\n" +
                    "- **Dashboard Features**: Charts, filters, analytics\n" +
                    "- **Patent Filing**: How to file, track status\n" +
                    "- **Platform Help**: Navigation, features, support\n\n" +
                    "What would you like to know?";
                
                ChatbotResponse response = new ChatbotResponse(defaultMessage);
                response.setQueryType("general_help");
                response.setSuggestions(Arrays.asList(
                    "How many patents are there?",
                    "Show subscription plans",
                    "How do I file a patent?",
                    "What features are available?"
                ));
                return response;
            }
        } catch (Exception e) {
            // Return default help message on any error
            String errorMessage = "I'm here to help! I can assist you with:\n\n" +
                "- **Patent Information**: Total patents, patents by state/city\n" +
                "- **Payment & Subscriptions**: Plans, pricing, payment methods\n" +
                "- **Dashboard Features**: Charts, filters, analytics\n" +
                "- **Patent Filing**: How to file, track status\n" +
                "- **Platform Help**: Navigation, features, support\n\n" +
                "What would you like to know?";
            
            ChatbotResponse response = new ChatbotResponse(errorMessage);
            response.setQueryType("general_help");
            response.setSuggestions(Arrays.asList(
                "How many patents are there?",
                "Show subscription plans",
                "How do I file a patent?"
            ));
            return response;
        }
    }
    
    private int calculateMatchScore(String message, ChatbotKnowledgeBase kb) {
        if (kb == null || message == null || message.isEmpty()) {
            return 0;
        }
        
        int score = 0;
        String lowerMessage = message.toLowerCase().trim();
        
        // Remove common punctuation for better matching
        String cleanMessage = lowerMessage.replaceAll("[?!.,;:]", " ").trim();
        
        // 1. Exact match - highest priority
        if (kb.getQuestion() != null) {
            String lowerQuestion = kb.getQuestion().toLowerCase().trim();
            String cleanQuestion = lowerQuestion.replaceAll("[?!.,;:]", " ").trim();
            
            if (cleanMessage.equals(cleanQuestion)) {
                score += 200; // Increased from 100
            } else if (lowerMessage.equals(lowerQuestion)) {
                score += 150;
            } else if (cleanMessage.contains(cleanQuestion)) {
                score += 80; // Increased from 50
            } else if (cleanQuestion.contains(cleanMessage)) {
                score += 70;
            }
            
            // Check for similar structure (Levenshtein-like simple check)
            if (areSimilar(cleanMessage, cleanQuestion)) {
                score += 40;
            }
        }
        
        // 2. Check keywords with varying weights
        if (kb.getKeywords() != null && kb.getKeywords().length > 0) {
            int keywordMatches = 0;
            int totalKeywords = kb.getKeywords().length;
            
            for (String keyword : kb.getKeywords()) {
                if (keyword != null && !keyword.isEmpty()) {
                    String lowerKeyword = keyword.toLowerCase().trim();
                    String cleanKeyword = lowerKeyword.replaceAll("[?!.,;:]", " ").trim();
                    
                    // Exact keyword match in message
                    if (cleanMessage.contains(cleanKeyword)) {
                        keywordMatches++;
                        score += 20; // Increased from 15
                    } else if (lowerMessage.contains(lowerKeyword)) {
                        keywordMatches++;
                        score += 15;
                    }
                    
                    // Check for word boundaries and partial matches
                    String[] messageWords = cleanMessage.split("\\s+");
                    String[] keywordWords = cleanKeyword.split("\\s+");
                    
                    for (String msgWord : messageWords) {
                        if (msgWord.length() > 2) { // Skip very short words
                            for (String kwWord : keywordWords) {
                                if (kwWord.length() > 2) {
                                    // Exact word match
                                    if (msgWord.equals(kwWord)) {
                                        score += 8;
                                    } 
                                    // Starts with match
                                    else if (msgWord.startsWith(kwWord) && kwWord.length() >= 3) {
                                        score += 5;
                                    } 
                                    else if (kwWord.startsWith(msgWord) && msgWord.length() >= 3) {
                                        score += 5;
                                    }
                                    // Contains match for longer words
                                    else if (msgWord.length() >= 5 && kwWord.length() >= 4 && 
                                            (msgWord.contains(kwWord) || kwWord.contains(msgWord))) {
                                        score += 3;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // Bonus for multiple keyword matches
            if (keywordMatches > 1) {
                score += keywordMatches * 10; // Increased from 5
            }
            
            // Extra bonus if most keywords match
            if (totalKeywords > 0 && keywordMatches >= totalKeywords / 2) {
                score += 25;
            }
        }
        
        // 3. Check category relevance
        if (kb.getCategory() != null && !kb.getCategory().isEmpty()) {
            String lowerCategory = kb.getCategory().toLowerCase();
            if (lowerMessage.contains(lowerCategory)) {
                score += 15; // Increased from 10
            }
            // Also check individual category words
            String[] categoryWords = lowerCategory.split("\\s+");
            for (String catWord : categoryWords) {
                if (catWord.length() > 3 && lowerMessage.contains(catWord)) {
                    score += 5;
                }
            }
        }
        
        // 4. Word overlap between message and question
        if (kb.getQuestion() != null) {
            String[] messageWords = cleanMessage.split("\\s+");
            String[] questionWords = kb.getQuestion().toLowerCase().replaceAll("[?!.,;:]", " ").trim().split("\\s+");
            int wordOverlap = 0;
            int significantOverlap = 0;
            
            for (String msgWord : messageWords) {
                if (msgWord.length() > 2) { // Skip very short words
                    for (String qWord : questionWords) {
                        if (qWord.length() > 2) {
                            if (msgWord.equals(qWord)) {
                                wordOverlap++;
                                if (msgWord.length() >= 5) {
                                    significantOverlap++; // Longer words are more significant
                                }
                            }
                        }
                    }
                }
            }
            score += wordOverlap * 4; // Increased from 3
            score += significantOverlap * 8; // Extra for significant words
        }
        
        // 5. Check answer content for keyword matches (helps with intent understanding)
        if (kb.getAnswer() != null && !kb.getAnswer().isEmpty()) {
            String lowerAnswer = kb.getAnswer().toLowerCase();
            String[] messageWords = cleanMessage.split("\\s+");
            int answerMatches = 0;
            
            for (String msgWord : messageWords) {
                if (msgWord.length() > 4 && lowerAnswer.contains(msgWord)) {
                    answerMatches++;
                }
            }
            
            if (answerMatches > 0) {
                score += answerMatches * 2;
            }
        }
        
        // 6. Boost score by priority (knowledge base priority)
        if (kb.getPriority() != null && kb.getPriority() > 0) {
            score += kb.getPriority();
        }
        
        return score;
    }
    
    // Helper method to check if two strings are similar (simple similarity check)
    private boolean areSimilar(String s1, String s2) {
        if (s1 == null || s2 == null) {
            return false;
        }
        
        // If lengths are very different, not similar
        int lenDiff = Math.abs(s1.length() - s2.length());
        if (lenDiff > Math.max(s1.length(), s2.length()) * 0.4) {
            return false;
        }
        
        // Check character overlap
        String[] words1 = s1.split("\\s+");
        String[] words2 = s2.split("\\s+");
        
        int commonWords = 0;
        for (String w1 : words1) {
            for (String w2 : words2) {
                if (w1.equals(w2) && w1.length() > 2) {
                    commonWords++;
                }
            }
        }
        
        // If more than 50% of words match, consider similar
        int minWords = Math.min(words1.length, words2.length);
        return minWords > 0 && commonWords >= minWords * 0.5;
    }
    
    private List<String> getRelatedSuggestions(String category) {
        try {
            if (category == null || category.isEmpty()) {
                return new ArrayList<>();
            }
            
            List<ChatbotKnowledgeBase> relatedKb = knowledgeBaseRepository.findByCategoryAndIsActiveTrue(category);
            
            if (relatedKb == null || relatedKb.isEmpty()) {
                return new ArrayList<>();
            }
            
            return relatedKb.stream()
                .filter(kb -> kb != null && kb.getQuestion() != null)
                .limit(3)
                .map(ChatbotKnowledgeBase::getQuestion)
                .collect(Collectors.toList());
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }
    
    private String extractStateName(String message) {
        if (message == null || message.isEmpty()) {
            return null;
        }
        
        // Common Indian states with variations
        Map<String, String[]> stateVariations = new HashMap<>();
        stateVariations.put("Maharashtra", new String[]{"maharashtra", "mh"});
        stateVariations.put("Karnataka", new String[]{"karnataka", "ka"});
        stateVariations.put("Tamil Nadu", new String[]{"tamil nadu", "tamilnadu", "tn"});
        stateVariations.put("Delhi", new String[]{"delhi", "new delhi", "dl"});
        stateVariations.put("Gujarat", new String[]{"gujarat", "gj"});
        stateVariations.put("West Bengal", new String[]{"west bengal", "westbengal", "bengal", "wb"});
        stateVariations.put("Rajasthan", new String[]{"rajasthan", "rj"});
        stateVariations.put("Uttar Pradesh", new String[]{"uttar pradesh", "uttarpradesh", "up"});
        stateVariations.put("Kerala", new String[]{"kerala", "kl"});
        stateVariations.put("Telangana", new String[]{"telangana", "ts"});
        stateVariations.put("Andhra Pradesh", new String[]{"andhra pradesh", "andhrapradesh", "ap"});
        stateVariations.put("Madhya Pradesh", new String[]{"madhya pradesh", "madhyapradesh", "mp"});
        stateVariations.put("Haryana", new String[]{"haryana", "hr"});
        stateVariations.put("Punjab", new String[]{"punjab", "pb"});
        stateVariations.put("Goa", new String[]{"goa", "ga"});
        stateVariations.put("Odisha", new String[]{"odisha", "orissa", "or"});
        stateVariations.put("Bihar", new String[]{"bihar", "br"});
        stateVariations.put("Assam", new String[]{"assam", "as"});
        stateVariations.put("Jharkhand", new String[]{"jharkhand", "jh"});
        stateVariations.put("Chhattisgarh", new String[]{"chhattisgarh", "chattisgarh", "cg"});
        
        String lowerMessage = message.toLowerCase();
        
        // Check for specific patterns that indicate ALL states request
        if (lowerMessage.matches(".*\\b(show|display|list)\\s+(all\\s+)?patents?\\s+by\\s+state.*") ||
            lowerMessage.matches(".*\\bstate\\s*wise\\s+patents?.*") ||
            lowerMessage.matches(".*\\bpatents?\\s+by\\s+state.*")) {
            // User wants all states, not a specific state
            return null;
        }
        
        // Extract state name only if it appears as a distinct word or phrase
        for (Map.Entry<String, String[]> entry : stateVariations.entrySet()) {
            for (String variation : entry.getValue()) {
                // Use word boundary matching to avoid partial matches
                // For multi-word states, check direct containment
                if (variation.contains(" ")) {
                    if (lowerMessage.contains(variation)) {
                        return entry.getKey();
                    }
                } else {
                    // For single-word states, use word boundary check
                    String pattern = "\\b" + variation + "\\b";
                    if (lowerMessage.matches(".*" + pattern + ".*")) {
                        return entry.getKey();
                    }
                }
            }
        }
        
        return null;
    }
    
    private String extractCityName(String message) {
        if (message == null || message.isEmpty()) {
            return null;
        }
        
        // Common Indian cities with variations
        Map<String, String[]> cityVariations = new HashMap<>();
        cityVariations.put("Mumbai", new String[]{"mumbai", "bombay"});
        cityVariations.put("Bangalore", new String[]{"bangalore", "bengaluru"});
        cityVariations.put("Delhi", new String[]{"delhi", "new delhi"});
        cityVariations.put("Hyderabad", new String[]{"hyderabad", "hyd"});
        cityVariations.put("Chennai", new String[]{"chennai", "madras"});
        cityVariations.put("Kolkata", new String[]{"kolkata", "calcutta"});
        cityVariations.put("Pune", new String[]{"pune", "poona"});
        cityVariations.put("Ahmedabad", new String[]{"ahmedabad", "amdavad"});
        cityVariations.put("Surat", new String[]{"surat"});
        cityVariations.put("Jaipur", new String[]{"jaipur"});
        cityVariations.put("Lucknow", new String[]{"lucknow"});
        cityVariations.put("Kanpur", new String[]{"kanpur", "cawnpore"});
        cityVariations.put("Nagpur", new String[]{"nagpur"});
        cityVariations.put("Indore", new String[]{"indore"});
        cityVariations.put("Thane", new String[]{"thane"});
        cityVariations.put("Bhopal", new String[]{"bhopal"});
        cityVariations.put("Visakhapatnam", new String[]{"visakhapatnam", "vizag", "vishakhapatnam"});
        cityVariations.put("Kochi", new String[]{"kochi", "cochin"});
        cityVariations.put("Gurgaon", new String[]{"gurgaon", "gurugram"});
        cityVariations.put("Noida", new String[]{"noida"});
        
        String lowerMessage = message.toLowerCase();
        
        for (Map.Entry<String, String[]> entry : cityVariations.entrySet()) {
            for (String variation : entry.getValue()) {
                if (lowerMessage.contains(variation)) {
                    return entry.getKey();
                }
            }
        }
        
        return null;
    }
    
    private void saveConversation(ChatbotRequest request, ChatbotResponse response) {
        try {
            ChatbotConversation conversation = new ChatbotConversation();
            conversation.setUserId(request.getUserId());
            conversation.setSessionId(request.getSessionId());
            conversation.setUserMessage(request.getMessage());
            conversation.setBotResponse(response.getMessage());
            conversation.setQueryType(response.getQueryType());
            
            // Save metadata as JSON string if data is present
            if (response.getData() != null) {
                // Simple JSON conversion (you can use Jackson or Gson for complex objects)
                conversation.setMetadata(response.getData().toString());
            }
            
            conversationRepository.save(conversation);
        } catch (Exception e) {
            // Log error but don't fail the response
            System.err.println("Error saving conversation: " + e.getMessage());
        }
    }
    
    public List<ChatbotConversation> getConversationHistory(String userId) {
        return conversationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
    
    public List<ChatbotConversation> getSessionHistory(String sessionId) {
        return conversationRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }
}

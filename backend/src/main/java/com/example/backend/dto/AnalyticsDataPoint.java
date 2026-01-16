package com.example.backend.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AnalyticsDataPoint {
    private String date;
    private String fullDate;
    private Integer users;
    private Integer patents;
    private Integer filings;
}

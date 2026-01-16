package com.example.backend.model;

import lombok.Data;
import java.util.List;

@Data
public class SearchResponse {
    private List<Patent> results;
}
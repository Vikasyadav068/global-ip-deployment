package com.example.backend.model;

import lombok.Data;
import jakarta.persistence.*;

@Data
@Entity
@Table(name = "patents")
public class Patent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long patentId;
    
    @Column(unique = true, nullable = false)
    private String id;
    
    private String type;
    private String assetNumber;
    
    @Column(length = 1000)
    private String title;
    
    private String assignee;
    private String inventor;
    private String jurisdiction;
    private String filingDate;
    private String status;
    
    @Column(length = 1000)
    private String classInfo;
    
    @Column(length = 2000)
    private String details;
    
    private String apiSource;
    private String lastUpdated;
    private String ipRightIdentifier;
    
    @Column(length = 5000)
    private String abstractText;
}
package com.example.backend.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "patent_filings")
public class PatentFiling {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // User Information
    @Column(name = "user_id", nullable = false)
    private String userId;
    
    @Column(name = "user_email", nullable = false)
    private String userEmail;
    
    @Column(name = "user_name")
    private String userName;
    
    // Applicant Information
    @Column(name = "applicant_name", nullable = false)
    private String applicantName;
    
    @Column(name = "applicant_email", nullable = false)
    private String applicantEmail;
    
    @Column(name = "applicant_phone", nullable = false, length = 20)
    private String applicantPhone;
    
    @Column(name = "applicant_address", nullable = false, columnDefinition = "TEXT")
    private String applicantAddress;
    
    @Column(name = "applicant_city", nullable = false, length = 100)
    private String applicantCity;
    
    @Column(name = "applicant_state", nullable = false, length = 100)
    private String applicantState;
    
    @Column(name = "applicant_pincode", nullable = false, length = 10)
    private String applicantPincode;
    
    @Column(name = "applicant_country", nullable = false, length = 100)
    private String applicantCountry;
    
    @Column(name = "organization_name")
    private String organizationName;
    
    @Column(name = "applicant_type", nullable = false, length = 50)
    private String applicantType;
    
    // Personal Details (NEW)
    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;
    
    @Column(name = "age")
    private Integer age;
    
    @Column(name = "gender", length = 20)
    private String gender;
    
    @Column(name = "occupation", length = 100)
    private String occupation;
    
    @Column(name = "educational_qualification", length = 200)
    private String educationalQualification;
    
    @Column(name = "designation", length = 100)
    private String designation;
    
    @Column(name = "application_date", nullable = false)
    private LocalDate applicationDate;
    
    // Additional Contact Details (NEW)
    @Column(name = "alternate_phone", length = 20)
    private String alternatePhone;
    
    @Column(name = "alternate_email")
    private String alternateEmail;
    
    // Government ID Details (NEW)
    @Column(name = "govt_id_type", length = 50)
    private String govtIdType;
    
    @Column(name = "govt_id_number", length = 50)
    private String govtIdNumber;
    
    @Column(name = "passport_country", length = 100)
    private String passportCountry;
    
    @Column(name = "driving_license_state", length = 100)
    private String drivingLicenseState;
    
    // Tax Details
    @Column(name = "gstin", length = 15)
    private String gstin;
    
    @Column(name = "aadhaar_number", length = 12)
    private String aadhaarNumber;
    
    @Column(name = "pan_number", length = 10)
    private String panNumber;
    
    // Correspondence Address (NEW)
    @Column(name = "correspondence_address", columnDefinition = "TEXT")
    private String correspondenceAddress;
    
    @Column(name = "correspondence_city", length = 100)
    private String correspondenceCity;
    
    @Column(name = "correspondence_state", length = 100)
    private String correspondenceState;
    
    @Column(name = "correspondence_pincode", length = 10)
    private String correspondencePincode;
    
    @Column(name = "same_as_applicant_address")
    private Boolean sameAsApplicantAddress = true;
    
    // Invention Details
    @Column(name = "invention_title", nullable = false, length = 500)
    private String inventionTitle;
    
    @Column(name = "invention_field", nullable = false)
    private String inventionField;
    
    @Column(name = "invention_description", nullable = false, columnDefinition = "TEXT")
    private String inventionDescription;
    
    @Column(name = "technical_problem", nullable = false, columnDefinition = "TEXT")
    private String technicalProblem;
    
    @Column(name = "proposed_solution", nullable = false, columnDefinition = "TEXT")
    private String proposedSolution;
    
    @Column(name = "advantages", nullable = false, columnDefinition = "TEXT")
    private String advantages;
    
    @Column(name = "prior_art", columnDefinition = "TEXT")
    private String priorArt;
    
    // Additional Invention Details (NEW)
    @Column(name = "keywords", length = 500)
    private String keywords;
    
    @Column(name = "target_industry", length = 200)
    private String targetIndustry;
    
    @Column(name = "commercial_application", columnDefinition = "TEXT")
    private String commercialApplication;
    
    // Patent Details
    @Column(name = "patent_type", nullable = false, length = 50)
    private String patentType;
    
    @Column(name = "filing_type", nullable = false, length = 50)
    private String filingType;
    
    @Column(name = "priority_date")
    private LocalDate priorityDate;
    
    @Column(name = "priority_number", length = 100)
    private String priorityNumber;
    
    @Column(name = "claims_priority")
    private Boolean claimsPriority;
    
    @Column(name = "number_of_claims", nullable = false)
    private Integer numberOfClaims;
    
    @Column(name = "number_of_drawings")
    private Integer numberOfDrawings;
    
    // Document URLs
    @Column(name = "description_file_url", nullable = false, columnDefinition = "TEXT")
    private String descriptionFileUrl;
    
    @Column(name = "claims_file_url", nullable = false, columnDefinition = "TEXT")
    private String claimsFileUrl;
    
    @Column(name = "abstract_file_url", nullable = false, columnDefinition = "TEXT")
    private String abstractFileUrl;
    
    @Column(name = "drawings_file_url", columnDefinition = "TEXT")
    private String drawingsFileUrl;
    
    // Payment Information
    @Column(name = "payment_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal paymentAmount;
    
    @Column(name = "payment_currency", length = 3)
    private String paymentCurrency = "INR";
    
    @Column(name = "payment_id", nullable = false)
    private String paymentId;
    
    @Column(name = "payment_order_id")
    private String paymentOrderId;
    
    @Column(name = "payment_signature")
    private String paymentSignature;
    
    @Column(name = "payment_status", nullable = false, length = 50)
    private String paymentStatus;
    
    @Column(name = "payment_timestamp")
    private LocalDateTime paymentTimestamp;
    
    // Agreement (NEW)
    @Column(name = "agreed_to_terms")
    private Boolean agreedToTerms = false;
    
    // Patent Progress Tracker - 5 Stages
    @Column(name = "stage_1_filed")
    private Boolean stage1Filed = true; // Automatically true when patent is submitted
    
    @Column(name = "stage_2_admin_review")
    private Boolean stage2AdminReview = false; // Admin first review
    
    @Column(name = "stage_3_technical_review")
    private Boolean stage3TechnicalReview = false; // Technical/Second admin review
    
    @Column(name = "stage_4_verification")
    private Boolean stage4Verification = false; // Final verification
    
    @Column(name = "stage_5_granted")
    private Boolean stage5Granted = false; // Patent granted/published
    
    // Admin Processing Details
    @Column(name = "patent_number", length = 50)
    private String patentNumber; // Granted patent number
    
    @Column(name = "granted_patent_person_name", length = 200)
    private String grantedPatentPersonName; // Person who granted the patent
    
    @Column(name = "rejected_patent_number", length = 50)
    private String rejectedPatentNumber; // Rejected patent reference number
    
    @Column(name = "rejected_patent_person_name", length = 200)
    private String rejectedPatentPersonName; // Person who rejected the patent
    
    @Column(name = "location", length = 200)
    private String location; // Location where patent was granted/rejected
    
    // Chat Messages (User Messages: m1-m5, Admin Replies: r1-r4)
    @Column(name = "m1", columnDefinition = "TEXT")
    private String m1; // User message 1
    
    @Column(name = "m2", columnDefinition = "TEXT")
    private String m2; // User message 2
    
    @Column(name = "m3", columnDefinition = "TEXT")
    private String m3; // User message 3
    
    @Column(name = "m4", columnDefinition = "TEXT")
    private String m4; // User message 4
    
    @Column(name = "m5", columnDefinition = "TEXT")
    private String m5; // User message 5
    
    @Column(name = "r1", columnDefinition = "TEXT")
    private String r1; // Admin reply 1
    
    @Column(name = "r2", columnDefinition = "TEXT")
    private String r2; // Admin reply 2
    
    @Column(name = "r3", columnDefinition = "TEXT")
    private String r3; // Admin reply 3
    
    @Column(name = "r4", columnDefinition = "TEXT")
    private String r4; // Admin reply 4
    
    // Status and Timestamps
    @Column(name = "status", length = 50)
    private String status = "submitted";
    
    @Column(name = "is_active")
    private Boolean isActive = true; // Active/Deactivated status for admin control
    
    @Column(name = "filing_date")
    private LocalDateTime filingDate;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (filingDate == null) {
            filingDate = LocalDateTime.now();
        }
        if (paymentTimestamp == null) {
            paymentTimestamp = LocalDateTime.now();
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    
    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }
    
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    
    public String getApplicantName() { return applicantName; }
    public void setApplicantName(String applicantName) { this.applicantName = applicantName; }
    
    public String getApplicantEmail() { return applicantEmail; }
    public void setApplicantEmail(String applicantEmail) { this.applicantEmail = applicantEmail; }
    
    public String getApplicantPhone() { return applicantPhone; }
    public void setApplicantPhone(String applicantPhone) { this.applicantPhone = applicantPhone; }
    
    public String getApplicantAddress() { return applicantAddress; }
    public void setApplicantAddress(String applicantAddress) { this.applicantAddress = applicantAddress; }
    
    public String getApplicantCity() { return applicantCity; }
    public void setApplicantCity(String applicantCity) { this.applicantCity = applicantCity; }
    
    public String getApplicantState() { return applicantState; }
    public void setApplicantState(String applicantState) { this.applicantState = applicantState; }
    
    public String getApplicantPincode() { return applicantPincode; }
    public void setApplicantPincode(String applicantPincode) { this.applicantPincode = applicantPincode; }
    
    public String getApplicantCountry() { return applicantCountry; }
    public void setApplicantCountry(String applicantCountry) { this.applicantCountry = applicantCountry; }
    
    public String getOrganizationName() { return organizationName; }
    public void setOrganizationName(String organizationName) { this.organizationName = organizationName; }
    
    public String getApplicantType() { return applicantType; }
    public void setApplicantType(String applicantType) { this.applicantType = applicantType; }
    
    public String getInventionTitle() { return inventionTitle; }
    public void setInventionTitle(String inventionTitle) { this.inventionTitle = inventionTitle; }
    
    public String getInventionField() { return inventionField; }
    public void setInventionField(String inventionField) { this.inventionField = inventionField; }
    
    public String getInventionDescription() { return inventionDescription; }
    public void setInventionDescription(String inventionDescription) { this.inventionDescription = inventionDescription; }
    
    public String getTechnicalProblem() { return technicalProblem; }
    public void setTechnicalProblem(String technicalProblem) { this.technicalProblem = technicalProblem; }
    
    public String getProposedSolution() { return proposedSolution; }
    public void setProposedSolution(String proposedSolution) { this.proposedSolution = proposedSolution; }
    
    public String getAdvantages() { return advantages; }
    public void setAdvantages(String advantages) { this.advantages = advantages; }
    
    public String getPriorArt() { return priorArt; }
    public void setPriorArt(String priorArt) { this.priorArt = priorArt; }
    
    public String getPatentType() { return patentType; }
    public void setPatentType(String patentType) { this.patentType = patentType; }
    
    public String getFilingType() { return filingType; }
    public void setFilingType(String filingType) { this.filingType = filingType; }
    
    public LocalDate getPriorityDate() { return priorityDate; }
    public void setPriorityDate(LocalDate priorityDate) { this.priorityDate = priorityDate; }
    
    public String getPriorityNumber() { return priorityNumber; }
    public void setPriorityNumber(String priorityNumber) { this.priorityNumber = priorityNumber; }
    
    public Boolean getClaimsPriority() { return claimsPriority; }
    public void setClaimsPriority(Boolean claimsPriority) { this.claimsPriority = claimsPriority; }
    
    public Integer getNumberOfClaims() { return numberOfClaims; }
    public void setNumberOfClaims(Integer numberOfClaims) { this.numberOfClaims = numberOfClaims; }
    
    public Integer getNumberOfDrawings() { return numberOfDrawings; }
    public void setNumberOfDrawings(Integer numberOfDrawings) { this.numberOfDrawings = numberOfDrawings; }
    
    public String getDescriptionFileUrl() { return descriptionFileUrl; }
    public void setDescriptionFileUrl(String descriptionFileUrl) { this.descriptionFileUrl = descriptionFileUrl; }
    
    public String getClaimsFileUrl() { return claimsFileUrl; }
    public void setClaimsFileUrl(String claimsFileUrl) { this.claimsFileUrl = claimsFileUrl; }
    
    public String getAbstractFileUrl() { return abstractFileUrl; }
    public void setAbstractFileUrl(String abstractFileUrl) { this.abstractFileUrl = abstractFileUrl; }
    
    public String getDrawingsFileUrl() { return drawingsFileUrl; }
    public void setDrawingsFileUrl(String drawingsFileUrl) { this.drawingsFileUrl = drawingsFileUrl; }
    
    public BigDecimal getPaymentAmount() { return paymentAmount; }
    public void setPaymentAmount(BigDecimal paymentAmount) { this.paymentAmount = paymentAmount; }
    
    public String getPaymentCurrency() { return paymentCurrency; }
    public void setPaymentCurrency(String paymentCurrency) { this.paymentCurrency = paymentCurrency; }
    
    public String getPaymentId() { return paymentId; }
    public void setPaymentId(String paymentId) { this.paymentId = paymentId; }
    
    public String getPaymentOrderId() { return paymentOrderId; }
    public void setPaymentOrderId(String paymentOrderId) { this.paymentOrderId = paymentOrderId; }
    
    public String getPaymentSignature() { return paymentSignature; }
    public void setPaymentSignature(String paymentSignature) { this.paymentSignature = paymentSignature; }
    
    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
    
    public LocalDateTime getPaymentTimestamp() { return paymentTimestamp; }
    public void setPaymentTimestamp(LocalDateTime paymentTimestamp) { this.paymentTimestamp = paymentTimestamp; }
    
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    
    public LocalDateTime getFilingDate() { return filingDate; }
    public void setFilingDate(LocalDateTime filingDate) { this.filingDate = filingDate; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    
    // NEW Getters and Setters for Personal Details
    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }
    
    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }
    
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    
    public String getOccupation() { return occupation; }
    public void setOccupation(String occupation) { this.occupation = occupation; }
    
    public String getEducationalQualification() { return educationalQualification; }
    public void setEducationalQualification(String educationalQualification) { this.educationalQualification = educationalQualification; }
    
    public String getDesignation() { return designation; }
    public void setDesignation(String designation) { this.designation = designation; }
    
    public LocalDate getApplicationDate() { return applicationDate; }
    public void setApplicationDate(LocalDate applicationDate) { this.applicationDate = applicationDate; }
    
    // NEW Getters and Setters for Additional Contact
    public String getAlternatePhone() { return alternatePhone; }
    public void setAlternatePhone(String alternatePhone) { this.alternatePhone = alternatePhone; }
    
    public String getAlternateEmail() { return alternateEmail; }
    public void setAlternateEmail(String alternateEmail) { this.alternateEmail = alternateEmail; }
    
    // NEW Getters and Setters for Government ID
    public String getGovtIdType() { return govtIdType; }
    public void setGovtIdType(String govtIdType) { this.govtIdType = govtIdType; }
    
    public String getGovtIdNumber() { return govtIdNumber; }
    public void setGovtIdNumber(String govtIdNumber) { this.govtIdNumber = govtIdNumber; }
    
    public String getPassportCountry() { return passportCountry; }
    public void setPassportCountry(String passportCountry) { this.passportCountry = passportCountry; }
    
    public String getDrivingLicenseState() { return drivingLicenseState; }
    public void setDrivingLicenseState(String drivingLicenseState) { this.drivingLicenseState = drivingLicenseState; }
    
    // NEW Getters and Setters for Tax Details
    public String getGstin() { return gstin; }
    public void setGstin(String gstin) { this.gstin = gstin; }
    
    public String getAadhaarNumber() { return aadhaarNumber; }
    public void setAadhaarNumber(String aadhaarNumber) { this.aadhaarNumber = aadhaarNumber; }
    
    public String getPanNumber() { return panNumber; }
    public void setPanNumber(String panNumber) { this.panNumber = panNumber; }
    
    // NEW Getters and Setters for Correspondence Address
    public String getCorrespondenceAddress() { return correspondenceAddress; }
    public void setCorrespondenceAddress(String correspondenceAddress) { this.correspondenceAddress = correspondenceAddress; }
    
    public String getCorrespondenceCity() { return correspondenceCity; }
    public void setCorrespondenceCity(String correspondenceCity) { this.correspondenceCity = correspondenceCity; }
    
    public String getCorrespondenceState() { return correspondenceState; }
    public void setCorrespondenceState(String correspondenceState) { this.correspondenceState = correspondenceState; }
    
    public String getCorrespondencePincode() { return correspondencePincode; }
    public void setCorrespondencePincode(String correspondencePincode) { this.correspondencePincode = correspondencePincode; }
    
    public Boolean getSameAsApplicantAddress() { return sameAsApplicantAddress; }
    public void setSameAsApplicantAddress(Boolean sameAsApplicantAddress) { this.sameAsApplicantAddress = sameAsApplicantAddress; }
    
    // NEW Getters and Setters for Additional Invention Details
    public String getKeywords() { return keywords; }
    public void setKeywords(String keywords) { this.keywords = keywords; }
    
    public String getTargetIndustry() { return targetIndustry; }
    public void setTargetIndustry(String targetIndustry) { this.targetIndustry = targetIndustry; }
    
    public String getCommercialApplication() { return commercialApplication; }
    public void setCommercialApplication(String commercialApplication) { this.commercialApplication = commercialApplication; }
    
    // NEW Getters and Setters for Agreement
    public Boolean getAgreedToTerms() { return agreedToTerms; }
    public void setAgreedToTerms(Boolean agreedToTerms) { this.agreedToTerms = agreedToTerms; }
    
    // Getters and Setters for Progress Tracker Stages
    public Boolean getStage1Filed() { return stage1Filed; }
    public void setStage1Filed(Boolean stage1Filed) { this.stage1Filed = stage1Filed; }
    
    public Boolean getStage2AdminReview() { return stage2AdminReview; }
    public void setStage2AdminReview(Boolean stage2AdminReview) { this.stage2AdminReview = stage2AdminReview; }
    
    public Boolean getStage3TechnicalReview() { return stage3TechnicalReview; }
    public void setStage3TechnicalReview(Boolean stage3TechnicalReview) { this.stage3TechnicalReview = stage3TechnicalReview; }
    
    public Boolean getStage4Verification() { return stage4Verification; }
    public void setStage4Verification(Boolean stage4Verification) { this.stage4Verification = stage4Verification; }
    
    public Boolean getStage5Granted() { return stage5Granted; }
    public void setStage5Granted(Boolean stage5Granted) { this.stage5Granted = stage5Granted; }
    
    // Getters and Setters for Admin Processing Details
    public String getPatentNumber() { return patentNumber; }
    public void setPatentNumber(String patentNumber) { this.patentNumber = patentNumber; }
    
    public String getGrantedPatentPersonName() { return grantedPatentPersonName; }
    public void setGrantedPatentPersonName(String grantedPatentPersonName) { this.grantedPatentPersonName = grantedPatentPersonName; }
    
    public String getRejectedPatentNumber() { return rejectedPatentNumber; }
    public void setRejectedPatentNumber(String rejectedPatentNumber) { this.rejectedPatentNumber = rejectedPatentNumber; }
    
    public String getRejectedPatentPersonName() { return rejectedPatentPersonName; }
    public void setRejectedPatentPersonName(String rejectedPatentPersonName) { this.rejectedPatentPersonName = rejectedPatentPersonName; }
    
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    
    // Getters and Setters for Chat Messages
    public String getM1() { return m1; }
    public void setM1(String m1) { this.m1 = m1; }
    
    public String getM2() { return m2; }
    public void setM2(String m2) { this.m2 = m2; }
    
    public String getM3() { return m3; }
    public void setM3(String m3) { this.m3 = m3; }
    
    public String getM4() { return m4; }
    public void setM4(String m4) { this.m4 = m4; }
    
    public String getM5() { return m5; }
    public void setM5(String m5) { this.m5 = m5; }
    
    public String getR1() { return r1; }
    public void setR1(String r1) { this.r1 = r1; }
    
    public String getR2() { return r2; }
    public void setR2(String r2) { this.r2 = r2; }
    
    public String getR3() { return r3; }
    public void setR3(String r3) { this.r3 = r3; }
    
    public String getR4() { return r4; }
    public void setR4(String r4) { this.r4 = r4; }
    
    // Getters and Setters for Active Status
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}

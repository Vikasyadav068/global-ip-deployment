package com.example.backend.service;
import com.example.backend.model.Contact;
import com.example.backend.model.Feedback;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {
    
    private final JavaMailSender mailSender;
    
    @Value("${spring.mail.username}")
    private String fromEmail;
    
    @Value("${app.admin.email:vikaskumaryadav068@gmail.com}")
    private String adminEmail;
    
    /**
     * Send confirmation email to user who submitted contact form
     */
    public void sendContactConfirmation(Contact contact) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        
        helper.setFrom(fromEmail);
        helper.setTo(contact.getEmail());
        helper.setSubject("Thank you for contacting us - " + contact.getSubject());
        
        String htmlContent = buildContactConfirmationEmail(contact);
        helper.setText(htmlContent, true);
        
        mailSender.send(message);
        log.info("Contact confirmation email sent to: {}", contact.getEmail());
    }
    
    /**
     * Send notification to admin about new contact form submission
     */
    public void sendContactNotificationToAdmin(Contact contact) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        
        helper.setFrom(fromEmail);
        helper.setTo(adminEmail);
        helper.setSubject("New Contact Form Submission - " + contact.getSubject());
        
        String htmlContent = buildContactNotificationEmail(contact);
        helper.setText(htmlContent, true);
        
        mailSender.send(message);
        log.info("Contact notification email sent to admin");
    }
    
    /**
     * Send confirmation email to user who submitted feedback
     */
    public void sendFeedbackConfirmation(Feedback feedback) throws MessagingException {
        if (feedback.getUserEmail() == null || feedback.getUserEmail().isEmpty()) {
            log.warn("No email address for feedback, skipping confirmation email");
            return;
        }
        
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        
        helper.setFrom(fromEmail);
        helper.setTo(feedback.getUserEmail());
        helper.setSubject("Thank you for your valuable feedback!");
        
        String htmlContent = buildFeedbackConfirmationEmail(feedback);
        helper.setText(htmlContent, true);
        
        mailSender.send(message);
        log.info("Feedback confirmation email sent to: {}", feedback.getUserEmail());
    }
    
    /**
     * Send notification to admin about new feedback submission
     */
    public void sendFeedbackNotificationToAdmin(Feedback feedback) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        
        helper.setFrom(fromEmail);
        helper.setTo(adminEmail);
        helper.setSubject("New Feedback Received - Average Rating: " + String.format("%.2f", feedback.getAverageRating()));
        
        String htmlContent = buildFeedbackNotificationEmail(feedback);
        helper.setText(htmlContent, true);
        
        mailSender.send(message);
        log.info("Feedback notification email sent to admin");
    }
    
    /**
     * Send user report notification to admin (without storing in database)
     */
    public void sendUserReportToAdmin(String reporterName, String reporterEmail, 
                                     String reportedUserName, String reportedUserEmail, 
                                     String subject, String reason) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        
        helper.setFrom(fromEmail);
        helper.setTo(adminEmail);
        helper.setSubject("🚨 USER REPORT - " + subject);
        
        String htmlContent = buildUserReportEmail(reporterName, reporterEmail, 
                                                 reportedUserName, reportedUserEmail, 
                                                 subject, reason);
        helper.setText(htmlContent, true);
        
        mailSender.send(message);
        log.info("User report email sent to admin - Reporter: {}, Reported User: {}", 
                reporterEmail, reportedUserEmail);
    }
    
    private String buildContactConfirmationEmail(Contact contact) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea; border-radius: 5px; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Thank You for Contacting Us!</h1>
                    </div>
                    <div class="content">
                        <p>Dear %s,</p>
                        <p>We have received your message and appreciate you taking the time to reach out to us.</p>
                        
                        <div class="info-box">
                            <h3>Your Message Details:</h3>
                            <p><strong>Subject:</strong> %s</p>
                            <p><strong>Message:</strong><br>%s</p>
                        </div>
                        
                        <p>Our team will review your message and get back to you as soon as possible.</p>
                        <p>If you have any urgent questions, feel free to reply to this email.</p>
                        
                        <p>Best regards,<br>
                        <strong>Global IPI Platform Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>This is an automated confirmation email. Please do not reply to this message.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(contact.getName(), contact.getSubject(), contact.getMessage());
    }
    
    private String buildContactNotificationEmail(Contact contact) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .info-row { display: flex; padding: 10px 0; border-bottom: 1px solid #ddd; }
                    .info-label { font-weight: bold; width: 120px; }
                    .info-value { flex: 1; }
                    .message-box { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>🔔 New Contact Form Submission</h2>
                    </div>
                    <div class="content">
                        <div class="info-row">
                            <div class="info-label">Name:</div>
                            <div class="info-value">%s</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Email:</div>
                            <div class="info-value">%s</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Phone:</div>
                            <div class="info-value">%s</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Subject:</div>
                            <div class="info-value">%s</div>
                        </div>
                        
                        <div class="message-box">
                            <h4>Message:</h4>
                            <p>%s</p>
                        </div>
                        
                        <p><small>Submitted at: %s</small></p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(
                contact.getName(),
                contact.getEmail(),
                contact.getPhone() != null ? contact.getPhone() : "Not provided",
                contact.getSubject(),
                contact.getMessage(),
                contact.getCreatedAt()
            );
    }
    
    private String buildFeedbackConfirmationEmail(Feedback feedback) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .rating-box { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center; }
                    .stars { color: #ffd700; font-size: 24px; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Thank You for Your Feedback! ⭐</h1>
                    </div>
                    <div class="content">
                        <p>Dear %s,</p>
                        <p>We truly appreciate you taking the time to share your feedback with us!</p>
                        
                        <div class="rating-box">
                            <h3>Your Average Rating</h3>
                            <div class="stars">%s</div>
                            <p><strong>%.2f out of 5.0</strong></p>
                        </div>
                        
                        <p>Your insights help us improve our platform and provide better service to all our users.</p>
                        <p>We're constantly working to enhance your experience based on valuable feedback like yours.</p>
                        
                        <p>Thank you for being a valued member of our community!</p>
                        
                        <p>Best regards,<br>
                        <strong>Global IPI Platform Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>This is an automated confirmation email.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(
                feedback.getUserName() != null ? feedback.getUserName() : "Valued User",
                generateStars(feedback.getAverageRating()),
                feedback.getAverageRating()
            );
    }
    
    private String buildFeedbackNotificationEmail(Feedback feedback) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .rating-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
                    .rating-item { background: white; padding: 15px; border-radius: 5px; text-align: center; }
                    .rating-label { font-size: 12px; color: #666; }
                    .rating-value { font-size: 24px; font-weight: bold; color: #667eea; }
                    .message-box { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>⭐ New Feedback Received</h2>
                    </div>
                    <div class="content">
                        <p><strong>User:</strong> %s</p>
                        <p><strong>Email:</strong> %s</p>
                        <p><strong>User ID:</strong> %s</p>
                        
                        <h3>Ratings:</h3>
                        <div class="rating-grid">
                            <div class="rating-item">
                                <div class="rating-label">UI Design</div>
                                <div class="rating-value">%d/5</div>
                            </div>
                            <div class="rating-item">
                                <div class="rating-label">Performance</div>
                                <div class="rating-value">%d/5</div>
                            </div>
                            <div class="rating-item">
                                <div class="rating-label">Features</div>
                                <div class="rating-value">%d/5</div>
                            </div>
                            <div class="rating-item">
                                <div class="rating-label">Support</div>
                                <div class="rating-value">%d/5</div>
                            </div>
                            <div class="rating-item">
                                <div class="rating-label">Overall</div>
                                <div class="rating-value">%d/5</div>
                            </div>
                            <div class="rating-item">
                                <div class="rating-label">Average</div>
                                <div class="rating-value">%.2f/5</div>
                            </div>
                        </div>
                        
                        <div class="message-box">
                            <h4>Additional Comments:</h4>
                            <p>%s</p>
                        </div>
                        
                        <p><small>Submitted at: %s</small></p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(
                feedback.getUserName() != null ? feedback.getUserName() : "Anonymous",
                feedback.getUserEmail() != null ? feedback.getUserEmail() : "Not provided",
                feedback.getUserId() != null ? feedback.getUserId() : "N/A",
                feedback.getUserInterfaceRating(),
                feedback.getPerformanceRating(),
                feedback.getFeaturesRating(),
                feedback.getSupportRating(),
                feedback.getOverallRating(),
                feedback.getAverageRating(),
                feedback.getFeedbackMessage() != null ? feedback.getFeedbackMessage() : "No additional comments",
                feedback.getCreatedAt()
            );
    }
    
    private String generateStars(Double rating) {
        int fullStars = (int) Math.floor(rating);
        StringBuilder stars = new StringBuilder();
        for (int i = 0; i < fullStars; i++) {
            stars.append("⭐");
        }
        return stars.toString();
    }
    
    /**
     * Send patent granted notification email to applicant
     */
    public void sendPatentGrantedEmail(String applicantEmail, String applicantName, String inventionTitle, Long filingId) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        
        helper.setFrom(fromEmail);
        helper.setTo(applicantEmail);
        helper.setSubject("🎉 Congratulations! Your Patent Has Been Granted - " + inventionTitle);
        
        String htmlContent = buildPatentGrantedEmail(applicantName, inventionTitle, filingId);
        helper.setText(htmlContent, true);
        
        mailSender.send(message);
        log.info("Patent granted email sent to: {} for patent: {}", applicantEmail, inventionTitle);
    }
    
    /**
     * Send patent rejection email to applicant
     */
    public void sendPatentRejectedEmail(String applicantEmail, String applicantName, String inventionTitle, 
                                       Long filingId, String rejectedPatentNumber, String rejectedPersonName, 
                                       String location) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        
        helper.setFrom(fromEmail);
        helper.setTo(applicantEmail);
        helper.setSubject("Patent Application Status Update - " + inventionTitle);
        
        String htmlContent = buildPatentRejectedEmail(applicantName, inventionTitle, filingId, 
                                                      rejectedPatentNumber, rejectedPersonName, location);
        helper.setText(htmlContent, true);
        
        mailSender.send(message);
        log.info("Patent rejection email sent to: {} for patent: {}", applicantEmail, inventionTitle);
    }
    
    private String buildPatentGrantedEmail(String applicantName, String inventionTitle, Long filingId) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { 
                        background: linear-gradient(135deg, #10b981 0%%, #059669 100%%); 
                        color: white; 
                        padding: 40px; 
                        text-align: center; 
                        border-radius: 10px 10px 0 0; 
                    }
                    .celebration { font-size: 48px; margin-bottom: 10px; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .success-box { 
                        background: linear-gradient(135deg, #d1fae5 0%%, #a7f3d0 100%%); 
                        padding: 25px; 
                        margin: 20px 0; 
                        border-left: 4px solid #10b981; 
                        border-radius: 5px; 
                    }
                    .info-box { 
                        background: white; 
                        padding: 20px; 
                        margin: 20px 0; 
                        border-radius: 5px; 
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .info-row { 
                        padding: 10px 0; 
                        border-bottom: 1px solid #e5e7eb; 
                    }
                    .info-row:last-child { border-bottom: none; }
                    .label { font-weight: bold; color: #059669; }
                    .stages-box { 
                        background: white; 
                        padding: 20px; 
                        margin: 20px 0; 
                        border-radius: 5px; 
                    }
                    .stage { 
                        display: flex; 
                        align-items: center; 
                        padding: 10px; 
                        margin: 5px 0; 
                        background: #f0fdf4; 
                        border-radius: 5px; 
                    }
                    .stage-icon { 
                        color: #10b981; 
                        margin-right: 10px; 
                        font-size: 20px; 
                    }
                    .footer { 
                        text-align: center; 
                        margin-top: 30px; 
                        color: #666; 
                        font-size: 12px; 
                        padding-top: 20px;
                        border-top: 1px solid #e5e7eb;
                    }
                    .cta-button {
                        display: inline-block;
                        background: linear-gradient(135deg, #10b981 0%%, #059669 100%%);
                        color: white;
                        padding: 15px 30px;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                        font-weight: bold;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="celebration">🎉 🏆 🎊</div>
                        <h1>Congratulations!</h1>
                        <h2>Your Patent Has Been Granted!</h2>
                    </div>
                    <div class="content">
                        <p>Dear <strong>%s</strong>,</p>
                        
                        <div class="success-box">
                            <h3 style="margin-top: 0; color: #059669;">🎯 PATENT GRANTED SUCCESSFULLY!</h3>
                            <p style="margin-bottom: 0;">
                                We are thrilled to inform you that your patent application has successfully completed 
                                all stages and has been <strong>GRANTED</strong>!
                            </p>
                        </div>
                        
                        <div class="info-box">
                            <h3 style="margin-top: 0; color: #059669;">Patent Details:</h3>
                            <div class="info-row">
                                <span class="label">Invention Title:</span><br>
                                <strong>%s</strong>
                            </div>
                            <div class="info-row">
                                <span class="label">Filing ID:</span> #%d
                            </div>
                            <div class="info-row">
                                <span class="label">Status:</span> <span style="color: #10b981; font-weight: bold;">✅ GRANTED</span>
                            </div>
                        </div>
                        
                        <div class="stages-box">
                            <h3 style="margin-top: 0; color: #059669;">✅ All Stages Completed:</h3>
                            <div class="stage">
                                <span class="stage-icon">✅</span>
                                <span><strong>Stage 1:</strong> Filed - Application submitted successfully</span>
                            </div>
                            <div class="stage">
                                <span class="stage-icon">✅</span>
                                <span><strong>Stage 2:</strong> Admin Review - Verified and approved</span>
                            </div>
                            <div class="stage">
                                <span class="stage-icon">✅</span>
                                <span><strong>Stage 3:</strong> Technical Examination - Passed technical review</span>
                            </div>
                            <div class="stage">
                                <span class="stage-icon">✅</span>
                                <span><strong>Stage 4:</strong> Verification - All verifications completed</span>
                            </div>
                            <div class="stage">
                                <span class="stage-icon">🏆</span>
                                <span><strong>Stage 5:</strong> Granted - Patent officially granted!</span>
                            </div>
                        </div>
                        
                        <p>
                            <strong>What's Next?</strong><br>
                            Your patent is now officially granted! You can now protect your intellectual property 
                            and leverage it for commercial purposes. Official documentation will be sent to you shortly.
                        </p>
                        
                        <p style="text-align: center;">
                            <a href="http://localhost:5173" class="cta-button">
                                View Your Patent Details
                            </a>
                        </p>
                        
                        <p>
                            If you have any questions or need assistance, please don't hesitate to contact our support team.
                        </p>
                        
                        <p>
                            Congratulations once again on this significant achievement!
                        </p>
                        
                        <p>Best regards,<br>
                        <strong>Global Intellectual Property Platform Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>This is an automated notification email from the Global IPI Platform.</p>
                        <p>© 2025 Global Intellectual Property Platform. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(applicantName, inventionTitle, filingId);
    }
    
    private String buildPatentRejectedEmail(String applicantName, String inventionTitle, Long filingId,
                                           String rejectedPatentNumber, String rejectedPersonName, String location) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { 
                        background: linear-gradient(135deg, #ef4444 0%%, #dc2626 100%%); 
                        color: white; 
                        padding: 40px; 
                        text-align: center; 
                        border-radius: 10px 10px 0 0; 
                    }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .rejection-box { 
                        background: linear-gradient(135deg, #fee2e2 0%%, #fecaca 100%%); 
                        padding: 25px; 
                        margin: 20px 0; 
                        border-left: 4px solid #ef4444; 
                        border-radius: 5px; 
                    }
                    .info-box { 
                        background: white; 
                        padding: 20px; 
                        margin: 20px 0; 
                        border-radius: 5px; 
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .info-row { 
                        padding: 10px 0; 
                        border-bottom: 1px solid #e5e7eb; 
                    }
                    .info-row:last-child { border-bottom: none; }
                    .label { font-weight: bold; color: #dc2626; }
                    .footer { 
                        text-align: center; 
                        margin-top: 30px; 
                        color: #666; 
                        font-size: 12px; 
                        padding-top: 20px;
                        border-top: 1px solid #e5e7eb;
                    }
                    .cta-button {
                        display: inline-block;
                        background: linear-gradient(135deg, #3b82f6 0%%, #2563eb 100%%);
                        color: white;
                        padding: 15px 30px;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                        font-weight: bold;
                    }
                    .support-box {
                        background: linear-gradient(135deg, #dbeafe 0%%, #bfdbfe 100%%);
                        padding: 20px;
                        margin: 20px 0;
                        border-radius: 5px;
                        border-left: 4px solid #3b82f6;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Patent Application Status Update</h1>
                        <h2>Application Decision Notification</h2>
                    </div>
                    <div class="content">
                        <p>Dear <strong>%s</strong>,</p>
                        
                        <div class="rejection-box">
                            <h3 style="margin-top: 0; color: #dc2626;">⚠️ Patent Application Status</h3>
                            <p style="margin-bottom: 0;">
                                We regret to inform you that your patent application has been carefully reviewed 
                                and unfortunately could not be approved at this time.
                            </p>
                        </div>
                        
                        <div class="info-box">
                            <h3 style="margin-top: 0; color: #dc2626;">Application Details:</h3>
                            <div class="info-row">
                                <span class="label">Invention Title:</span><br>
                                <strong>%s</strong>
                            </div>
                            <div class="info-row">
                                <span class="label">Filing ID:</span> #%d
                            </div>
                            <div class="info-row">
                                <span class="label">Reference Number:</span> %s
                            </div>
                            <div class="info-row">
                                <span class="label">Reviewed By:</span> %s
                            </div>
                            <div class="info-row">
                                <span class="label">Review Location:</span> %s
                            </div>
                            <div class="info-row">
                                <span class="label">Status:</span> <span style="color: #ef4444; font-weight: bold;">❌ REJECTED</span>
                            </div>
                        </div>
                        
                        <div class="support-box">
                            <h3 style="margin-top: 0; color: #2563eb;">💡 Need Assistance?</h3>
                            <p>
                                We understand this may be disappointing. Our expert team is here to help you understand 
                                the reasons for this decision and guide you on possible next steps.
                            </p>
                            <ul style="margin: 10px 0;">
                                <li>Request a detailed review report</li>
                                <li>Consult with our patent experts</li>
                                <li>Explore options for resubmission</li>
                                <li>Get guidance on improving your application</li>
                            </ul>
                        </div>
                        
                        <p>
                            <strong>What You Can Do:</strong><br>
                            • Review the feedback provided by our examination team<br>
                            • Contact our support team for detailed clarification<br>
                            • Consider revising and resubmitting your application<br>
                            • Explore alternative intellectual property protection options
                        </p>
                        
                        <p style="text-align: center;">
                            <a href="http://localhost:5173" class="cta-button">
                                View Application Details
                            </a>
                        </p>
                        
                        <p>
                            If you have any questions or would like to discuss this decision, please don't hesitate 
                            to contact our support team. We're committed to helping you protect your intellectual property.
                        </p>
                        
                        <p>
                            Thank you for your submission and for choosing the Global Intellectual Property Platform.
                        </p>
                        
                        <p>Best regards,<br>
                        <strong>Global Intellectual Property Platform Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>This is an automated notification email from the Global IPI Platform.</p>
                        <p>© 2025 Global Intellectual Property Platform. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(applicantName, inventionTitle, filingId, 
                         rejectedPatentNumber != null ? rejectedPatentNumber : "N/A",
                         rejectedPersonName != null ? rejectedPersonName : "N/A",
                         location != null ? location : "N/A");
    }
    
    private String buildUserReportEmail(String reporterName, String reporterEmail, 
                                       String reportedUserName, String reportedUserEmail, 
                                       String subject, String reason) {
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");
        String formattedDate = now.format(formatter);
        
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 700px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
                    .header { 
                        background: linear-gradient(135deg, #dc3545 0%%, #c82333 100%%); 
                        color: white; 
                        padding: 30px; 
                        text-align: center; 
                        border-radius: 10px 10px 0 0; 
                    }
                    .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; }
                    .alert-badge { 
                        background: #fff3cd; 
                        border-left: 4px solid #ffc107; 
                        padding: 15px; 
                        margin: 20px 0; 
                        border-radius: 5px; 
                    }
                    .section { margin: 25px 0; }
                    .section-title { 
                        font-size: 18px; 
                        font-weight: bold; 
                        color: #495057; 
                        margin-bottom: 15px; 
                        border-bottom: 2px solid #e9ecef; 
                        padding-bottom: 8px; 
                    }
                    .info-grid { 
                        display: grid; 
                        grid-template-columns: 150px 1fr; 
                        gap: 12px; 
                        margin: 10px 0; 
                    }
                    .info-label { 
                        font-weight: 600; 
                        color: #6c757d; 
                    }
                    .info-value { 
                        color: #212529; 
                    }
                    .reported-user { 
                        background: #f8d7da; 
                        border: 1px solid #f5c6cb; 
                        border-radius: 8px; 
                        padding: 20px; 
                        margin: 15px 0; 
                    }
                    .reporter-user { 
                        background: #d1ecf1; 
                        border: 1px solid #bee5eb; 
                        border-radius: 8px; 
                        padding: 20px; 
                        margin: 15px 0; 
                    }
                    .reason-box { 
                        background: #f8f9fa; 
                        border: 1px solid #dee2e6; 
                        border-radius: 8px; 
                        padding: 20px; 
                        margin: 15px 0; 
                        white-space: pre-wrap; 
                        word-wrap: break-word; 
                    }
                    .footer { 
                        text-align: center; 
                        margin-top: 30px; 
                        padding-top: 20px; 
                        border-top: 1px solid #dee2e6; 
                        color: #6c757d; 
                        font-size: 13px; 
                    }
                    .priority-high { 
                        background: #dc3545; 
                        color: white; 
                        padding: 5px 15px; 
                        border-radius: 20px; 
                        display: inline-block; 
                        font-size: 12px; 
                        font-weight: bold; 
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🚨 USER REPORT NOTIFICATION</h1>
                        <div class="priority-high">HIGH PRIORITY - REQUIRES IMMEDIATE ATTENTION</div>
                    </div>
                    <div class="content">
                        <div class="alert-badge">
                            <strong>⚠️ Action Required:</strong> A user has submitted a report about another user. 
                            Please review this matter promptly and take appropriate action.
                        </div>
                        
                        <div class="section">
                            <div class="section-title">📋 Report Details</div>
                            <div class="info-grid">
                                <div class="info-label">Report Subject:</div>
                                <div class="info-value"><strong>%s</strong></div>
                                <div class="info-label">Submitted On:</div>
                                <div class="info-value">%s</div>
                            </div>
                        </div>
                        
                        <div class="section">
                            <div class="section-title">👤 Reporter Information</div>
                            <div class="reporter-user">
                                <div class="info-grid">
                                    <div class="info-label">Name:</div>
                                    <div class="info-value">%s</div>
                                    <div class="info-label">Email:</div>
                                    <div class="info-value"><a href="mailto:%s">%s</a></div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="section">
                            <div class="section-title">🎯 Reported User Information</div>
                            <div class="reported-user">
                                <div class="info-grid">
                                    <div class="info-label">Name:</div>
                                    <div class="info-value"><strong>%s</strong></div>
                                    <div class="info-label">Email:</div>
                                    <div class="info-value"><strong><a href="mailto:%s">%s</a></strong></div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="section">
                            <div class="section-title">📝 Reason for Reporting</div>
                            <div class="reason-box">%s</div>
                        </div>
                        
                        <div class="alert-badge">
                            <strong>💡 Next Steps:</strong>
                            <ul style="margin: 10px 0 0 20px;">
                                <li>Review the reported user's account activity</li>
                                <li>Investigate the claims made in this report</li>
                                <li>Contact both parties if necessary</li>
                                <li>Take appropriate action based on platform policies</li>
                                <li>Document the resolution</li>
                            </ul>
                        </div>
                        
                        <div class="footer">
                            <p><strong>This is an automated system notification.</strong></p>
                            <p>Global IPI Platform - User Report System</p>
                            <p>© 2025 Global Intellectual Property Platform. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(
                subject,
                formattedDate,
                reporterName,
                reporterEmail,
                reporterEmail,
                reportedUserName,
                reportedUserEmail,
                reportedUserEmail,
                reason
            );
    }
}


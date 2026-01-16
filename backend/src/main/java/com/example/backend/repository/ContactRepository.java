package com.example.backend.repository;

import com.example.backend.model.Contact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ContactRepository extends JpaRepository<Contact, Long> {
    List<Contact> findByEmailSent(Boolean emailSent);
    List<Contact> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    List<Contact> findByEmail(String email);
}

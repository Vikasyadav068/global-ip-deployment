package com.example.backend.repository;

import com.example.backend.model.Faq;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FaqRepository extends JpaRepository<Faq, Long> {
    List<Faq> findByIsActiveTrueOrderByDisplayOrderAsc();
    List<Faq> findByCategoryAndIsActiveTrueOrderByDisplayOrderAsc(String category);
}

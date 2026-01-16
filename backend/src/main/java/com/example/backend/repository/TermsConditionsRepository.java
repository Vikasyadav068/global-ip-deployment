package com.example.backend.repository;

import com.example.backend.model.TermsConditions;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TermsConditionsRepository extends JpaRepository<TermsConditions, Long> {
    Optional<TermsConditions> findFirstByIsActiveTrueOrderByEffectiveDateDesc();
}

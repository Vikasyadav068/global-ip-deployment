package com.example.backend.repository;

import com.example.backend.model.CookiePolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CookiePolicyRepository extends JpaRepository<CookiePolicy, Long> {
    Optional<CookiePolicy> findFirstByIsActiveTrueOrderByEffectiveDateDesc();
}

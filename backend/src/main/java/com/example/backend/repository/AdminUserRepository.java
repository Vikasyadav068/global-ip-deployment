package com.example.backend.repository;

import com.example.backend.model.AdminUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AdminUserRepository extends JpaRepository<AdminUser, Long> {
    
    Optional<AdminUser> findByEmail(String email);
    
    Optional<AdminUser> findByAdminIdAndAdminNameAndEmailAndPassword(
        Long adminId, 
        String adminName, 
        String email, 
        String password
    );
    
    boolean existsByEmail(String email);
}

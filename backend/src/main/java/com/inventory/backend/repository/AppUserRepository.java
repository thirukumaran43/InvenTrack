
package com.inventory.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.inventory.backend.entity.AppUser;
import com.inventory.backend.enums.Role;

public interface AppUserRepository
        extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByRole(Role role);

    // Retrieve all users with a specific role
    List<AppUser> findAllByRole(Role role);

    // Find a user by ID and role
    Optional<AppUser> findByIdAndRole(Long id, Role role);

    // Check whether a user exists with the given ID and role
    boolean existsByIdAndRole(Long id, Role role);
}

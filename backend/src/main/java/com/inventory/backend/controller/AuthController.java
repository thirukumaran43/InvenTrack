
package com.inventory.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.inventory.backend.dto.CreateStaffRequest;
import com.inventory.backend.dto.LoginRequest;
import com.inventory.backend.dto.LoginResponse;
import com.inventory.backend.dto.StaffResponse;
import com.inventory.backend.entity.AppUser;
import com.inventory.backend.service.AuthService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // Public login endpoint
    @PostMapping("/auth/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request) {

        try {
            LoginResponse response = authService.login(request);
            return ResponseEntity.ok(response);

        } catch (AuthenticationException ex) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid email or password"
            );
        }
    }

    // ADMIN creates a STAFF account
    @PostMapping("/admin/staff")
    public ResponseEntity<String> createStaff(
            @Valid @RequestBody CreateStaffRequest request) {

        AppUser staff = authService.createStaff(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body("Staff account created successfully. User ID: "
                        + staff.getId());
    }

    // ADMIN views all STAFF accounts
    @GetMapping("/admin/staff")
    public ResponseEntity<List<StaffResponse>> getAllStaff() {

        return ResponseEntity.ok(
                authService.getAllStaff()
        );
    }

    // ADMIN activates a STAFF account
    @PatchMapping("/admin/staff/{id}/activate")
    public ResponseEntity<StaffResponse> activateStaff(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                authService.activateStaff(id)
        );
    }

    // ADMIN deactivates a STAFF account
    @PatchMapping("/admin/staff/{id}/deactivate")
    public ResponseEntity<StaffResponse> deactivateStaff(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                authService.deactivateStaff(id)
        );
    }
}

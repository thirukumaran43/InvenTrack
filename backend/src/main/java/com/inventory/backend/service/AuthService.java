
package com.inventory.backend.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.inventory.backend.dto.CreateStaffRequest;
import com.inventory.backend.dto.LoginRequest;
import com.inventory.backend.dto.LoginResponse;
import com.inventory.backend.dto.StaffResponse;
import com.inventory.backend.entity.AppUser;
import com.inventory.backend.enums.Role;
import com.inventory.backend.repository.AppUserRepository;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            AuthenticationManager authenticationManager,
            AppUserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {

        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    // User login
    public LoginResponse login(LoginRequest request) {

        String email = request.getEmail().trim();

        Authentication authentication =
                authenticationManager.authenticate(
                        new UsernamePasswordAuthenticationToken(
                                email,
                                request.getPassword()
                        )
                );

        AppUser user = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "Invalid email or password"
                        )
                );

        String token = jwtService.generateToken(
                (org.springframework.security.core.userdetails.UserDetails)
                        authentication.getPrincipal()
        );

        return new LoginResponse(
                token,
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole().name()
        );
    }

    // ADMIN creates a STAFF account
    @Transactional
    public AppUser createStaff(CreateStaffRequest request) {

        String email = request.getEmail().trim();

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "An account with this email already exists"
            );
        }

        AppUser staff = new AppUser();

        staff.setFullName(request.getFullName().trim());
        staff.setEmail(email);
        staff.setPassword(
                passwordEncoder.encode(request.getPassword())
        );

        staff.setRole(Role.STAFF);
        staff.setActive(true);

        return userRepository.save(staff);
    }

    // ADMIN views all STAFF accounts
    @Transactional(readOnly = true)
    public List<StaffResponse> getAllStaff() {

        return userRepository.findAllByRole(Role.STAFF)
                .stream()
                .map(StaffResponse::new)
                .toList();
    }

    // ADMIN activates a STAFF account
    @Transactional
    public StaffResponse activateStaff(Long id) {

        AppUser staff = findStaffById(id);

        staff.setActive(true);

        AppUser updatedStaff = userRepository.save(staff);

        return new StaffResponse(updatedStaff);
    }

    // ADMIN deactivates a STAFF account
    @Transactional
    public StaffResponse deactivateStaff(Long id) {

        AppUser staff = findStaffById(id);

        staff.setActive(false);

        AppUser updatedStaff = userRepository.save(staff);

        return new StaffResponse(updatedStaff);
    }

    // Only STAFF accounts can be modified through these methods
    private AppUser findStaffById(Long id) {

        return userRepository.findByIdAndRole(id, Role.STAFF)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Staff account not found"
                        )
                );
    }
}

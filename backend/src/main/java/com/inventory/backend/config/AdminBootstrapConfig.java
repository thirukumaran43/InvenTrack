
package com.inventory.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.inventory.backend.entity.AppUser;
import com.inventory.backend.enums.Role;
import com.inventory.backend.repository.AppUserRepository;

@Configuration
public class AdminBootstrapConfig {

    @Value("${app.bootstrap-admin.enabled:false}")
    private boolean bootstrapEnabled;

    @Value("${app.bootstrap-admin.name:}")
    private String adminName;

    @Value("${app.bootstrap-admin.email:}")
    private String adminEmail;

    @Value("${app.bootstrap-admin.password:}")
    private String adminPassword;

    @Bean
    public ApplicationRunner createInitialAdmin(
            AppUserRepository userRepository,
            PasswordEncoder passwordEncoder) {

        return args -> {

            if (!bootstrapEnabled) {
                return;
            }

            if (userRepository.existsByRole(Role.ADMIN)) {
                System.out.println(
                        "An ADMIN account already exists. Bootstrap skipped."
                );
                return;
            }

            if (adminName.isBlank()
                    || adminEmail.isBlank()
                    || adminPassword.isBlank()) {

                throw new IllegalStateException(
                        "Initial ADMIN details are missing. "
                        + "Set the bootstrap environment variables."
                );
            }

            if (adminPassword.length() < 8
                    || adminPassword.length() > 72) {

                throw new IllegalStateException(
                        "Initial ADMIN password must be 8 to 72 characters."
                );
            }

            if (userRepository.existsByEmailIgnoreCase(
                    adminEmail.trim())) {

                throw new IllegalStateException(
                        "The configured ADMIN email already belongs "
                        + "to another account."
                );
            }

            AppUser admin = new AppUser();

            admin.setFullName(adminName.trim());
            admin.setEmail(adminEmail.trim());
            admin.setPassword(
                    passwordEncoder.encode(adminPassword)
            );
            admin.setRole(Role.ADMIN);
            admin.setActive(true);

            userRepository.save(admin);

            System.out.println(
                    "Initial ADMIN account created successfully."
            );
        };
    }
}

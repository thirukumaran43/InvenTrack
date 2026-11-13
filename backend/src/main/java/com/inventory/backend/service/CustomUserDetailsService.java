
package com.inventory.backend.service;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.inventory.backend.entity.AppUser;
import com.inventory.backend.repository.AppUserRepository;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final AppUserRepository userRepository;

    public CustomUserDetailsService(AppUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email)
            throws UsernameNotFoundException {

        AppUser appUser = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new UsernameNotFoundException("User not found"));

        if (!appUser.isActive()) {
            throw new UsernameNotFoundException(
                    "User account is inactive");
        }

        return User.builder()
                .username(appUser.getEmail())
                .password(appUser.getPassword())
                .authorities(
                        new SimpleGrantedAuthority(
                                "ROLE_" + appUser.getRole().name()
                        )
                )
                .build();
    }
}

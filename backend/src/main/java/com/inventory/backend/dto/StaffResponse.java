
package com.inventory.backend.dto;

import com.inventory.backend.entity.AppUser;

public class StaffResponse {

    private Long id;
    private String fullName;
    private String email;
    private String role;
    private boolean active;

    public StaffResponse(AppUser user) {
        this.id = user.getId();
        this.fullName = user.getFullName();
        this.email = user.getEmail();
        this.role = user.getRole().name();
        this.active = user.isActive();
    }

    public Long getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public String getRole() {
        return role;
    }

    public boolean isActive() {
        return active;
    }
}

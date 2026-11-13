
package com.inventory.backend.controller;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.inventory.backend.entity.ActivityLog;
import com.inventory.backend.repository.ActivityLogRepository;

@RestController
@RequestMapping("/api/admin/activity-logs")
@CrossOrigin(origins = "http://localhost:5173")
public class ActivityLogController {

    private final ActivityLogRepository repository;

    public ActivityLogController(ActivityLogRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<ActivityLog> getAllActivityLogs() {
        return repository.findAllByOrderByCreatedAtDesc();
    }
}

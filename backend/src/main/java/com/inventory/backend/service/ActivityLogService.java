
package com.inventory.backend.service;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.inventory.backend.entity.ActivityLog;
import com.inventory.backend.repository.ActivityLogRepository;

@Service
public class ActivityLogService {

    private final ActivityLogRepository repository;

    public ActivityLogService(ActivityLogRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void logActivity(
            String action,
            String entityType,
            Long entityId,
            String description) {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        String performedBy = "SYSTEM";

        if (authentication != null
                && authentication.isAuthenticated()
                && !"anonymousUser".equals(authentication.getName())) {

            performedBy = authentication.getName();
        }

        ActivityLog log = new ActivityLog();

        log.setAction(action);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setDescription(description);
        log.setPerformedBy(performedBy);

        repository.save(log);
    }
}

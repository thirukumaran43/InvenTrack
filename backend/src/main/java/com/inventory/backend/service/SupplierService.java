
package com.inventory.backend.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.inventory.backend.entity.StockMovement;
import com.inventory.backend.entity.Supplier;
import com.inventory.backend.repository.StockMovementRepository;
import com.inventory.backend.repository.SupplierRepository;

@Service
@Transactional
public class SupplierService {

    private final SupplierRepository repository;
    private final StockMovementRepository movementRepository;

    public SupplierService(
            SupplierRepository repository,
            StockMovementRepository movementRepository) {

        this.repository = repository;
        this.movementRepository = movementRepository;
    }

    // Get all active suppliers
    @Transactional(readOnly = true)
    public List<Supplier> getActiveSuppliers() {
        return repository.findByActiveTrueOrderByCompanyNameAsc();
    }

    // Get all archived suppliers
    @Transactional(readOnly = true)
    public List<Supplier> getArchivedSuppliers() {
        return repository.findByActiveFalseOrderByCompanyNameAsc();
    }

    // Get supplier by ID
    @Transactional(readOnly = true)
    public Supplier getSupplierById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Supplier not found."));
    }

    // Get purchase history for a supplier
    @Transactional(readOnly = true)
    public List<StockMovement> getPurchaseHistory(Long supplierId) {

        // Verify supplier exists
        getSupplierById(supplierId);

        return movementRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .filter(movement ->
                        movement.getType() == StockMovement.MovementType.IN
                        && movement.getSupplier() != null
                        && supplierId.equals(movement.getSupplier().getId()))
                .collect(Collectors.toList());
    }

    // Create new supplier
    public Supplier createSupplier(Supplier request) {

        String companyName = clean(request.getCompanyName());

        ensureUniqueCompanyName(companyName, null);

        Supplier supplier = new Supplier();

        copyFields(request, supplier);
        supplier.setActive(true);

        return repository.save(supplier);
    }

    // Update existing supplier
    public Supplier updateSupplier(Long id, Supplier request) {

        Supplier existing = getSupplierById(id);

        if (!existing.isActive()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Archived suppliers cannot be edited. Restore the supplier first.");
        }

        String companyName = clean(request.getCompanyName());

        ensureUniqueCompanyName(companyName, id);

        copyFields(request, existing);

        return repository.save(existing);
    }

    // Archive supplier
    public Supplier archiveSupplier(Long id) {

        Supplier supplier = getSupplierById(id);

        if (!supplier.isActive()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Supplier is already archived.");
        }

        supplier.setActive(false);

        return repository.save(supplier);
    }

    // Restore archived supplier
    public Supplier restoreSupplier(Long id) {

        Supplier supplier = getSupplierById(id);

        if (supplier.isActive()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Supplier is already active.");
        }

        supplier.setActive(true);

        return repository.save(supplier);
    }

    // Check duplicate company names
    private void ensureUniqueCompanyName(String name, Long currentId) {

        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Company name is required.");
        }

        boolean duplicate =
                repository.existsByCompanyNameIgnoreCase(name);

        if (duplicate) {

            boolean sameRecord = currentId != null
                    && repository.findById(currentId)
                            .map(s -> s.getCompanyName()
                                    .equalsIgnoreCase(name))
                            .orElse(false);

            if (!sameRecord) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "A supplier with this company name already exists.");
            }
        }
    }

    // Copy supplier fields
    private void copyFields(Supplier source, Supplier target) {

        target.setCompanyName(clean(source.getCompanyName()));
        target.setContactPerson(cleanNullable(source.getContactPerson()));
        target.setPhone(cleanNullable(source.getPhone()));
        target.setEmail(cleanNullable(source.getEmail()));
        target.setAddress(cleanNullable(source.getAddress()));
    }

    // Trim required fields
    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    // Trim optional fields
    private String cleanNullable(String value) {

        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        return value.trim();
    }
}

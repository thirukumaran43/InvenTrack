
package com.inventory.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.inventory.backend.entity.StockMovement;
import com.inventory.backend.entity.Supplier;
import com.inventory.backend.service.SupplierService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/suppliers")
@CrossOrigin(origins = "http://localhost:5173")
public class SupplierController {

    private final SupplierService service;

    public SupplierController(SupplierService service) {
        this.service = service;
    }

    @GetMapping
    public List<Supplier> getActiveSuppliers() {
        return service.getActiveSuppliers();
    }

    @GetMapping("/archived")
    public List<Supplier> getArchivedSuppliers() {
        return service.getArchivedSuppliers();
    }

    @GetMapping("/{id}")
    public Supplier getSupplierById(@PathVariable Long id) {
        return service.getSupplierById(id);
    }

    // Supplier purchase history
    @GetMapping("/{id}/purchase-history")
    public List<StockMovement> getPurchaseHistory(@PathVariable Long id) {
        return service.getPurchaseHistory(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Supplier createSupplier(@Valid @RequestBody Supplier supplier) {
        return service.createSupplier(supplier);
    }

    @PutMapping("/{id}")
    public Supplier updateSupplier(
            @PathVariable Long id,
            @Valid @RequestBody Supplier supplier) {
        return service.updateSupplier(id, supplier);
    }

    @DeleteMapping("/{id}")
    public Supplier archiveSupplier(@PathVariable Long id) {
        return service.archiveSupplier(id);
    }

    @PatchMapping("/{id}/restore")
    public Supplier restoreSupplier(@PathVariable Long id) {
        return service.restoreSupplier(id);
    }
}

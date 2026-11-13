
package com.inventory.backend.controller;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.inventory.backend.entity.StockMovement;
import com.inventory.backend.service.StockMovementService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/stock-movements")
@CrossOrigin(origins = "http://localhost:5173")
public class StockMovementController {

    private final StockMovementService service;

    public StockMovementController(StockMovementService service) {
        this.service = service;
    }

    @GetMapping
    public List<StockMovement> getAllMovements() {
        return service.getAllMovements();
    }

    @GetMapping("/product/{productId}")
    public List<StockMovement> getMovementsByProduct(
            @PathVariable Long productId) {
        return service.getMovementsByProduct(productId);
    }

    @PostMapping
    public StockMovement createMovement(
            @Valid @RequestBody StockMovement movement) {
        return service.createMovement(movement);
    }

    @GetMapping("/supplier/{supplierId}")
    public List<StockMovement> getMovementsBySupplier(
            @PathVariable Long supplierId) {

        return service.getMovementsBySupplier(supplierId);
    }
}


package com.inventory.backend.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.inventory.backend.entity.Product;
import com.inventory.backend.entity.StockMovement;
import com.inventory.backend.entity.Supplier;
import com.inventory.backend.repository.ProductRepository;
import com.inventory.backend.repository.StockMovementRepository;
import com.inventory.backend.repository.SupplierRepository;

@Service
@Transactional
public class StockMovementService {

    private final ProductRepository productRepository;
    private final StockMovementRepository movementRepository;
    private final SupplierRepository supplierRepository;

    public StockMovementService(
            ProductRepository productRepository,
            StockMovementRepository movementRepository,
            SupplierRepository supplierRepository) {

        this.productRepository = productRepository;
        this.movementRepository = movementRepository;
        this.supplierRepository = supplierRepository;
    }

    // Get all stock movements
    @Transactional(readOnly = true)
    public List<StockMovement> getAllMovements() {
        return movementRepository.findAllByOrderByCreatedAtDesc();
    }

    // Get movements by product ID
    @Transactional(readOnly = true)
    public List<StockMovement> getMovementsByProduct(Long productId) {

        productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Product not found."
                ));

        return movementRepository
                .findByProductIdOrderByCreatedAtDesc(productId);
    }

    // Create stock movement
    public StockMovement createMovement(StockMovement movement) {

        // Validate product
        if (movement.getProduct() == null
                || movement.getProduct().getId() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Product ID is required."
            );
        }

        // Validate movement type
        if (movement.getType() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Movement type must be IN or OUT."
            );
        }

        // Validate quantity
        if (movement.getQuantity() == null
                || movement.getQuantity() <= 0) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Quantity must be greater than zero."
            );
        }

        // Validate notes length
        if (movement.getNotes() != null
                && movement.getNotes().length() > 500) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Notes cannot exceed 500 characters."
            );
        }

        // Find product
        Product product = productRepository
                .findById(movement.getProduct().getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Product not found."
                ));

        // Prevent movements for archived products
        if (!product.isActive()) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cannot create stock movements for an archived product."
            );
        }

        // Validate current product quantity
        if (product.getQuantity() == null
                || product.getQuantity() < 0) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Product has an invalid stock quantity. Please check inventory data."
            );
        }

        // Validate supplier for Stock IN
        if (movement.getType() == StockMovement.MovementType.IN) {

            if (movement.getSupplier() == null
                    || movement.getSupplier().getId() == null) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Supplier is required for Stock IN."
                );
            }

            Supplier supplier = supplierRepository
                    .findById(movement.getSupplier().getId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Supplier not found."
                    ));

            // Prevent archived suppliers
            if (!supplier.isActive()) {

                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Cannot record Stock IN from an archived supplier."
                );
            }

            movement.setSupplier(supplier);

        } else {

            // Stock OUT does not require a supplier
            movement.setSupplier(null);
        }

        // Calculate stock quantity
        int currentQuantity = product.getQuantity();
        int movementQuantity = movement.getQuantity();

        if (movement.getType() == StockMovement.MovementType.IN) {

            try {

                product.setQuantity(
                        Math.addExact(currentQuantity, movementQuantity)
                );

            } catch (ArithmeticException ex) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Stock quantity exceeds the supported limit."
                );
            }

        } else {

            // Prevent negative stock
            if (movementQuantity > currentQuantity) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Insufficient stock. Available quantity: "
                                + currentQuantity
                );
            }

            product.setQuantity(
                    currentQuantity - movementQuantity
            );
        }

        // Save product and movement
        movement.setProduct(product);

        productRepository.save(product);

        return movementRepository.save(movement);
    }

    // Get Stock IN movements by supplier
    @Transactional(readOnly = true)
    public List<StockMovement> getMovementsBySupplier(Long supplierId) {

        supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Supplier not found."
                ));

        return movementRepository
                .findBySupplier_IdAndTypeOrderByCreatedAtDesc(
                        supplierId,
                        StockMovement.MovementType.IN
                );
    }
}

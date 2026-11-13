
package com.inventory.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.inventory.backend.entity.StockMovement;

public interface StockMovementRepository
        extends JpaRepository<StockMovement, Long> {

    // Get movements by product
    List<StockMovement> findByProductIdOrderByCreatedAtDesc(
            Long productId
    );

    // Get all movements
    List<StockMovement> findAllByOrderByCreatedAtDesc();

    // Check whether a product has stock movements
    boolean existsByProduct_Id(Long productId);

    // Get all movements supplied by a particular supplier
    List<StockMovement> findBySupplier_IdAndTypeOrderByCreatedAtDesc(
            Long supplierId,
            StockMovement.MovementType type
    );
}

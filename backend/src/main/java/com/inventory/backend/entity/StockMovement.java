
package com.inventory.backend.entity;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "stock_movements")
public class StockMovement {

    public enum MovementType {
        IN, OUT
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Product is required")
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @NotNull(message = "Movement type must be IN or OUT")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MovementType type;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be greater than zero")
    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    @Column(length = 500)
    private String notes;

    // Supplier is required for Stock IN by service validation.
    // Supplier is optional for Stock OUT.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    public StockMovement() {
    }

    @PrePersist
    public void setCreatedAt() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now(ZoneOffset.UTC);
        }
    }

    // Getters

    public Long getId() {
        return id;
    }

    public Product getProduct() {
        return product;
    }

    public MovementType getType() {
        return type;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public String getNotes() {
        return notes;
    }

    public Supplier getSupplier() {
        return supplier;
    }

    // Setters

    public void setId(Long id) {
        this.id = id;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public void setType(MovementType type) {
        this.type = type;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public void setSupplier(Supplier supplier) {
        this.supplier = supplier;
    }
}

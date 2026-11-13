
package com.inventory.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.inventory.backend.entity.Product;

public interface ProductRepository extends JpaRepository<Product, Long> {

    boolean existsBySku(String sku);

    boolean existsBySkuIgnoreCase(String sku);

    List<Product> findByActiveTrue();

    List<Product> findByActiveFalse();
}

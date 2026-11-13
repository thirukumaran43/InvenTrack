package com.inventory.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.inventory.backend.entity.Supplier;

public interface SupplierRepository extends JpaRepository<Supplier, Long> {
    List<Supplier> findByActiveTrueOrderByCompanyNameAsc();
    List<Supplier> findByActiveFalseOrderByCompanyNameAsc();
    boolean existsByCompanyNameIgnoreCase(String companyName);
}

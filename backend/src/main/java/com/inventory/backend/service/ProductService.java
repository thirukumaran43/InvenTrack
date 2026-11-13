
package com.inventory.backend.service;

import java.util.List;
import java.util.Locale;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.inventory.backend.entity.Product;
import com.inventory.backend.repository.ProductRepository;
import com.inventory.backend.repository.StockMovementRepository;

@Service
@Transactional
public class ProductService {

    private final ProductRepository repository;
    private final StockMovementRepository stockMovementRepository;
    private final ActivityLogService activityLogService;

    public ProductService(
            ProductRepository repository,
            StockMovementRepository stockMovementRepository,
            ActivityLogService activityLogService) {

        this.repository = repository;
        this.stockMovementRepository = stockMovementRepository;
        this.activityLogService = activityLogService;
    }

    // Get all active products
    public List<Product> getAllProducts() {
        return repository.findByActiveTrue();
    }

    // Get all archived products
    public List<Product> getArchivedProducts() {
        return repository.findByActiveFalse();
    }

    // Get product by ID
    @Transactional(readOnly = true)
    public Product getProductById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Product not found."));
    }

    // Create new product
    public Product createProduct(Product product) {
        String sku = normalizeSku(product.getSku());
        product.setSku(sku);

        if (repository.existsBySkuIgnoreCase(sku)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "SKU already exists. Please enter a different SKU.");
        }

        product.setActive(true);

        Product savedProduct = repository.save(product);

        activityLogService.logActivity(
                "PRODUCT_CREATED",
                "Product",
                savedProduct.getId(),
                "Created product: " + savedProduct.getName()
        );

        return savedProduct;
    }

    // Update existing product
    public Product updateProduct(Long id, Product updatedProduct) {
        Product existing = getProductById(id);

        if (!existing.isActive()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Archived products cannot be updated.");
        }

        String sku = normalizeSku(updatedProduct.getSku());
        updatedProduct.setSku(sku);

        boolean skuChanged =
                !existing.getSku().equalsIgnoreCase(sku);

        if (skuChanged && repository.existsBySkuIgnoreCase(sku)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "SKU already exists. Please enter a different SKU.");
        }

        existing.setName(updatedProduct.getName());
        existing.setSku(sku);
        existing.setCategory(updatedProduct.getCategory());
        existing.setUnitPrice(updatedProduct.getUnitPrice());
        existing.setReorderLevel(updatedProduct.getReorderLevel());

        Product savedProduct = repository.save(existing);

        activityLogService.logActivity(
                "PRODUCT_UPDATED",
                "Product",
                savedProduct.getId(),
                "Updated product: " + savedProduct.getName()
        );

        return savedProduct;
    }

    // Archive product instead of permanently deleting it
    public void deleteProduct(Long id) {
        Product product = getProductById(id);

        if (!product.isActive()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Product is already archived.");
        }

        // Preserve product and stock movement history
        product.setActive(false);

        repository.save(product);

        activityLogService.logActivity(
                "PRODUCT_ARCHIVED",
                "Product",
                product.getId(),
                "Archived product: " + product.getName()
        );
    }

    // Restore archived product
    public Product restoreProduct(Long id) {
        Product product = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Product not found."));

        if (product.isActive()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Product is already active.");
        }

        product.setActive(true);

        Product restoredProduct = repository.save(product);

        activityLogService.logActivity(
                "PRODUCT_RESTORED",
                "Product",
                restoredProduct.getId(),
                "Restored product: " + restoredProduct.getName()
        );

        return restoredProduct;
    }

    // Normalize SKU
    private String normalizeSku(String sku) {
        if (sku == null || sku.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "SKU is required.");
        }

        return sku.trim().toUpperCase(Locale.ROOT);
    }
}

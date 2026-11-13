import { useEffect, useState } from "react";
import { useAuth } from "./auth/AuthContext";
import { apiFetch } from "./services/api";

function StockMovements() {
  const { token } = useAuth();

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [movements, setMovements] = useState([]);

  const [productId, setProductId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [type, setType] = useState("IN");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load products, suppliers and stock movements
  async function loadData() {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const [
        productsResponse,
        movementsResponse,
        suppliersResponse,
      ] = await Promise.all([
        apiFetch("/api/products", token),
        apiFetch("/api/stock-movements", token),
        apiFetch("/api/suppliers", token),
      ]);

      if (
        !productsResponse.ok ||
        !movementsResponse.ok ||
        !suppliersResponse.ok
      ) {
        throw new Error(
          "Could not load inventory, supplier, or movement data."
        );
      }

      const [
        productsData,
        movementsData,
        suppliersData,
      ] = await Promise.all([
        productsResponse.json(),
        movementsResponse.json(),
        suppliersResponse.json(),
      ]);

      setProducts(productsData);
      setMovements(movementsData);
      setSuppliers(suppliersData);

      // Keep selected product if it still exists
      setProductId((currentId) => {
        const exists = productsData.some(
          (product) => String(product.id) === currentId
        );

        if (exists) return currentId;

        return productsData.length
          ? String(productsData[0].id)
          : "";
      });

      // Keep selected active supplier if it still exists
      setSupplierId((currentId) => {
        const exists = suppliersData.some(
          (supplier) => String(supplier.id) === currentId
        );

        if (exists) return currentId;

        return suppliersData.length
          ? String(suppliersData[0].id)
          : "";
      });
    } catch (err) {
      setError(
        err.message || "Could not connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  // Find selected product
  const selectedProduct = products.find(
    (product) => String(product.id) === productId
  );

  // Find selected supplier
  const selectedSupplier = suppliers.find(
    (supplier) => String(supplier.id) === supplierId
  );

  // Handle movement submission
  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const amount = Number(quantity);

    if (!selectedProduct) {
      setError("Please select a product.");
      return;
    }

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setError("Quantity must be a positive whole number.");
      return;
    }

    // Supplier validation for Stock IN
    if (type === "IN" && !selectedSupplier) {
      setError("Please select an active supplier for Stock IN.");
      return;
    }

    // Stock OUT validation
    if (
      type === "OUT" &&
      amount > Number(selectedProduct.quantity)
    ) {
      setError(
        `Insufficient stock. Available quantity: ${selectedProduct.quantity}.`
      );
      return;
    }

    setSaving(true);

    try {
      // Prepare request payload
      const payload = {
        product: {
          id: selectedProduct.id,
        },
        type,
        quantity: amount,
        notes: notes.trim(),

        ...(type === "IN"
          ? {
              supplier: {
                id: Number(supplierId),
              },
            }
          : {}),
      };

      const response = await apiFetch(
        "/api/stock-movements",
        token,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message || "Could not save stock movement."
        );
      }

      await response.json();

      setSuccess(
        type === "IN"
          ? `Stock IN recorded successfully from ${selectedSupplier.companyName}.`
          : "Stock OUT recorded successfully."
      );

      // Clear form fields
      setQuantity("");
      setNotes("");

      // Refresh inventory and movement history
      await loadData();
    } catch (err) {
      setError(
        err.message || "Failed to save stock movement."
      );
    } finally {
      setSaving(false);
    }
  }

  // Format date
  function formatDate(value) {
    if (!value) return "—";

    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  // Calculate expected stock
  const expectedStock = selectedProduct && quantity !== ""
    ? Number(selectedProduct.quantity) +
      (type === "IN" ? 1 : -1) * (Number(quantity) || 0)
    : null;

  return (
    <section className="content">

      {/* Page heading */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">INVENTORY OPERATIONS</p>

          <h1>Stock movements</h1>

          <p className="muted">
            Record received stock and issued stock.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button refresh-icon-button"
          onClick={loadData}
          disabled={loading || saving}
          title="Refresh data"
          aria-label="Refresh data"
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 7v5h-5" />
            <path d="M4 17v-5h5" />
            <path d="M5.6 9A7 7 0 0 1 17.2 6.4L20 12M4 12l2.8 5.6A7 7 0 0 0 18.4 15" />
          </svg>
        </button>
      </div>

      {/* Error and success messages */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      {/* Record movement form */}
      <section className="form-card stock-movement-card">

        <div className="form-heading">
          <div>
            <h2>Record a movement</h2>

            <p className="muted">
              Select a product and enter the movement details.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="muted">
            Loading inventory...
          </p>
        ) : products.length === 0 ? (
          <p className="muted">
            Add a product before recording stock movements.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>

            <div className="form-grid stock-movement-grid">

              {/* Product selection */}
              <label>
                Product

                <select
                  required
                  value={productId}
                  onChange={(event) =>
                    setProductId(event.target.value)
                  }
                >
                  <option value="">
                    Select product
                  </option>

                  {products.map((product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
              </label>

              {/* Movement type */}
              <label>
                Movement type

                <select
                  value={type}
                  onChange={(event) => {
                    setType(event.target.value);
                    setError("");
                    setSuccess("");
                  }}
                >
                  <option value="IN">
                    Stock IN
                  </option>

                  <option value="OUT">
                    Stock OUT
                  </option>
                </select>
              </label>

              {/* Supplier selection - only for Stock IN */}
              {type === "IN" && (
                <label>
                  Supplier

                  <select
                    required
                    value={supplierId}
                    onChange={(event) =>
                      setSupplierId(event.target.value)
                    }
                  >
                    <option value="">
                      Select supplier
                    </option>

                    {suppliers.map((supplier) => (
                      <option
                        key={supplier.id}
                        value={supplier.id}
                      >
                        {supplier.companyName}
                      </option>
                    ))}
                  </select>

                  {suppliers.length === 0 && (
                    <small className="muted">
                      Add an active supplier in the Suppliers
                      page before recording Stock IN.
                    </small>
                  )}
                </label>
              )}

              {/* Current stock */}
              <label>
                Current stock

                <input
                  value={
                    selectedProduct
                      ? selectedProduct.quantity
                      : ""
                  }
                  readOnly
                />
              </label>

              {/* Quantity */}
              <label>
                Quantity

                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(event.target.value)
                  }
                  placeholder="Enter quantity"
                />
              </label>

              {/* Notes */}
              <label className="full-width">
                Notes (optional)

                <input
                  value={notes}
                  maxLength={500}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  placeholder="e.g. Supplier delivery or material issued"
                />
              </label>

            </div>

            {/* Expected stock */}
            {expectedStock !== null && (
              <p className="muted">
                Expected stock after movement:{" "}
                {expectedStock}
              </p>
            )}

            {/* Submit button */}
            <button
              type="submit"
              className="primary-button"
              disabled={
                saving ||
                !selectedProduct ||
                (type === "IN" && !selectedSupplier)
              }
            >
              {saving
                ? "Saving..."
                : "Record movement"}
            </button>

          </form>
        )}
      </section>

      {/* Movement history */}
      <section className="table-card">

        <div className="table-heading">
          <div>
            <h2>Movement history</h2>

            <p className="muted">
              Latest stock transactions
            </p>
          </div>
        </div>

        <div className="table-scroll">

          <table>
            <thead>
              <tr>
                <th>DATE</th>
                <th>PRODUCT</th>
                <th>SKU</th>
                <th>TYPE</th>
                <th>QUANTITY</th>
                <th>SUPPLIER</th>
                <th>NOTES</th>
              </tr>
            </thead>

            <tbody>

              {!loading && movements.map((movement) => (
                <tr key={movement.id}>

                  <td>
                    {formatDate(movement.createdAt)}
                  </td>

                  <td className="product-name">
                    {movement.product?.name || "—"}
                  </td>

                  <td>
                    {movement.product?.sku || "—"}
                  </td>

                  <td>
                    <span
                      className={
                        movement.type === "IN"
                          ? "badge good"
                          : "badge low"
                      }
                    >
                      {movement.type}
                    </span>
                  </td>

                  <td>
                    {movement.quantity}
                  </td>

                  <td>
                    {movement.supplier?.companyName || "—"}
                  </td>

                  <td>
                    {movement.notes || "—"}
                  </td>

                </tr>
              ))}

              {!loading && movements.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty-state">
                    No stock movements recorded yet.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan="7" className="empty-state">
                    Loading movement history...
                  </td>
                </tr>
              )}

            </tbody>
          </table>

        </div>
      </section>

    </section>
  );
}

export default StockMovements;

import { useEffect, useState } from "react";
import StockMovements from "./StockMovements";
import "./App.css";
import DashboardAnalytics from "./DashboardAnalytics";
import SupplierManagement from "./SupplierManagement";
import StaffManagement from "./StaffManagement";
import ActivityLogs from "./ActivityLogs";
import { useAuth } from "./auth/AuthContext";
import Login from "./auth/Login";
import { apiFetch } from "./services/api";

const emptyForm = {
  name: "",
  sku: "",
  category: "",
  unitPrice: "",
  quantity: "",
  reorderLevel: "",
};

function App() {
  const { token, user, logout } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [products, setProducts] = useState([]);
  const [archivedProducts, setArchivedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("name-asc");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [activePage, setActivePage] = useState("Dashboard");
  const [form, setForm] = useState({ ...emptyForm });
  const [reportMovements, setReportMovements] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportFromDate, setReportFromDate] = useState("");
  const [reportToDate, setReportToDate] = useState("");


async function loadProducts() {
  setLoading(true);
  setError("");

  try {
    const response = await apiFetch("/api/products", token);

    if (!response.ok) {
      throw new Error("Could not load products.");
    }

    const data = await response.json();
    setProducts(data);
  } catch (err) {
    console.error("Product loading failed:", err);
    setError(err.message || "Could not load products.");
  } finally {
    setLoading(false);
  }
}

async function loadArchivedProducts() {
  try {
    const response = await apiFetch("/api/products/archived", token);

    if (!response.ok) {
      throw new Error("Could not load archived products.");
    }

    const data = await response.json();
    setArchivedProducts(data);
  } catch (err) {
    console.error("Archived product loading failed:", err);
    setError(err.message || "Could not load archived products.");
  }
}


  useEffect(() => {
  if (token) {
    loadProducts();
    loadArchivedProducts();
  }
}, [token]);

  async function loadReportMovements() {
    setReportLoading(true);
    setReportError("");

    try {
      const response = await apiFetch("/api/stock-movements", token);
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Could not load stock movement report.");
      }
      const data = await response.json();
      setReportMovements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Report movement loading failed:", err);
      setReportError(err.message || "Could not load stock movement report.");
    } finally {
      setReportLoading(false);
    }
  }

  useEffect(() => {
  if (token && activePage === "Reports") {
    loadReportMovements();
  }
}, [activePage, token]);

  const filteredReportMovements = reportMovements.filter((movement) => {
    if (!movement.createdAt) return !reportFromDate && !reportToDate;
    const movementDate = new Date(movement.createdAt);
    if (Number.isNaN(movementDate.getTime())) return false;
    const date = [
      movementDate.getFullYear(),
      String(movementDate.getMonth() + 1).padStart(2, "0"),
      String(movementDate.getDate()).padStart(2, "0"),
    ].join("-");
    return (!reportFromDate || date >= reportFromDate) &&
      (!reportToDate || date <= reportToDate);
  });

  const reportTotalIn = filteredReportMovements
    .filter((movement) => String(movement.type).toUpperCase() === "IN")
    .reduce((sum, movement) => sum + Number(movement.quantity || 0), 0);
  const reportTotalOut = filteredReportMovements
    .filter((movement) => String(movement.type).toUpperCase() === "OUT")
    .reduce((sum, movement) => sum + Number(movement.quantity || 0), 0);

  function handleExportReportCSV() {
    const headers = ["Date", "Product", "SKU", "Movement Type", "Quantity", "Supplier"];
    const escapeCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = filteredReportMovements.map((movement) => [
      movement.createdAt ? new Date(movement.createdAt).toLocaleString("en-IN") : "",
      movement.product?.name || "",
      movement.product?.sku || "",
      movement.type || "",
      movement.quantity ?? "",
      movement.supplier?.companyName || "",
    ].map(escapeCell).join(","));

    const csv = "\uFEFF" + [headers.map(escapeCell).join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory-stock-movements-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function openAddForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function handleEditProduct(product) {
    setEditingId(product.id);

    setForm({
      name: product.name ?? "",
      sku: product.sku ?? "",
      category: product.category ?? "",
      unitPrice: String(product.unitPrice ?? ""),
      quantity: String(product.quantity ?? ""),
      reorderLevel: String(product.reorderLevel ?? ""),
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  async function handleSubmitProduct(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        category: form.category.trim(),
        unitPrice: Number(form.unitPrice),
        quantity: Number(form.quantity),
        reorderLevel: Number(form.reorderLevel),
      };

      const isEditing = editingId !== null;

      const response = await apiFetch(
  isEditing
    ? `/api/products/${editingId}`
    : "/api/products",
  token,
  {
    method: isEditing ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }
);


if (!response.ok) {
  const errorData = await response.json().catch(() => ({}));

  let message = errorData.message || "Could not save product.";

  if (errorData.fieldErrors) {
    message = Object.values(errorData.fieldErrors).join(" ");
  }

  throw new Error(message);
}


      const savedProduct = await response.json();

      setSuccess(
        `Product "${savedProduct.name}" ${
          isEditing ? "updated" : "added"
        } successfully.`
      );

      closeForm();
      await loadProducts();
    } catch (err) {
      console.error("Product save failed:", err);
      setError(err.message || "Failed to save product.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct(id) {
    const product = products.find((item) => item.id === id);

    if (!product) return;

    const confirmed = window.confirm(
      `Are you sure you want to archive "${product.name}"? You can restore it later.`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await apiFetch(`/api/products/${id}`, token, {
  method: "DELETE",
});

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Could not delete product.");
      }

      setSuccess(`Product "${product.name}" archived successfully.`);
      await loadProducts();
    } catch (err) {
      console.error("Product deletion failed:", err);
      setError(err.message || "Failed to delete product.");
    }
  }

  async function handleRestoreProduct(product) {
    const confirmed = window.confirm(
      `Restore "${product.name}" to the active product list?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await apiFetch(
  `/api/products/${product.id}/restore`,
  token,
  {
    method: "PATCH",
  }
);

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Could not restore product.");
      }

      setSuccess(`Product "${product.name}" restored successfully.`);
      await Promise.all([loadProducts(), loadArchivedProducts()]);
    } catch (err) {
      console.error("Product restoration failed:", err);
      setError(err.message || "Failed to restore product.");
    }
  }

  function handleExportCSV() {
    if (filteredProducts.length === 0) {
      setError("There are no products to export.");
      setSuccess("");
      return;
    }

    const headers = [
      "ID",
      "Product Name",
      "SKU",
      "Category",
      "Unit Price",
      "Quantity",
      "Reorder Level",
      "Stock Status",
    ];

    function escapeCSV(value, isText = false) {
      let cell = String(value ?? "");

      // Reduce the risk of spreadsheet formula injection in text fields.
      if (isText && /^[\s]*[=+\-@\t\r]/.test(cell)) {
        cell = "'" + cell;
      }

      return `"${cell.replace(/"/g, '""')}"`;
    }

    const rows = filteredProducts.map((product) => {
      const isLow =
        Number(product.quantity) <= Number(product.reorderLevel);

      return [
        escapeCSV(product.id),
        escapeCSV(product.name, true),
        escapeCSV(product.sku, true),
        escapeCSV(product.category || "", true),
        escapeCSV(product.unitPrice),
        escapeCSV(product.quantity),
        escapeCSV(product.reorderLevel),
        escapeCSV(isLow ? "Low stock" : "In stock", true),
      ].join(",");
    });

    const csvContent =
      "\uFEFF" +
      [
        headers.map((header) => escapeCSV(header, true)).join(","),
        ...rows,
      ].join("\r\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

    setError("");
    setSuccess(`${filteredProducts.length} product(s) exported successfully.`);
  }

  const categories = [
    ...new Set(
      products
        .map((product) => product.category?.trim())
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));

  const filteredProducts = products
    .filter((product) => {
      const matchesSearch = `${product.name} ${product.sku} ${
        product.category || ""
      }`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesCategory =
        categoryFilter === "All" || product.category === categoryFilter;

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name-desc":
          return (b.name || "").localeCompare(a.name || "");
        case "price-asc":
          return Number(a.unitPrice || 0) - Number(b.unitPrice || 0);
        case "price-desc":
          return Number(b.unitPrice || 0) - Number(a.unitPrice || 0);
        case "quantity-asc":
          return Number(a.quantity || 0) - Number(b.quantity || 0);
        case "quantity-desc":
          return Number(b.quantity || 0) - Number(a.quantity || 0);
        case "name-asc":
        default:
          return (a.name || "").localeCompare(b.name || "");
      }
    });

  const lowStock = products.filter(
    (product) => Number(product.quantity) <= Number(product.reorderLevel)
  ).length;

  const totalUnits = products.reduce(
    (sum, product) => sum + Number(product.quantity || 0),
    0
  );

  const inventoryValue = products.reduce(
    (sum, product) =>
      sum +
      Number(product.unitPrice || 0) * Number(product.quantity || 0),
    0
  );

  const formatCurrency = (amount) =>
    Number(amount).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });

  const isDashboard = activePage === "Dashboard";
  const isProducts = activePage === "Products";
  const isArchivedProducts = activePage === "Archived Products";

  if (!token || !user) {
  return <Login />;
}

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">I</div>
          <div>
            <h2>InvenTrack</h2>
            <span>Inventory management</span>
          </div>
        </div>

        <p className="menu-label">WORKSPACE</p>

        <div
          role="button"
          tabIndex={0}
          className={`nav-item ${isDashboard ? "active" : ""}`}
          onClick={() => setActivePage("Dashboard")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              setActivePage("Dashboard");
            }
          }}
        >
          Dashboard
        </div>
        <div
          role="button"
          tabIndex={0}
          className={`nav-item ${isProducts ? "active" : ""}`}
          onClick={() => setActivePage("Products")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              setActivePage("Products");
            }
          }}
        >
          Products
        </div>

        <div
          role="button"
          tabIndex={0}
          className={`nav-item ${isArchivedProducts ? "active" : ""}`}
          onClick={() => {
            setActivePage("Archived Products");
            setShowForm(false);
            setError("");
            setSuccess("");
            loadArchivedProducts();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              setActivePage("Archived Products");
              setShowForm(false);
              setError("");
              setSuccess("");
              loadArchivedProducts();
            }
          }}
        >
          Archived Products
        </div>

        <div
          role="button"
          tabIndex={0}
          className={`nav-item ${
            activePage === "Suppliers" ? "active" : ""
          }`}
          onClick={() => {
            setActivePage("Suppliers");
            setError("");
            setSuccess("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              setActivePage("Suppliers");
              setError("");
              setSuccess("");
            }
          }}
        >
          Suppliers
        </div>

        <div
          role="button"
          tabIndex={0}
          className={`nav-item ${
            activePage === "Stock movements" ? "active" : ""
          }`}
          onClick={() => {
            setActivePage("Stock movements");
            setError("");
            setSuccess("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              setActivePage("Stock movements");
              setError("");
              setSuccess("");
            }
          }}
        >
          Stock movements
        </div>

        <div
          role="button"
          tabIndex={0}
          className={`nav-item ${
            activePage === "Stock alerts" ? "active" : ""
          }`}
          onClick={() => setActivePage("Stock alerts")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              setActivePage("Stock alerts");
            }
          }}
        >
          Stock alerts
        </div>

        <div
          role="button"
          tabIndex={0}
          className={`nav-item ${
            activePage === "Reports" ? "active" : ""
          }`}
          onClick={() => setActivePage("Reports")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              setActivePage("Reports");
            }
          }}
        >
          Reports
        </div>

        {isAdmin && (
  <div
    role="button"
    tabIndex={0}
    className={`nav-item ${
      activePage === "Staff Management" ? "active" : ""
    }`}
    onClick={() => setActivePage("Staff Management")}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        setActivePage("Staff Management");
      }
    }}
  >
    Staff Management
  </div>
)}

        {isAdmin && (
          <div
            role="button"
            tabIndex={0}
            className={`nav-item ${
              activePage === "Activity Logs" ? "active" : ""
            }`}
            onClick={() => setActivePage("Activity Logs")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                setActivePage("Activity Logs");
              }
            }}
          >
            Activity Logs
          </div>
        )}

        <div className="sidebar-footer">
          <span className="status-dot" />
          Inventory workspace
        </div>
      </aside>

      <main className="main">

<header className="topbar">
  <div className="topbar-breadcrumb">
    <span className="breadcrumb-label">Workspace</span>
    <span className="breadcrumb-divider">/</span>
    <span className="breadcrumb-current">{activePage}</span>
  </div>

  <div className="account-panel">
    <div className="account-avatar">
      {(user.fullName || "User")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase()}
    </div>

    <div className="account-details">
      <span className="account-name">
        {user.fullName || "User"}
      </span>

      <span className="account-role">
        {user.role || "STAFF"}
      </span>
    </div>

    <div className="account-divider" />

    <button
      type="button"
      className="account-logout"
      onClick={logout}
    >
      <svg
        viewBox="0 0 24 24"
        width="17"
        height="17"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
      </svg>
      <span>Logout</span>
    </button>
  </div>
</header>


        {activePage === "Activity Logs" && isAdmin ? (
          <ActivityLogs />
        ) : activePage === "Staff Management" && isAdmin ? (
          <StaffManagement />
        ) : activePage === "Suppliers" ? (
          <SupplierManagement />
        ) : activePage === "Archived Products" ? (
          <section className="content">
            <div className="page-heading">
              <div>
                <p className="eyebrow">INVENTORY MANAGEMENT</p>
                <h1>Archived Products</h1>
                <p className="muted">
                  Products removed from the active catalogue. Restore them whenever needed.
                </p>
              </div>

              <button type="button" className="secondary-button refresh-icon-button" onClick={loadArchivedProducts} title="Refresh archived products" aria-label="Refresh archived products">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 7v5h-5" />
                  <path d="M4 17v-5h5" />
                  <path d="M5.6 9A7 7 0 0 1 17.2 6.4L20 12M4 12l2.8 5.6A7 7 0 0 0 18.4 15" />
                </svg>
              </button>
            </div>

            {success && <div className="success-message">{success}</div>}
            {error && <div className="error-message">{error}</div>}

            <section className="table-card">
              <div className="table-heading">
                <div>
                  <h2>Archived product list</h2>
                  <p className="muted">
                    {archivedProducts.length} archived product(s)
                  </p>
                </div>
              </div>

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>PRODUCT</th>
                      <th>SKU</th>
                      <th>CATEGORY</th>
                      <th>UNIT PRICE</th>
                      <th>QUANTITY</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedProducts.map((product) => (
                      <tr key={product.id}>
                        <td className="product-name">{product.name}</td>
                        <td>{product.sku}</td>
                        <td>{product.category || "—"}</td>
                        <td>{formatCurrency(product.unitPrice)}</td>
                        <td>{product.quantity}</td>
                        <td>
                          <button
                            className="secondary-button"
                            onClick={() => handleRestoreProduct(product)}
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}

                    {archivedProducts.length === 0 && (
                      <tr>
                        <td colSpan="6" className="empty-state">
                          No archived products found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        ) : activePage === "Stock movements" ? (
          <StockMovements />
        ) : activePage === "Stock alerts" ? (
          <section className="content">
            <div className="page-heading">
              <div>
                <p className="eyebrow">INVENTORY OPERATIONS</p>
                <h1>Stock alerts</h1>
                <p className="muted">
                  Products at or below their configured reorder level.
                </p>
              </div>

              <button type="button" className="secondary-button refresh-icon-button" onClick={loadProducts} disabled={loading} title="Refresh data" aria-label="Refresh data">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 7v5h-5" />
                  <path d="M4 17v-5h5" />
                  <path d="M5.6 9A7 7 0 0 1 17.2 6.4L20 12M4 12l2.8 5.6A7 7 0 0 0 18.4 15" />
                </svg>
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <section className="table-card">
              <div className="table-heading">
                <div>
                  <h2>Low-stock products</h2>
                  <p className="muted">
                    {loading
                      ? "Checking stock levels..."
                      : `${lowStock} product(s) need attention`}
                  </p>
                </div>
              </div>

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>PRODUCT</th>
                      <th>SKU</th>
                      <th>CATEGORY</th>
                      <th>QUANTITY</th>
                      <th>REORDER LEVEL</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!loading &&
                      products
                        .filter(
                          (product) =>
                            Number(product.quantity) <=
                            Number(product.reorderLevel)
                        )
                        .map((product) => (
                          <tr key={product.id}>
                            <td className="product-name">{product.name}</td>
                            <td>{product.sku}</td>
                            <td>{product.category || "—"}</td>
                            <td>{product.quantity}</td>
                            <td>{product.reorderLevel}</td>
                            <td>
                              <span className="badge low">Low stock</span>
                            </td>
                          </tr>
                        ))}

                    {!loading && lowStock === 0 && (
                      <tr>
                        <td colSpan="6" className="empty-state">
                          No low-stock products. All products are above their
                          reorder levels.
                        </td>
                      </tr>
                    )}

                    {loading && (
                      <tr>
                        <td colSpan="6" className="empty-state">
                          Loading stock alerts...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        ) : activePage === "Reports" ? (
          <section className="content">
            <div className="page-heading">
              <div>
                <p className="eyebrow">INVENTORY ANALYTICS</p>
                <h1>Reports</h1>
                <p className="muted">
                  Inventory valuation, stock health, and stock movement history.
                </p>
              </div>
              <div className="heading-actions">
                <button type="button" className="secondary-button refresh-icon-button" onClick={() => Promise.all([loadProducts(), loadReportMovements()])} disabled={loading || reportLoading} title="Refresh reports" aria-label="Refresh reports">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 7v5h-5" />
                  <path d="M4 17v-5h5" />
                  <path d="M5.6 9A7 7 0 0 1 17.2 6.4L20 12M4 12l2.8 5.6A7 7 0 0 0 18.4 15" />
                </svg>
                </button>
                <button
                  className="secondary-button"
                  onClick={handleExportReportCSV}
                  disabled={reportLoading || filteredReportMovements.length === 0}
                >
                  Export movements
                </button>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}
            {reportError && <div className="error-message">{reportError}</div>}

            <div className="stats">
              <article className="stat-card">
                <span>Total products</span>
                <strong>{loading ? "—" : products.length}</strong>
                <small>Active registered products</small>
              </article>
              <article className="stat-card">
                <span>Units in stock</span>
                <strong>{loading ? "—" : totalUnits}</strong>
                <small>Across all products</small>
              </article>
              <article className="stat-card">
                <span>Low-stock items</span>
                <strong>{loading ? "—" : lowStock}</strong>
                <small>At or below reorder level</small>
              </article>
              <article className="stat-card">
                <span>Inventory value</span>
                <strong>{loading ? "—" : formatCurrency(inventoryValue)}</strong>
                <small>Unit price × quantity</small>
              </article>
            </div>

            <section className="table-card">
              <div className="table-heading">
                <div>
                  <h2>Inventory valuation</h2>
                  <p className="muted">Estimated value calculated from unit price and quantity.</p>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>PRODUCT</th><th>SKU</th><th>CATEGORY</th>
                      <th>UNIT PRICE</th><th>QUANTITY</th><th>STOCK VALUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!loading && products.map((product) => (
                      <tr key={product.id}>
                        <td className="product-name">{product.name}</td>
                        <td>{product.sku}</td>
                        <td>{product.category || "—"}</td>
                        <td>{formatCurrency(product.unitPrice)}</td>
                        <td>{product.quantity}</td>
                        <td>{formatCurrency(Number(product.unitPrice || 0) * Number(product.quantity || 0))}</td>
                      </tr>
                    ))}
                    {!loading && products.length === 0 && (
                      <tr><td colSpan="6" className="empty-state">No products available for reporting.</td></tr>
                    )}
                    {loading && (
                      <tr><td colSpan="6" className="empty-state">Loading inventory report...</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="stats">
              <article className="stat-card">
                <span>Stock IN quantity</span>
                <strong>{reportLoading ? "—" : reportTotalIn}</strong>
                <small>For the selected date range</small>
              </article>
              <article className="stat-card">
                <span>Stock OUT quantity</span>
                <strong>{reportLoading ? "—" : reportTotalOut}</strong>
                <small>For the selected date range</small>
              </article>
              <article className="stat-card">
                <span>Movement records</span>
                <strong>{reportLoading ? "—" : filteredReportMovements.length}</strong>
                <small>Matching stock transactions</small>
              </article>
            </div>

            <section className="table-card">
              <div className="table-heading">
                <div>
                  <h2>Stock movement report</h2>
                  <p className="muted">Filter transactions by date and review supplier details for Stock IN.</p>
                </div>
                <div className="product-table-controls">
                  <label>
                    <small>From</small>
                    <input className="search-input" type="date" value={reportFromDate}
                      onChange={(event) => setReportFromDate(event.target.value)} />
                  </label>
                  <label>
                    <small>To</small>
                    <input className="search-input" type="date" value={reportToDate}
                      min={reportFromDate || undefined}
                      onChange={(event) => setReportToDate(event.target.value)} />
                  </label>
                  <button className="secondary-button" onClick={() => { setReportFromDate(""); setReportToDate(""); }}>
                    Clear dates
                  </button>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th>DATE</th><th>PRODUCT</th><th>SKU</th><th>TYPE</th><th>QUANTITY</th><th>SUPPLIER</th></tr>
                  </thead>
                  <tbody>
                    {!reportLoading && filteredReportMovements.map((movement) => (
                      <tr key={movement.id}>
                        <td>{movement.createdAt ? new Date(movement.createdAt).toLocaleString("en-IN") : "—"}</td>
                        <td className="product-name">{movement.product?.name || "—"}</td>
                        <td>{movement.product?.sku || "—"}</td>
                        <td><span className={`badge ${String(movement.type).toUpperCase() === "IN" ? "good" : "low"}`}>{movement.type || "—"}</span></td>
                        <td>{movement.quantity ?? "—"}</td>
                        <td>{movement.supplier?.companyName || "—"}</td>
                      </tr>
                    ))}
                    {!reportLoading && filteredReportMovements.length === 0 && (
                      <tr><td colSpan="6" className="empty-state">No stock movements found for this date range.</td></tr>
                    )}
                    {reportLoading && (
                      <tr><td colSpan="6" className="empty-state">Loading stock movements...</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="table-card">
              <div className="table-heading">
                <div>
                  <h2>Low-stock report</h2>
                  <p className="muted">Products at or below their configured reorder level.</p>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead><tr><th>PRODUCT</th><th>SKU</th><th>CATEGORY</th><th>AVAILABLE</th><th>REORDER LEVEL</th></tr></thead>
                  <tbody>
                    {!loading && products.filter((product) => Number(product.quantity) <= Number(product.reorderLevel)).map((product) => (
                      <tr key={product.id}>
                        <td className="product-name">{product.name}</td>
                        <td>{product.sku}</td>
                        <td>{product.category || "—"}</td>
                        <td>{product.quantity}</td>
                        <td>{product.reorderLevel}</td>
                      </tr>
                    ))}
                    {!loading && lowStock === 0 && (
                      <tr><td colSpan="5" className="empty-state">No low-stock products found.</td></tr>
                    )}
                    {loading && (
                      <tr><td colSpan="5" className="empty-state">Loading low-stock report...</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        ) : (
          <section className="content">
            <div className="page-heading">
              <div>
                <p className="eyebrow">
                  {isDashboard ? "OVERVIEW" : "INVENTORY CATALOGUE"}
                </p>
                <h1>
                  {isDashboard ? "Inventory dashboard" : "Products"}
                </h1>
                <p className="muted">
                  {isDashboard
                    ? "Monitor your products and stock levels in one place."
                    : "Manage your product catalogue and product details."}
                </p>
              </div>

              <div className="heading-actions">
                <button type="button" className="secondary-button refresh-icon-button" onClick={loadProducts} disabled={loading} title="Refresh data" aria-label="Refresh data">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 7v5h-5" />
                  <path d="M4 17v-5h5" />
                  <path d="M5.6 9A7 7 0 0 1 17.2 6.4L20 12M4 12l2.8 5.6A7 7 0 0 0 18.4 15" />
                </svg>
                </button>

                {isProducts && (
                  <>
                    <button
                      className="secondary-button"
                      onClick={handleExportCSV}
                      disabled={loading || filteredProducts.length === 0}
                    >
                      Download CSV
                    </button>

                    <button
                      className="primary-button"
                      onClick={openAddForm}
                    >
                      + Add product
                    </button>
                  </>
                )}
              </div>
            </div>

            {success && (
              <div className="success-message">{success}</div>
            )}

            {error && (
              <div className="error-message">
                <span>{error}</span>
                <button onClick={loadProducts}>Retry</button>
              </div>
            )}

            {showForm && (
              <section className="form-card">
                <div className="form-heading">
                  <div>
                    <h2>
                      {editingId !== null ? "Edit product" : "Add new product"}
                    </h2>
                    <p className="muted">
                      Enter the product details below.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={closeForm}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleSubmitProduct}>
                  <div className="form-grid">
                    <label>
                      Product name
                      <input
                        required
                        maxLength={255}
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        placeholder="Enter product name"
                      />
                    </label>

                    <label>
                      SKU
                      <input
                        required
                        maxLength={100}
                        value={form.sku}
                        onChange={(e) =>
                          setForm({ ...form, sku: e.target.value })
                        }
                        placeholder="e.g. SKU-001"
                      />
                    </label>

                    <label>
                      Category
                      <input
                        value={form.category}
                        onChange={(e) =>
                          setForm({ ...form, category: e.target.value })
                        }
                        placeholder="Electrical"
                      />
                    </label>

                    <label>
                      Unit price (₹)
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.unitPrice}
                        onChange={(e) =>
                          setForm({ ...form, unitPrice: e.target.value })
                        }
                      />
                    </label>

                    <label>
                      Quantity
                      <input
                        required
                        type="number"
                        min="0"
                        step="1"
                        value={form.quantity}
                        disabled={editingId !== null}
                        onChange={(e) =>
                          setForm({ ...form, quantity: e.target.value })
                        }
                      />
                      {editingId !== null && (
                        <small>
                          To change stock, use the Stock movements page.
                        </small>
                      )}
                    </label>

                    <label>
                      Reorder level
                      <input
                        required
                        type="number"
                        min="0"
                        step="1"
                        value={form.reorderLevel}
                        onChange={(e) =>
                          setForm({ ...form, reorderLevel: e.target.value })
                        }
                      />
                    </label>
                  </div>

                  <button
                    className="primary-button"
                    type="submit"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : editingId !== null
                        ? "Update product"
                        : "Save product"}
                  </button>
                </form>
              </section>
            )}

            {isDashboard && (
              <div className="stats">
                <article className="stat-card">
                  <span>Total products</span>
                  <strong>{loading ? "—" : products.length}</strong>
                  <small>Registered products</small>
                </article>

                <article className="stat-card">
                  <span>Units in stock</span>
                  <strong>{loading ? "—" : totalUnits}</strong>
                  <small>Across all products</small>
                </article>

                <article className="stat-card">
                  <span>Low-stock items</span>
                  <strong>{loading ? "—" : lowStock}</strong>
                  <small>At or below reorder level</small>
                </article>

                <article className="stat-card">
                  <span>Inventory value</span>
                  <strong>
                    {loading ? "—" : formatCurrency(inventoryValue)}
                  </strong>
                  <small>Unit price × quantity</small>
                </article>
              </div>
            )}

            {isDashboard && (
              <DashboardAnalytics
                products={products}
                formatCurrency={formatCurrency}
              />
            )}

            {isProducts && (
            <section className="table-card">
              <div className="table-heading">
                <div>
                  <h2>Product inventory</h2>
                  <p className="muted">
                    Your current product catalogue
                  </p>
                </div>

                <div className="product-table-controls">
                  <input
                    className="search-input"
                    type="search"
                    placeholder="Search products..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />

                  <select
                    className="search-input"
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    aria-label="Filter products by category"
                  >
                    <option value="All">All categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>

                  <select
                    className="search-input"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    aria-label="Sort products"
                  >
                    <option value="name-asc">Name: A to Z</option>
                    <option value="name-desc">Name: Z to A</option>
                    <option value="price-asc">Price: Low to high</option>
                    <option value="price-desc">Price: High to low</option>
                    <option value="quantity-asc">Quantity: Low to high</option>
                    <option value="quantity-desc">Quantity: High to low</option>
                  </select>
                </div>
              </div>

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>PRODUCT</th>
                      <th>SKU</th>
                      <th>CATEGORY</th>
                      <th>UNIT PRICE</th>
                      <th>QUANTITY</th>
                      <th>STATUS</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {!loading &&
                      filteredProducts.map((product) => {
                        const isLow =
                          Number(product.quantity) <=
                          Number(product.reorderLevel);

                        return (
                          <tr key={product.id}>
                            <td className="product-name">{product.name}</td>
                            <td>{product.sku}</td>
                            <td>{product.category || "—"}</td>
                            <td>{formatCurrency(product.unitPrice)}</td>
                            <td>{product.quantity}</td>
                            <td>
                              <span
                                className={
                                  isLow ? "badge low" : "badge good"
                                }
                              >
                                {isLow ? "Low stock" : "In stock"}
                              </span>
                            </td>
                            <td>
                              <div className="row-actions">
                                <button
                                  className="secondary-button"
                                  onClick={() => handleEditProduct(product)}
                                >
                                  Edit
                                </button>

                                <button
                                  className="delete-button"
                                  onClick={() =>
                                    handleDeleteProduct(product.id)
                                  }
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                    {!loading && filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan="7" className="empty-state">
                          {error
                            ? "Products are unavailable until the backend connects."
                            : "No products found."}
                        </td>
                      </tr>
                    )}

                    {loading && (
                      <tr>
                        <td colSpan="7" className="empty-state">
                          Loading products...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;

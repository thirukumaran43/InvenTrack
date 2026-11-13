
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth/AuthContext";
import { apiFetch } from "./services/api";

const emptyForm = {
  companyName: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
};

const EMAIL_REGEX =
  /^(?=.{1,254}$)(?=.{1,64}@)[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

function SupplierManagement() {
  const { token } = useAuth();

  const [suppliers, setSuppliers] = useState([]);
  const [archivedSuppliers, setArchivedSuppliers] = useState([]);
  const [showArchived, setShowArchived] = useState(false);

  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [emailError, setEmailError] = useState("");

  const [selectedHistorySupplier, setSelectedHistorySupplier] = useState(null);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const visibleSuppliers = showArchived
    ? archivedSuppliers
    : suppliers;

  async function loadSuppliers() {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const [activeResponse, archivedResponse] = await Promise.all([
        apiFetch("/api/suppliers", token),
        apiFetch("/api/suppliers/archived", token),
      ]);

      if (!activeResponse.ok || !archivedResponse.ok) {
        throw new Error("Could not load supplier records.");
      }

      const [activeData, archivedData] = await Promise.all([
        activeResponse.json(),
        archivedResponse.json(),
      ]);

      setSuppliers(activeData);
      setArchivedSuppliers(archivedData);
    } catch (err) {
      setError(err.message || "Unable to connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      loadSuppliers();
    }
  }, [token]);

  const filteredSuppliers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return visibleSuppliers;

    return visibleSuppliers.filter((supplier) =>
      [
        supplier.companyName,
        supplier.contactPerson,
        supplier.phone,
        supplier.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [visibleSuppliers, search]);

  const totalSupplied = purchaseHistory.reduce(
    (total, movement) => total + Number(movement.quantity || 0),
    0
  );

  function formatDate(value) {
    if (!value) return "—";

    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  async function viewPurchaseHistory(supplier) {
    setSelectedHistorySupplier(supplier);
    setPurchaseHistory([]);
    setHistoryLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiFetch(
        `/api/stock-movements/supplier/${supplier.id}`,
        token
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          message || "Could not load purchase history."
        );
      }

      const data = await response.json();
      setPurchaseHistory(data);
    } catch (err) {
      setError(
        err.message || "Failed to load purchase history."
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  function closeHistory() {
    setSelectedHistorySupplier(null);
    setPurchaseHistory([]);
  }

  function openAddForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setEmailError("");
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(supplier) {
    setEditingId(supplier.id);

    setForm({
      companyName: supplier.companyName || "",
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
    });

    setEmailError("");
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
    setEmailError("");
  }

  function handleEmailChange(value) {
    setForm({ ...form, email: value });
    setEmailError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const email = form.email.trim();

    // Email is optional, but if entered it must be valid.
    if (email && !EMAIL_REGEX.test(email)) {
      setEmailError(
        "Enter a valid email address, such as name@gmail.com."
      );
      return;
    }

    setEmailError("");
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      companyName: form.companyName.trim(),
      contactPerson: form.contactPerson.trim(),
      phone: form.phone.trim(),
      email,
      address: form.address.trim(),
    };

    try {
      const response = await apiFetch(
        editingId
          ? `/api/suppliers/${editingId}`
          : "/api/suppliers",
        token,
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Could not save supplier.");
      }

      const saved = await response.json();

      setSuccess(
        `Supplier "${saved.companyName}" ${
          editingId ? "updated" : "added"
        } successfully.`
      );

      closeForm();
      await loadSuppliers();
    } catch (err) {
      setError(err.message || "Failed to save supplier.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveSupplier(supplier) {
    if (
      !window.confirm(
        `Archive "${supplier.companyName}"? You can restore it later.`
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await apiFetch(
        `/api/suppliers/${supplier.id}`,
        token,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(
          (await response.text()) || "Could not archive supplier."
        );
      }

      setSuccess(`Supplier "${supplier.companyName}" archived.`);
      await loadSuppliers();
    } catch (err) {
      setError(err.message || "Failed to archive supplier.");
    }
  }

  async function restoreSupplier(supplier) {
    if (!window.confirm(`Restore "${supplier.companyName}"?`)) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await apiFetch(
        `/api/suppliers/${supplier.id}/restore`,
        token,
        {
          method: "PATCH",
        }
      );

      if (!response.ok) {
        throw new Error(
          (await response.text()) || "Could not restore supplier."
        );
      }

      setSuccess(`Supplier "${supplier.companyName}" restored.`);
      await loadSuppliers();
    } catch (err) {
      setError(err.message || "Failed to restore supplier.");
    }
  }

  return (
    <section className="content">

      {/* Page heading */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">VENDOR DIRECTORY</p>
          <h1>Supplier management</h1>
          <p className="muted">
            Maintain supplier contacts and company information.
          </p>
        </div>

        <div className="heading-actions">
          <button
            className="secondary-button"
            onClick={loadSuppliers}
            disabled={loading}
          >
            Refresh data
          </button>

          {!showArchived && (
            <button
              className="primary-button"
              onClick={openAddForm}
            >
              + Add supplier
            </button>
          )}
        </div>
      </div>

      {success && (
        <div className="success-message">{success}</div>
      )}

      {error && (
        <div className="error-message">{error}</div>
      )}

      {/* Supplier purchase history */}
      {selectedHistorySupplier && (
        <section className="table-card">

          <div className="table-heading">
            <div>
              <h2>
                Purchase history - {selectedHistorySupplier.companyName}
              </h2>

              <p className="muted">
                Products received from this supplier
              </p>
            </div>

            <button
              className="secondary-button"
              onClick={closeHistory}
            >
              Close history
            </button>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <p className="muted">Total transactions</p>
              <h2>{purchaseHistory.length}</h2>
            </div>

            <div className="stat-card">
              <p className="muted">Total quantity supplied</p>
              <h2>{totalSupplied}</h2>
            </div>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>PRODUCT</th>
                  <th>SKU</th>
                  <th>QUANTITY</th>
                  <th>NOTES</th>
                </tr>
              </thead>

              <tbody>
                {!historyLoading &&
                  purchaseHistory.map((movement) => (
                    <tr key={movement.id}>
                      <td>{formatDate(movement.createdAt)}</td>

                      <td className="product-name">
                        {movement.product?.name || "—"}
                      </td>

                      <td>
                        {movement.product?.sku || "—"}
                      </td>

                      <td>{movement.quantity}</td>

                      <td>{movement.notes || "—"}</td>
                    </tr>
                  ))}

                {historyLoading && (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      Loading purchase history...
                    </td>
                  </tr>
                )}

                {!historyLoading && purchaseHistory.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      No Stock IN transactions found for this supplier.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Add/Edit supplier form */}
      {showForm && (
        <section className="form-card">
          <div className="form-heading">
            <div>
              <h2>
                {editingId ? "Edit supplier" : "Add new supplier"}
              </h2>

              <p className="muted">
                Enter the supplier's contact information.
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

          <form onSubmit={handleSubmit}>
            <div className="form-grid">

              <label>
                Company name *
                <input
                  required
                  maxLength={150}
                  value={form.companyName}
                  onChange={(e) =>
                    setForm({ ...form, companyName: e.target.value })
                  }
                  placeholder="Enter company name"
                />
              </label>

              <label>
                Contact person
                <input
                  maxLength={120}
                  value={form.contactPerson}
                  onChange={(e) =>
                    setForm({ ...form, contactPerson: e.target.value })
                  }
                  placeholder="Enter contact person"
                />
              </label>

              <label>
                Phone
                <input
                  type="tel"
                  maxLength={30}
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                  placeholder="Enter phone number"
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  maxLength={254}
                  value={form.email}
                  onChange={(e) =>
                    handleEmailChange(e.target.value)
                  }
                  placeholder="name@example.com"
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={
                    emailError ? "supplier-email-error" : undefined
                  }
                />

                {emailError && (
                  <span
                    id="supplier-email-error"
                    className="error-message"
                    role="alert"
                  >
                    {emailError}
                  </span>
                )}
              </label>

              <label className="full-width">
                Address
                <textarea
                  rows="3"
                  maxLength={500}
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  placeholder="Enter supplier address"
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
                : editingId
                  ? "Update supplier"
                  : "Save supplier"}
            </button>
          </form>
        </section>
      )}

      {/* Supplier directory */}
      <section className="table-card">

        <div className="table-heading">
          <div>
            <h2>
              {showArchived
                ? "Archived suppliers"
                : "Supplier directory"}
            </h2>

            <p className="muted">
              {loading
                ? "Loading suppliers..."
                : `${filteredSuppliers.length} supplier(s)`}
            </p>
          </div>

          <div className="product-table-controls">
            <input
              className="search-input"
              type="search"
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <button
              className="secondary-button"
              onClick={() => {
                setShowArchived(!showArchived);
                setSearch("");
                setShowForm(false);
                setError("");
                setSuccess("");
                closeHistory();
              }}
            >
              {showArchived
                ? "View active suppliers"
                : "View archived"}
            </button>
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>COMPANY</th>
                <th>CONTACT PERSON</th>
                <th>PHONE</th>
                <th>EMAIL</th>
                <th>ADDRESS</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {!loading &&
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id}>

                    <td className="product-name">
                      {supplier.companyName}
                    </td>

                    <td>{supplier.contactPerson || "—"}</td>
                    <td>{supplier.phone || "—"}</td>
                    <td>{supplier.email || "—"}</td>
                    <td>{supplier.address || "—"}</td>

                    <td>
                      <div className="row-actions">

                        <button
                          className="secondary-button"
                          onClick={() => viewPurchaseHistory(supplier)}
                        >
                          History
                        </button>

                        {showArchived ? (
                          <button
                            className="secondary-button"
                            onClick={() => restoreSupplier(supplier)}
                          >
                            Restore
                          </button>
                        ) : (
                          <>
                            <button
                              className="secondary-button"
                              onClick={() => openEditForm(supplier)}
                            >
                              Edit
                            </button>

                            <button
                              className="delete-button"
                              onClick={() => archiveSupplier(supplier)}
                            >
                              Archive
                            </button>
                          </>
                        )}

                      </div>
                    </td>
                  </tr>
                ))}

              {!loading && filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-state">
                    {showArchived
                      ? "No archived suppliers found."
                      : "No suppliers found. Add your first supplier."}
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan="6" className="empty-state">
                    Loading suppliers...
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

export default SupplierManagement;

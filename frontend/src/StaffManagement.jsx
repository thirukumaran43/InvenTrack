
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth/AuthContext";
import { apiFetch } from "./services/api";

function StaffManagement() {
  const { token } = useAuth();

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  async function loadStaff() {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch("/api/admin/staff", token);

      if (!response.ok) {
        throw new Error("Could not load staff accounts.");
      }

      const data = await response.json();
      setStaff(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Could not load staff.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      loadStaff();
    }
  }, [token]);

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase();

    return staff.filter((person) =>
      `${person.fullName} ${person.email}`
        .toLowerCase()
        .includes(query)
    );
  }, [staff, search]);

  const EMAIL_REGEX =
  /^(?=.{1,254}$)(?=.{1,64}@)[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

function validateEmail(email) {
  return EMAIL_REGEX.test(email.trim());
}

  async function handleCreateStaff(event) {
    event.preventDefault();

    if (!validateEmail(form.email)) {
  setEmailError(
    "Enter a valid email address, such as name@gmail.com"
  );
  return;
}

setEmailError("");

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiFetch("/api/admin/staff", token, {
        method: "POST",
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Could not create staff account.");
      }

      setSuccess("Staff account created successfully.");

      setForm({
        fullName: "",
        email: "",
        password: "",
      });

      setShowForm(false);
      await loadStaff();
    } catch (err) {
      setError(err.message || "Staff creation failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(person) {
    const action = person.active ? "deactivate" : "activate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${person.fullName}'s account?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await apiFetch(
        `/api/admin/staff/${person.id}/${action}`,
        token,
        { method: "PATCH" }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Could not ${action} staff account.`);
      }

      setSuccess(
        `${person.fullName}'s account ${action}d successfully.`
      );

      await loadStaff();
    } catch (err) {
      setError(err.message || "Could not update staff status.");
    }
  }

  const activeCount = staff.filter((person) => person.active).length;
  const inactiveCount = staff.length - activeCount;

  return (
    <section className="content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">USER ADMINISTRATION</p>
          <h1>Staff Management</h1>
          <p className="muted">
            Create staff accounts and manage their access.
          </p>
        </div>

        <div className="heading-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={loadStaff}
            disabled={loading}
          >
            Refresh
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setShowForm(!showForm);
              setError("");
              setSuccess("");
            }}
          >
            + Add staff
          </button>
        </div>
      </div>

      {success && <div className="success-message">{success}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="stats">
        <article className="stat-card">
          <span>Total staff</span>
          <strong>{staff.length}</strong>
          <small>Registered staff accounts</small>
        </article>

        <article className="stat-card">
          <span>Active staff</span>
          <strong>{activeCount}</strong>
          <small>Accounts with access</small>
        </article>

        <article className="stat-card">
          <span>Inactive staff</span>
          <strong>{inactiveCount}</strong>
          <small>Accounts without access</small>
        </article>
      </div>

      {showForm && (
        <section className="form-card">
          <div className="form-heading">
            <div>
              <h2>Create staff account</h2>
              <p className="muted">
                Enter the details for the new staff member.
              </p>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowForm(false)}
              disabled={saving}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateStaff}>
            <div className="form-grid">
              <label>
                Full name
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={form.fullName}
                  onChange={(event) =>
                    setForm({ ...form, fullName: event.target.value })
                  }
                  placeholder="Enter full name"
                />
              </label>

              <label>
  Email address

  <input
    type="email"
    required
    maxLength={254}
    value={form.email}
    aria-invalid={Boolean(emailError)}
    onChange={(event) => {
      setForm({ ...form, email: event.target.value });
      setEmailError("");
    }}
    placeholder="name@gmail.com"
  />

  {emailError && (
    <small style={{ color: "#dc2626" }}>
      {emailError}
    </small>
  )}
</label>

              <label>
                Password
                <input
                  type="password"
                  required
                  minLength={8}
                  maxLength={72}
                  value={form.password}
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                  placeholder="Minimum 8 characters"
                />
              </label>
            </div>

            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              {saving ? "Creating..." : "Create staff account"}
            </button>
          </form>
        </section>
      )}

      <section className="table-card">
        <div className="table-heading">
          <div>
            <h2>Staff accounts</h2>
            <p className="muted">
              {filteredStaff.length} account(s)
            </p>
          </div>

          <input
            className="search-input"
            type="search"
            placeholder="Search staff..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>FULL NAME</th>
                <th>EMAIL</th>
                <th>ROLE</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {!loading &&
                filteredStaff.map((person) => (
                  <tr key={person.id}>
                    <td>{person.id}</td>
                    <td className="product-name">{person.fullName}</td>
                    <td>{person.email}</td>
                    <td>{person.role}</td>
                    <td>
                      <span
                        className={
                          person.active ? "badge good" : "badge low"
                        }
                      >
                        {person.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={
                          person.active
                            ? "delete-button"
                            : "secondary-button"
                        }
                        onClick={() => handleStatusChange(person)}
                      >
                        {person.active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}

              {!loading && filteredStaff.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-state">
                    No staff accounts found.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan="6" className="empty-state">
                    Loading staff accounts...
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

export default StaffManagement;

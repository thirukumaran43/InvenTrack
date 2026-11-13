
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "./auth/AuthContext";
import { apiFetch } from "./services/api";

function ActivityLogs() {
  const { token } = useAuth();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  async function loadLogs() {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch(
        "/api/admin/activity-logs",
        token
      );

      if (!response.ok) {
        throw new Error("Could not load activity logs.");
      }

      const data = await response.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Could not load activity logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      loadLogs();
    }
  }, [token]);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesSearch = [
        log.action,
        log.entityType,
        log.entityId,
        log.description,
        log.performedBy,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);

      const matchesAction =
        actionFilter === "ALL" || log.action === actionFilter;

      return matchesSearch && matchesAction;
    });
  }, [logs, search, actionFilter]);

  const productCount = logs.filter(
    (log) => log.entityType === "Product"
  ).length;

  const userCount = new Set(
    logs.map((log) => log.performedBy)
  ).size;

  function formatDate(dateValue) {
    if (!dateValue) return "—";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  function getActionLabel(action) {
    const labels = {
      PRODUCT_CREATED: "Created",
      PRODUCT_UPDATED: "Updated",
      PRODUCT_ARCHIVED: "Archived",
      PRODUCT_RESTORED: "Restored",
    };

    return labels[action] || action || "Unknown";
  }

  function getActionClass(action) {
    switch (action) {
      case "PRODUCT_CREATED":
        return "good";

      case "PRODUCT_UPDATED":
        return "badge-info";

      case "PRODUCT_ARCHIVED":
        return "low";

      case "PRODUCT_RESTORED":
        return "good";

      default:
        return "";
    }
  }

  return (
    <section className="content">

      <div className="page-heading">
        <div>
          <p className="eyebrow">SYSTEM MONITORING</p>

          <h1>Activity Logs</h1>

          <p className="muted">
            Track actions performed by ADMIN and STAFF users.
          </p>
        </div>

        <div className="heading-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={loadLogs}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      <div className="stats">

        <article className="stat-card">
          <span>Total activities</span>
          <strong>{logs.length}</strong>
          <small>Recorded system activities</small>
        </article>

        <article className="stat-card">
          <span>Product activities</span>
          <strong>{productCount}</strong>
          <small>Product-related operations</small>
        </article>

        <article className="stat-card">
          <span>Active users in history</span>
          <strong>{userCount}</strong>
          <small>Unique users who performed actions</small>
        </article>

      </div>

      <section className="table-card">

        <div className="table-heading">
          <div>
            <h2>Activity history</h2>

            <p className="muted">
              {filteredLogs.length} activity record(s)
            </p>
          </div>

          <div className="heading-actions">

            <input
              className="search-input"
              type="search"
              placeholder="Search activity..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

            <select
              className="search-input"
              value={actionFilter}
              onChange={(event) =>
                setActionFilter(event.target.value)
              }
            >
              <option value="ALL">All actions</option>
              <option value="PRODUCT_CREATED">Created</option>
              <option value="PRODUCT_UPDATED">Updated</option>
              <option value="PRODUCT_ARCHIVED">Archived</option>
              <option value="PRODUCT_RESTORED">Restored</option>
            </select>

          </div>
        </div>

        <div className="table-scroll">

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>ACTION</th>
                <th>MODULE</th>
                <th>DESCRIPTION</th>
                <th>PERFORMED BY</th>
                <th>DATE & TIME</th>
              </tr>
            </thead>

            <tbody>

              {!loading &&
                filteredLogs.map((log) => (
                  <tr key={log.id}>

                    <td>{log.id}</td>

                    <td>
                      <span
                        className={`badge ${getActionClass(log.action)}`}
                      >
                        {getActionLabel(log.action)}
                      </span>
                    </td>

                    <td>{log.entityType}</td>

                    <td className="product-name">
                      {log.description || "—"}
                      {log.entityId != null && (
                        <small style={{ display: "block" }}>
                          Record ID: {log.entityId}
                        </small>
                      )}
                    </td>

                    <td>{log.performedBy}</td>

                    <td>{formatDate(log.createdAt)}</td>

                  </tr>
                ))}

              {!loading && filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-state">
                    No activity records found.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan="6" className="empty-state">
                    Loading activity logs...
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

export default ActivityLogs;

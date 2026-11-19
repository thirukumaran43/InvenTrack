
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth/AuthContext";
import { apiFetch } from "./services/api";
import "./DashboardAnalytics.css";
import { formatIstDateTime } from "./utils/dateUtils";

function DashboardAnalytics({ products = [], formatCurrency }) {
  const { token } = useAuth();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadMovements() {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const response = await apiFetch("/api/stock-movements", token);

      if (!response.ok) {
        throw new Error("Could not load stock movement data.");
      }

      const data = await response.json();
      setMovements(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      loadMovements();
    }
  }, [token]);

  const analytics = useMemo(() => {
    const totalIn = movements
      .filter((item) => item.type === "IN")
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    const totalOut = movements
      .filter((item) => item.type === "OUT")
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    const categories = Object.values(
      products.reduce((groups, product) => {
        const category = product.category?.trim() || "Uncategorized";

        if (!groups[category]) {
          groups[category] = { name: category, units: 0 };
        }

        groups[category].units += Number(product.quantity || 0);
        return groups;
      }, {})
    ).sort((a, b) => b.units - a.units);

    const lowStockProducts = products
      .filter(
        (product) =>
          Number(product.quantity || 0) <=
          Number(product.reorderLevel || 0)
      )
      .sort(
        (a, b) =>
          Number(a.quantity || 0) - Number(b.quantity || 0)
      );

    const topProducts = [...products]
      .sort(
        (a, b) =>
          Number(b.unitPrice || 0) * Number(b.quantity || 0) -
          Number(a.unitPrice || 0) * Number(a.quantity || 0)
      )
      .slice(0, 5);

    const recentMovements = [...movements]
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      )
      .slice(0, 5);

    return {
      totalIn,
      totalOut,
      categories,
      lowStockProducts,
      topProducts,
      recentMovements,
    };
  }, [products, movements]);

  const movementMax = Math.max(
    analytics.totalIn,
    analytics.totalOut,
    1
  );

  const categoryMax = Math.max(
    ...analytics.categories.map((item) => item.units),
    1
  );

  function formatDate(value) {
  return formatIstDateTime(value);
}

  const money = (amount) =>
    formatCurrency
      ? formatCurrency(amount)
      : `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  return (
    <section className="analytics-section">
      <div className="da-heading">
        <div>
          <p className="eyebrow">BUSINESS INSIGHTS</p>
          <h2>Inventory analytics</h2>
          <p className="muted">
            Monitor stock performance and identify products that need attention.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={loadMovements}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh analytics"}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="da-analytics-grid">

        {/* Stock movement comparison */}
        <article className="da-card">
          <div className="da-card-heading">
            <div>
              <h3>Stock movement</h3>
              <p>Incoming versus outgoing units</p>
            </div>
          </div>

          {loading ? (
            <p className="da-empty">Loading movements...</p>
          ) : (
            <div className="da-chart">
              <div className="da-chart-item">
                <div className="da-chart-label">
                  <span>Stock IN</span>
                  <strong>{analytics.totalIn.toLocaleString("en-IN")}</strong>
                </div>
                <div className="da-bar-track">
                  <div
                    className="da-bar da-bar-in"
                    style={{
                      width: `${(analytics.totalIn / movementMax) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="da-chart-item">
                <div className="da-chart-label">
                  <span>Stock OUT</span>
                  <strong>{analytics.totalOut.toLocaleString("en-IN")}</strong>
                </div>
                <div className="da-bar-track">
                  <div
                    className="da-bar da-bar-out"
                    style={{
                      width: `${(analytics.totalOut / movementMax) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </article>

        {/* Category-wise inventory */}
        <article className="da-card">
          <div className="da-card-heading">
            <div>
              <h3>Category distribution</h3>
              <p>Current units across categories</p>
            </div>
          </div>

          {analytics.categories.length === 0 ? (
            <p className="da-empty">No category data available.</p>
          ) : (
            <div className="da-chart">
              {analytics.categories.map((item) => (
                <div className="da-chart-item" key={item.name}>
                  <div className="da-chart-label">
                    <span>{item.name}</span>
                    <strong>{item.units.toLocaleString("en-IN")}</strong>
                  </div>

                  <div className="da-bar-track">
                    <div
                      className="da-bar da-bar-category"
                      style={{
                        width: `${(item.units / categoryMax) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        {/* Low stock products */}
        <article className="da-card da-low-stock-card">
          <div className="da-card-heading">
            <div>
              <h3>Products needing attention</h3>
              <p>Products at or below reorder level</p>
            </div>

            <span className="da-count">
              {analytics.lowStockProducts.length}
            </span>
          </div>

          {analytics.lowStockProducts.length === 0 ? (
            <p className="da-empty">
              All products are above their reorder levels.
            </p>
          ) : (
            <div className="da-list">
              {analytics.lowStockProducts.slice(0, 5).map((product) => (
                <div className="da-list-row" key={product.id}>
                  <div className="da-product-info">
                    <strong>{product.name}</strong>
                    <small>{product.sku}</small>
                  </div>

                  <div className="da-stock-info">
                    <strong>{product.quantity} units</strong>
                    <span className="da-status-low">Low stock</span>
                    <small>Reorder at {product.reorderLevel}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        {/* Top products */}
        <article className="da-card">
          <div className="da-card-heading">
            <div>
              <h3>Top 5 products by value</h3>
              <p>Products with the highest current stock value</p>
            </div>
          </div>

          {analytics.topProducts.length === 0 ? (
            <p className="da-empty">No products available.</p>
          ) : (
            <div className="da-list">
              {analytics.topProducts.map((product) => (
                <div className="da-list-row" key={product.id}>
                  <div className="da-product-info">
                    <strong>{product.name}</strong>
                    <small>{product.sku}</small>
                  </div>

                  <strong className="da-product-value">
                    {money(
                      Number(product.unitPrice || 0) *
                      Number(product.quantity || 0)
                    )}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </article>

        {/* Recent activity */}
        <article className="da-card da-wide-card">
          <div className="da-card-heading">
            <div>
              <h3>Recent stock activity</h3>
              <p>Your latest five stock transactions</p>
            </div>
          </div>

          {loading ? (
            <p className="da-empty">Loading activity...</p>
          ) : analytics.recentMovements.length === 0 ? (
            <p className="da-empty">No stock movements recorded.</p>
          ) : (
            <div className="da-table-wrap">
              <table className="da-table">
                <thead>
                  <tr>
                    <th>PRODUCT</th>
                    <th>TYPE</th>
                    <th>QUANTITY</th>
                    <th>SUPPLIER</th>
                    <th>DATE</th>
                  </tr>
                </thead>

                <tbody>
                  {analytics.recentMovements.map((movement) => (
                    <tr key={movement.id}>
                      <td>
                        <strong>
                          {movement.product?.name || "Unknown product"}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={
                            movement.type === "IN"
                              ? "da-status-in"
                              : "da-status-out"
                          }
                        >
                          {movement.type}
                        </span>
                      </td>

                      <td>{movement.quantity}</td>

                      <td>
                        {movement.supplier?.companyName || "—"}
                      </td>

                      <td>{formatIstDateTime(movement.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

export default DashboardAnalytics;

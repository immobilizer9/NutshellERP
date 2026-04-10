"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_BADGE: Record<string, string> = {
  PENDING:  "badge badge-blue",
  APPROVED: "badge badge-green",
  REJECTED: "badge badge-red",
};

function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders]     = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  const [statusFilter,  setStatusFilter]  = useState("ALL");
  const [typeFilter,    setTypeFilter]    = useState("ALL");
  const [searchQuery,   setSearchQuery]   = useState("");

  useEffect(() => {
    fetch("/api/orders/list?limit=200", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.orders ?? null);
        if (list) {
          setOrders(list);
          setFiltered(list);
        } else {
          setError(data.error || "Failed to load orders.");
        }
      })
      .catch(() => setError("Failed to load orders."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = orders;
    if (statusFilter !== "ALL") result = result.filter((o) => o.status === statusFilter);
    if (typeFilter   !== "ALL") result = result.filter((o) => o.productType === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.school?.name?.toLowerCase().includes(q) ||
          o.createdBy?.name?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [statusFilter, typeFilter, searchQuery, orders]);

  return (
    <div className="page">

      {/* Page Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>Orders</h1>
          <p>View and manage all orders</p>
        </div>
        <button className="btn btn-primary" onClick={() => router.push("/orders/new")}>
          + New Order
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <label className="form-label">Status</label>
            <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div>
            <label className="form-label">Product Type</label>
            <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="ALL">All Types</option>
              <option value="ANNUAL">Annual</option>
              <option value="PAPERBACKS_PLAINS">Paperbacks — Plains</option>
              <option value="PAPERBACKS_HILLS">Paperbacks — Hills</option>
              <option value="NUTSHELL_ANNUAL">Nutshell — Annual</option>
              <option value="NUTSHELL_PAPERBACKS">Nutshell — Paperbacks</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">Search</label>
            <input
              className="input"
              placeholder="School or rep name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
      )}

      {/* Error */}
      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state">
          <p>No orders yet</p>
          <p>Orders will appear here once created</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && filtered.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>School</th>
                <th>Type</th>
                <th>Product</th>
                <th style={{ textAlign: "right" }}>Gross</th>
                <th style={{ textAlign: "right" }}>Net</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr
                  key={order.id}
                  style={{ opacity: order.status === "REJECTED" ? 0.6 : 1 }}
                >
                  <td style={{ fontWeight: 500 }}>
                    <a href={`/schools/${order.school?.id}`}
                      style={{ color: "inherit", textDecoration: "none" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "inherit"; }}>
                      {order.school?.name ?? "Unknown School"}
                    </a>
                  </td>
                  <td>{order.type}</td>
                  <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                    {order.productType?.replace(/_/g, " ")}
                  </td>
                  <td style={{ textAlign: "right", fontFamily: "monospace", color: "var(--text-secondary)" }}>
                    {formatINR(order.grossAmount)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "monospace",
                      fontWeight: 600,
                      color: order.status === "APPROVED" ? "var(--green)" : "inherit",
                    }}
                  >
                    {formatINR(order.netAmount)}
                  </td>
                  <td>
                    <span className={STATUS_BADGE[order.status] ?? "badge badge-gray"}>
                      {order.status}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                    {order.createdBy?.name ?? "—"}
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: 13, whiteSpace: "nowrap" }}>
                    {formatDate(order.createdAt)}
                  </td>
                  <td>
                    <a
                      href={`/orders/${order.id}`}
                      className="btn btn-secondary"
                      style={{ fontSize: 12, padding: "4px 10px" }}
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

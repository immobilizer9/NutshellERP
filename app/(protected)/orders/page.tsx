"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_STYLES: Record<string, string> = {
  PENDING:  "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/orders/list", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setOrders(data);
        } else {
          setError(data.error || "Failed to load orders.");
        }
      })
      .catch(() => setError("Failed to load orders."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-400 mt-1">
            {!loading && !error && `${orders.length} order${orders.length !== 1 ? "s" : ""} found`}
          </p>
        </div>
        <button
          onClick={() => router.push("/orders/new")}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition"
        >
          + New Order
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-gray-400 text-sm">Loading orders...</div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && orders.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-2">No orders yet</p>
          <p className="text-sm">Create your first order to get started.</p>
        </div>
      )}

      {/* Orders List */}
      {!loading && !error && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              onClick={() => router.push(`/orders/${order.id}`)}
              className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md cursor-pointer transition flex justify-between items-center"
            >
              <div>
                <p className="font-semibold text-gray-900">
                  {order.school?.name ?? "Unknown School"}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {order.type} · Created by {order.createdBy?.name ?? "Unknown"} ·{" "}
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <p className="text-xs text-gray-400">Gross</p>
                  <p className="text-sm text-gray-700">₹ {order.grossAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Net</p>
                  <p className="font-bold text-gray-900">₹ {order.netAmount.toLocaleString()}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    STATUS_STYLES[order.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

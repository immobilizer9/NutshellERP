"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch("/api/orders/list", {
          credentials: "include",
        });
        const data = await res.json();
        setOrders(data);
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, []);

  return (
    <div className="p-8 min-h-screen">

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Orders</h1>

        <button
          onClick={() => {
            console.log("Create button clicked");
            router.push("/orders/new");
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Create New Order
        </button>
      </div>

      {/* Loading */}
      {loading && <p>Loading orders...</p>}

      {/* No Orders */}
      {!loading && orders.length === 0 && (
        <p className="text-gray-500">No orders found.</p>
      )}

      {/* Orders List */}
      {!loading &&
        orders.map((order) => (
          <div
            key={order.id}
            onClick={() => router.push(`/orders/${order.id}`)}
            className="border rounded-lg p-4 mb-4 hover:bg-gray-50 cursor-pointer transition"
          >
            <div className="flex justify-between">
              <div>
                <p className="font-semibold">
                  {order.school?.name || "Unknown School"}
                </p>
                <p className="text-sm text-gray-500">
                  Created by: {order.createdBy?.name || "Unknown"}
                </p>
              </div>

              <div className="text-right">
                <p>Gross: ₹ {order.grossAmount}</p>
                <p className="font-semibold">
                  Net: ₹ {order.netAmount}
                </p>
              </div>
            </div>
          </div>
        ))}

    </div>
  );
}
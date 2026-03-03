"use client";

import { useEffect, useState } from "react";

export default function BDOrdersPage() {
  const [data, setData] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const fetchOrders = async () => {
    const res = await fetch("/api/bd/analytics", {
      credentials: "include",
    });
    const result = await res.json();
    setData(result);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (!data) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">
        Pending Orders
      </h1>

      {data.pendingOrders?.length === 0 && (
        <p className="text-gray-500">
          No pending approvals.
        </p>
      )}

      {data.pendingOrders?.map((order: any) => (
        <div
          key={order.id}
          className="border rounded-lg p-4 mb-3 cursor-pointer hover:bg-gray-50"
          onClick={() => setSelectedOrder(order)}
        >
          <p className="font-medium">
            {order.schoolName}
          </p>
          <p className="text-sm text-gray-500">
            ₹ {order.amount}
          </p>
        </div>
      ))}

      {/* MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-white bg-opacity-20 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-[500px]">

            <h2 className="text-xl font-bold mb-4">
              Order Details
            </h2>

            <p><strong>School:</strong> {selectedOrder.schoolName}</p>
            <p><strong>Amount:</strong> ₹ {selectedOrder.amount}</p>
            <p><strong>Status:</strong> {selectedOrder.status}</p>
            <p>
              <strong>Created At:</strong>{" "}
              {new Date(selectedOrder.createdAt).toLocaleString()}
            </p>

            <div className="mt-6 flex justify-end gap-3">

              <button
                className="px-4 py-2 border rounded"
                onClick={() => setSelectedOrder(null)}
              >
                Close
              </button>

              <button
                className="bg-green-600 text-white px-4 py-2 rounded"
                onClick={async () => {
                  await fetch("/api/bd/approve-order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                      orderId: selectedOrder.id,
                    }),
                  });

                  setSelectedOrder(null);
                  fetchOrders();
                }}
              >
                Approve
              </button>

              <button
                className="bg-red-600 text-white px-4 py-2 rounded"
                onClick={async () => {
                  await fetch("/api/bd/reject-order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                      orderId: selectedOrder.id,
                    }),
                  });

                  setSelectedOrder(null);
                  fetchOrders();
                }}
              >
                Reject
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
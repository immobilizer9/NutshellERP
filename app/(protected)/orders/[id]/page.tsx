"use client";

import { useEffect, useState } from "react";

export default function OrderDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/orders/${params.id}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setOrder(data));
  }, [params.id]);

  if (!order) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">
        Order Details
      </h1>

      <p><strong>School:</strong> {order.school?.name}</p>
      <p><strong>Status:</strong> {order.status}</p>
      <p><strong>Gross:</strong> ₹{order.grossAmount}</p>
      <p><strong>Net:</strong> ₹{order.netAmount}</p>

      <div className="mt-6">
        <h2 className="font-semibold mb-2">Items</h2>
        {order.items?.map((item: any) => (
          <div key={item.id} className="border-b py-2">
            {item.className} – {item.quantity} × ₹{item.unitPrice}
          </div>
        ))}
      </div>
    </div>
  );
}
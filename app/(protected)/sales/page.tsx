"use client";
import { toast } from "sonner";
import { useEffect, useState } from "react";

interface Order {
  id: string;
  schoolName: string;
  contactPerson: string;
  phone: string;
  amount: number;
  createdAt: string;
}

export default function SalesPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    schoolName: "",
    contactPerson: "",
    phone: "",
    email: "",
    amount: "",
  });
  useEffect(() => {
  fetch("/api/sales/tasks", { credentials: "include" })
    .then((res) => res.json())
    .then((data) => setTasks(data));
}, []);
const [report, setReport] = useState({
  summary: "",
  location: "",
});
  const fetchOrders = () => {
    fetch("/api/sales/orders", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setOrders(data));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCreate = async () => {
    await fetch("/api/sales/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });

    setShowModal(false);
    setForm({
      schoolName: "",
      contactPerson: "",
      phone: "",
      email: "",
      amount: "",
    });

    fetchOrders();
  };

  const totalAmount = orders.reduce((sum, o) => sum + o.amount, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sales Dashboard</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + New Order
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white shadow p-4 rounded">
          <p className="text-gray-500">Total Orders</p>
          <p className="text-2xl font-bold">{orders.length}</p>
        </div>
        <div className="bg-white shadow p-4 rounded">
          <p className="text-gray-500">Total Amount</p>
          <p className="text-2xl font-bold">₹ {totalAmount}</p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white shadow rounded overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-800 text-white text-sm uppercase">
            <tr>
              <th className="px-6 py-3 text-left">School</th>
              <th className="px-6 py-3 text-left">Contact</th>
              <th className="px-6 py-3 text-left">Phone</th>
              <th className="px-6 py-3 text-left">Amount</th>
            </tr>
          </thead>
          <tbody className="text-gray-900">
            {orders.map((order) => (
              <tr key={order.id} className="border-b hover:bg-gray-100">
                <td className="px-6 py-4">{order.schoolName}</td>
                <td className="px-6 py-4">{order.contactPerson}</td>
                <td className="px-6 py-4">{order.phone}</td>
                <td className="px-6 py-4">₹ {order.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
{/* Daily Reports Section */}
<div className="mt-10">
  <h2 className="text-xl font-bold mb-4">Daily Report</h2>

  <textarea
    placeholder="Write today's summary..."
    className="w-full p-3 border rounded mb-3"
    value={report.summary}
    onChange={(e) =>
      setReport({ ...report, summary: e.target.value })
    }
  />

  <input
    placeholder="Location"
    className="w-full p-3 border rounded mb-3"
    value={report.location}
    onChange={(e) =>
      setReport({ ...report, location: e.target.value })
    }
  />

  <button
   onClick={async () => {

  if (!navigator.geolocation) {
    toast.error("Geolocation not supported");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      await fetch("/api/sales/daily-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...report,
          latitude,
          longitude,
        }),
      });

      toast.success("Report submitted with location");

      setReport({ summary: "", location: "" });
    },
    () => {
      toast.error("Location permission required");
    }
  );
}}
    className="bg-purple-600 text-white px-4 py-2 rounded"
  >
    Submit Report
  </button>
</div>


<div className="bg-white p-4 shadow rounded mt-6">
  <h2 className="text-xl font-bold mb-4">My Tasks</h2>

  {tasks.map((task) => (
    <div key={task.id} className="flex justify-between border-b py-2">
      <div>
        <p className="font-semibold">{task.title}</p>
        <p className="text-sm text-gray-600">
          Due: {new Date(task.dueDate).toLocaleDateString()}
        </p>
      </div>

      {task.status === "PENDING" && (
        <button
          className="bg-green-600 text-white px-3 py-1 rounded"
          onClick={async () => {
            await fetch("/api/sales/complete-task", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ taskId: task.id }),
            });

            location.reload();
          }}
        >
          Complete
        </button>
      )}
    </div>
  ))}
</div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow w-96">
            <h2 className="text-xl font-bold mb-4">Create Order</h2>

            {Object.keys(form).map((key) => (
              <input
                key={key}
                placeholder={key}
                className="w-full mb-3 p-2 border rounded"
                value={(form as any)[key]}
                onChange={(e) =>
                  setForm({ ...form, [key]: e.target.value })
                }
              />
            ))}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
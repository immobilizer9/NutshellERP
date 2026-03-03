"use client";

import { useEffect, useState } from "react";
import Card from "@/app/components/Card";
export default function Dashboard() {
  const fetchUsers = async () => {
  const res = await fetch("/api/admin/users", { credentials: "include" });
  const data = await res.json();
  setUsers(data);
};
  const [data, setData] = useState<any>(null);
const [users, setUsers] = useState<any[]>([]);
const [bdHeads, setBdHeads] = useState<any[]>([]);
  useEffect(() => {
  fetch("/api/admin/users", { credentials: "include" })
    .then((res) => res.json())
    .then((data) => {
      setUsers(data);
fetchUsers();
      // Find only BD_HEAD users
      const bd = data.filter((u: any) =>
        u.roles.some((r: any) => r.role.name === "BD_HEAD")
      );

      setBdHeads(bd);
    });
}, []);
  useEffect(() => {
    fetch("/api/admin/analytics", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setData(data));
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Overview</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

  <Card>
    <p className="text-sm text-gray-500 mb-2">Total Orders</p>
    <h3 className="text-3xl font-bold">
      {data?.totalOrders || 0}
    </h3>
  </Card>

  <Card>
    <p className="text-sm text-gray-500 mb-2">Total Revenue</p>
    <h3 className="text-3xl font-bold text-green-600">
      ₹ {data?.totalRevenue || 0}
    </h3>
  </Card>

</div>

      {/* Leaderboard */}
      <Card>
        <h2 className="text-xl font-bold mb-4">Sales Leaderboard</h2>
        {data?.leaderboard?.map((user: any, index: number) => (
          
          <div
            key={index}
            className="flex justify-between border-b py-2"
          >
            <span>
              {index + 1}. {user.name}
            </span>
            <span>
              {user.orders} Orders | ₹ {user.revenue}
            </span>
          </div>
        ))}
        {data?.leaderboard?.length === 0 && (
  <p className="text-gray-500">No sales data yet.</p>
)}
      </Card>
      {/* User List */}
<div className="bg-white p-6 rounded-xl shadow-sm border mt-6">
  <h2 className="text-xl font-bold mb-4">Manage Reporting</h2>

  {users.map((user) => (
    <div key={user.id} className="border p-3 mb-2 rounded">
      <p className="font-semibold">{user.name}</p>
      <p className="text-sm text-gray-600 mb-2">
        Roles: {user.roles.map((r: any) => r.role.name).join(", ")}
      </p>

      <select
        className="border p-2 rounded"
        value={user.managerId || ""}
        onChange={async (e) => {
          await fetch("/api/admin/update-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              userId: user.id,
              managerId: e.target.value || null,
            }),
          });

          await fetchUsers(); // re-call your data function
        }}
      >
        <option value="">No Manager</option>

        {users
          .filter((u) =>
            u.roles.some((r: any) => r.role.name === "BD_HEAD")
          )
          .map((bd) => (
            <option key={bd.id} value={bd.id}>
              {bd.name}
            </option>
          ))}
      </select>
    </div>
  ))}
</div>
      {/* Latest Reports */}
      <Card>
        <h2 className="text-xl font-bold mb-4">Latest Reports</h2>
        {data.latestReports.map((report: any) => (
          <div key={report.id} className="border-b py-2">
            <p className="font-semibold">{report.salesUser.name}</p>
            <p>{report.summary}</p>
            <p className="text-sm text-gray-500">
              {new Date(report.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </Card>
    </div>
    
  );
}
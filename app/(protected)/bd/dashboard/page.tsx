"use client";

import { useEffect, useState } from "react";
import Badge from "@/app/components/Badge";
import Card from "@/app/components/Card";
export default function BDPage() {
  const [taskForm, setTaskForm] = useState({
  title: "",
  description: "",
  dueDate: "",
  assignedToId: "",
});

const [data, setData] = useState<any>(null);
const [team, setTeam] = useState<any[]>([]);

const fetchAnalytics = async () => {
  const res = await fetch("/api/bd/analytics", { credentials: "include" });
  const result = await res.json();
  setData(result);
};

const fetchTeam = async () => {
  const res = await fetch("/api/bd/team", { credentials: "include" });
  const result = await res.json();
  setTeam(result);
};
useEffect(() => {
  fetchAnalytics();
  fetchTeam();
}, []);

if (!data || data.error) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">BD Head Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 shadow rounded">
          <p>Total Team Orders</p>
          <p className="text-2xl font-bold">{data.totalOrders}</p>
        </div>
        <div className="bg-white p-4 shadow rounded">
          <p>Total Team Revenue</p>
          <p className="text-2xl font-bold">₹ {data.totalRevenue}</p>
        </div>
      </div>

<Card className="mt-8">

  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

    <div>
      <p className="text-sm text-gray-500">Total</p>
      <p className="text-2xl font-bold">{data?.totalTasks || 0}</p>
    </div>

    <div>
      <p className="text-sm text-gray-500">Completed</p>
      <p className="text-2xl font-bold text-green-600">
        {data?.completedTasks || 0}
      </p>
    </div>

    <div>
      <p className="text-sm text-gray-500">Pending</p>
      <p className="text-2xl font-bold text-yellow-600">
        {data?.pendingTasks || 0}
      </p>
    </div>

    <div>
      <p className="text-sm text-gray-500">Overdue</p>
      <p className="text-2xl font-bold text-red-600">
        {data?.overdueTasks || 0}
      </p>
    </div>

  </div>

  <div className="mt-6">
    <p className="text-sm text-gray-500 mb-2">Completion Rate</p>
    <div className="w-full bg-gray-200 rounded-full h-3">
      <div
        className="bg-blue-600 h-3 rounded-full transition-all"
        style={{ width: `${data?.completionRate || 0}%` }}
      />
    </div>
    <p className="text-sm mt-2 font-medium">
      {data?.completionRate || 0}%
    </p>
    </div>
</Card>


</div>

  );

}

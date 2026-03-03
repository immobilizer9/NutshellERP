"use client";

import { useEffect, useState } from "react";
import Card from "@/app/components/Card";
export default function BDOrdersPage() {
  const [data, setData] = useState<any>(null);

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
    <div>
    <Card className="mt-8">
  <h2 className="text-xl font-semibold mb-6">
    Sales Activity Status
  </h2>

  <div className="space-y-3">
    {data?.salesActivityStatus?.map((user: any) => (
      <div
        key={user.userId}
        className="flex justify-between items-center border-b pb-2"
      >
        <span>{user.name}</span>

        {user.isInactive ? (
          <span className="text-red-600 font-medium">
            Inactive
          </span>
        ) : (
          <span className="text-green-600 font-medium">
            Active
          </span>
        )}
      </div>
    ))}
  </div>
</Card>
<Card className="mt-8">
  <h2 className="text-xl font-semibold mb-6">Team Performance</h2>

  {data?.tasks?.length === 0 && (
    <p className="text-gray-500 mt-8">No tasks assigned yet.</p>
  )}
{data?.tasks?.length > 0 && (
  <div className="mt-6 space-y-4">
    {data.tasks.map((task: any) => {
      const isOverdue =
        task.status !== "COMPLETED" &&
        new Date(task.dueDate) < new Date();

      return (
        <div
          key={task.id}
          className={`border rounded-xl p-4 ${
            isOverdue
              ? "border-red-500 bg-red-50"
              : "border-gray-200 bg-white"
          }`}
        >
          {/* Overdue Badge */}
          {isOverdue && (
            <span className="text-red-600 text-xs font-semibold">
              OVERDUE
            </span>
          )}

          <div className="flex justify-between items-center mt-1">
            <h3 className="font-medium">{task.title}</h3>
            <span className="text-sm text-gray-500">
              {task.status}
            </span>
          </div>

          <p className="text-sm text-gray-600 mt-1">
            Due: {new Date(task.dueDate).toLocaleDateString()}
          </p>

          <p className="text-sm text-gray-700 mt-2">
            Assigned to: {task.assignedTo?.name}
          </p>
        </div>
      );
    })}
  </div>
)}
  
</Card>
</div>

  );
}
"use client";

import { useEffect, useState } from "react";
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

  if (!data) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">
        Task Management
      </h1>



<Card className="mt-8">
<div className="bg-white p-4 shadow rounded mb-6">
  <h2 className="text-xl font-bold mb-4">Create Task</h2>

  <input
    placeholder="Title"
    className="w-full p-2 border rounded mb-2"
    value={taskForm.title}
    onChange={(e) =>
      setTaskForm({ ...taskForm, title: e.target.value })
    }
  />

  <textarea
    placeholder="Description"
    className="w-full p-2 border rounded mb-2"
    value={taskForm.description}
    onChange={(e) =>
      setTaskForm({ ...taskForm, description: e.target.value })
    }
  />

  <input
    type="date"
    className="w-full p-2 border rounded mb-2"
    value={taskForm.dueDate}
    onChange={(e) =>
      setTaskForm({ ...taskForm, dueDate: e.target.value })
    }
  />

  <select
    className="w-full p-2 border rounded mb-2"
    value={taskForm.assignedToId}
    onChange={(e) =>
      setTaskForm({ ...taskForm, assignedToId: e.target.value })
    }
  >
    <option value="" disabled>
  Select Sales Member
</option>
    {team.map((member) => (
      <option key={member.id} value={member.id}>
        {member.name}
      </option>
    ))}
  </select>

  <button
  className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
  disabled={
    !taskForm.title ||
    !taskForm.dueDate ||
    !taskForm.assignedToId
  }
  onClick={async () => {
    await fetch("/api/bd/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(taskForm),
    });

    await fetchTeam(); // re-call your data function
  }}
>
  Create Task
</button>

</div>

</Card>

</div>

);
}

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
  return (
    <Card className="mt-8">
  <h2 className="text-xl font-semibold mb-6">
    Activity Timeline
  </h2>

  <div className="space-y-4">
    {data?.timeline?.map((item: any, index: number) => (
      <div
        key={index}
        className="border-l-4 border-gray-300 pl-4"
      >
        <p className="text-sm text-gray-500">
          {new Date(item.time).toLocaleString()}
        </p>

        <p className="font-medium">
          {item.user}
        </p>

        <p className="text-gray-700 text-sm">
          {item.description}
        </p>
      </div>
    ))}
  </div>
</Card>
  );
}

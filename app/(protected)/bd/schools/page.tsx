"use client";

import { useEffect, useState } from "react";

export default function BDSchoolsPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [form, setForm] = useState<any>({
    name: "",
    address: "",
    city: "",
    state: "",
    latitude: "",
    longitude: "",
  });

  const fetchSchools = async () => {
    const res = await fetch("/api/bd/schools", {
      credentials: "include",
    });
    const result = await res.json();
    setSchools(result);
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">
        Schools
      </h1>

      {/* Create School */}
      <div className="border p-4 rounded mb-6">
        <h2 className="font-semibold mb-3">Add School</h2>

        <div className="grid grid-cols-2 gap-3">
          {["name", "address", "city", "state", "latitude", "longitude"].map((field) => (
            <input
              key={field}
              placeholder={field}
              className="border p-2 rounded"
              value={form[field]}
              onChange={(e) =>
                setForm({ ...form, [field]: e.target.value })
              }
            />
          ))}
        </div>

        <button
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
          onClick={async () => {
            await fetch("/api/bd/schools", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                ...form,
                latitude: parseFloat(form.latitude),
                longitude: parseFloat(form.longitude),
              }),
            });

            setForm({
              name: "",
              address: "",
              city: "",
              state: "",
              latitude: "",
              longitude: "",
            });

            fetchSchools();
          }}
        >
          Add School
        </button>
      </div>

      {/* School List */}
      {schools.map((school) => (
        <div
          key={school.id}
          className="border p-4 rounded mb-3"
        >
          <p className="font-medium">{school.name}</p>
          <p className="text-sm text-gray-500">
            {school.city}, {school.state}
          </p>
        </div>
      ))}
    </div>
  );
}
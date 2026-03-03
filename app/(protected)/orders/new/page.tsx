"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const CLASSES = [
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
];

const UNIT_PRICE = 120;

export default function NewOrderPage() {
  const router = useRouter();

  const [schools, setSchools] = useState<any[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchSchools() {
      try {
        const res = await fetch("/api/bd/schools", {
          credentials: "include",
        });
        const data = await res.json();
        setSchools(data);
      } catch (err) {
        console.error("Failed to fetch schools:", err);
      }
    }

    fetchSchools();
  }, []);

  const handleQuantityChange = (className: string, value: number) => {
    setQuantities((prev) => ({
      ...prev,
      [className]: value,
    }));
  };

  const calculateGross = () => {
    return CLASSES.reduce((sum, className) => {
      const qty = quantities[className] || 0;
      return sum + qty * UNIT_PRICE;
    }, 0);
  };

  const handleSubmit = async () => {
    const items = CLASSES
      .filter((className) => (quantities[className] || 0) > 0)
      .map((className) => ({
        className,
        quantity: quantities[className],
        unitPrice: UNIT_PRICE,
      }));

    if (!schoolId) {
      alert("Please select a school.");
      return;
    }

    if (items.length === 0) {
      alert("Please enter at least one quantity.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          schoolId,
          items,
        }),
      });

      const data = await res.json();

      if (data.id) {
        router.push(`/orders/${data.id}`);
      } else {
        alert("Order creation failed.");
      }
    } catch (err) {
      console.error("Order creation error:", err);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 min-h-screen">

      <h1 className="text-2xl font-bold mb-8">
        Create New Order
      </h1>

      {/* School Selector */}
      <div className="mb-6">
        <label className="block mb-2 font-medium">
          Select School
        </label>

        <select
          className="border p-2 rounded w-full"
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
        >
          <option value="">Select a school</option>
          {schools.map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
            </option>
          ))}
        </select>
      </div>

      {/* Quantity Grid */}
      <div className="border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          Book Quantities
        </h2>

        <div className="grid grid-cols-4 gap-4">
          {CLASSES.map((className) => (
            <div key={className}>
              <label className="block text-sm mb-1">
                {className}
              </label>

              <input
                type="number"
                min="0"
                className="border p-2 rounded w-full"
                value={quantities[className] || ""}
                onChange={(e) =>
                  handleQuantityChange(
                    className,
                    Number(e.target.value)
                  )
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* Gross Preview */}
      <div className="text-xl font-semibold mb-6">
        Gross Total: ₹ {calculateGross()}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
      >
        {loading ? "Creating..." : "Create Order"}
      </button>

    </div>
  );
}
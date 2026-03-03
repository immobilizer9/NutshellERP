"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [users, setUsers] = useState<any[]>([]);
const [bdHeads, setBdHeads] = useState<any[]>([]);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    setError(data.error);
    return;
  }

  if (data.roles.includes("ADMIN")) {
    router.push("/dashboard");
  } else if (data.roles.includes("SALES")) {
    router.push("/sales");
  } 
  else if (data.roles.includes("BD_HEAD")) {
  router.push("/bd");
}
  else {
    router.push("/");
  }
};

  return (
    <div style={{ padding: "40px" }}>
      <h1>ERP Login</h1>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: "block", marginBottom: "10px" }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: "block", marginBottom: "10px" }}
      />

      <button onClick={handleLogin}>Login</button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
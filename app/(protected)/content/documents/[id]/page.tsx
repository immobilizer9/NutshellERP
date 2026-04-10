"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// Redirect legacy /content/documents/[id] → /content/workspace/[id]
export default function DocumentRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/content/workspace/${params.id}`);
  }, [params.id, router]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40vh", color: "var(--text-muted)" }}>
      Redirecting to editor…
    </div>
  );
}

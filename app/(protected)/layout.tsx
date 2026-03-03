import Link from "next/link";
import sidebar from "@/config/sidebar.json";

export default function Sidebar() {
  return (
    <div className="flex flex-col space-y-2">
      {sidebar.modules.map((module: string) => (
        <Link
          key={module}
          href={`/${module}`}
          className="p-2 rounded hover:bg-gray-200"
        >
          {module
            .split("-")
            .map((w) => w[0].toUpperCase() + w.slice(1))
            .join(" ")}
        </Link>
      ))}
    </div>
  );
}
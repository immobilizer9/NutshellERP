export default function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border p-6 transition hover:shadow-md ${className}`}
    >
      {children}
    </div>
  );
}
export default function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`card fade-in ${className}`}>
      {children}
    </div>
  );
}

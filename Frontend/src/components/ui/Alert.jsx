export default function Alert({ type = "error", children, className = "" }) {
  if (!children) return null;
  return (
    <div className={`alert alert--${type} ${className}`} role={type === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}

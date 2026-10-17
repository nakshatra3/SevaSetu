export default function Button({
  variant = "primary", // primary | secondary | ghost | danger
  size = "md", // md | sm
  loading = false,
  disabled = false,
  type = "button",
  className = "",
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="spinner spinner--inline" aria-hidden="true" />}
      {children}
    </button>
  );
}

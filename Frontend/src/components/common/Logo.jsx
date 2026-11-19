import { Link } from "react-router-dom";

export function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0E3B43" />
      <path d="M4 22h24M7 22a9 9 0 0 1 18 0" fill="none" stroke="#F2A93B" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ to = "/" }) {
  return (
    <Link to={to} className="logo">
      <LogoMark />
      <span>SevaSetu</span>
    </Link>
  );
}

export default function Badge({ tone = "neutral", children }) {
  // tone: neutral | success | warning | danger | info
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

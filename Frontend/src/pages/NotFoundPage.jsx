import { Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function NotFoundPage() {
  useDocumentTitle("Page not found");
  return (
    <div className="message-page">
      <h1>Page not found</h1>
      <p className="muted">The address may be mistyped, or the page has moved.</p>
      <Link className="btn btn--primary" to="/">Go to home</Link>
    </div>
  );
}

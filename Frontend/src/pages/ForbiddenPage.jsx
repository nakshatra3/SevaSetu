import { Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function ForbiddenPage() {
  useDocumentTitle("No access");
  return (
    <div className="message-page">
      <h1>You don't have access to this page</h1>
      <p className="muted">Your account type can't open it. Switch accounts or go back to your dashboard.</p>
      <Link className="btn btn--primary" to="/app">Back to dashboard</Link>
    </div>
  );
}

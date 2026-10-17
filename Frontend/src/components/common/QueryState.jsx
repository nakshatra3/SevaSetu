import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

// Wrap a page body: shows spinner while loading, an error with retry, else the children.
export default function QueryState({ loading, error, onRetry, children }) {
  if (loading) return <Spinner />;
  if (error) {
    return (
      <div className="stack">
        <Alert type="error">{error.message}</Alert>
        {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>}
      </div>
    );
  }
  return children;
}

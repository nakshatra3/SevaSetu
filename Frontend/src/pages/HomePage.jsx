import { Link } from "react-router-dom";
import BridgeIllustration from "@/components/common/BridgeIllustration";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  useDocumentTitle("");

  return (
    <section className="hero">
      <div className="hero__text">
        <h1>Connect people who want to help with places that need them.</h1>
        <p>
          SevaSetu matches volunteers with nearby organizations, so a free Sunday can turn into a cleaner beach,
          a taught class or a shared meal.
        </p>
        {!isAuthenticated && (
          <div className="hero__actions">
            <Link className="btn btn--primary" to="/register">Create an account</Link>
            <Link className="btn btn--secondary" to="/login">Log in</Link>
          </div>
        )}
      </div>
      <BridgeIllustration />
    </section>
  );
}

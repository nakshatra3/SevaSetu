import { Outlet, useLocation } from "react-router-dom";
import Logo from "@/components/common/Logo";
import BridgeIllustration from "@/components/common/BridgeIllustration";
import { Link } from "react-router-dom";

export default function AuthLayout() {
  const isRegisterPage = useLocation().pathname.startsWith("/register");
  return (
    <div className={`auth${isRegisterPage ? " auth--register" : ""}`}>
      <aside className="auth__art">
        {isRegisterPage ? (
          <Link to="/" className="register-brand" aria-label="SevaSetu homepage">
            <img src="/images/sevasetu-register-logo.svg" alt="" aria-hidden="true" />
            <span>SevaSetu</span>
          </Link>
        ) : (
          <Logo />
        )}
        <div>
          <BridgeIllustration />
          <h2>Good work needs the right people in the right place.</h2>
          <p>SevaSetu connects volunteers with organizations that need them.</p>
        </div>
      </aside>
      <main className="auth__panel">
        <Outlet />
      </main>
    </div>
  );
}

import { Outlet } from "react-router-dom";
import Logo from "@/components/common/Logo";
import BridgeIllustration from "@/components/common/BridgeIllustration";

export default function AuthLayout() {
  return (
    <div className="auth">
      <aside className="auth__art">
        <Logo />
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

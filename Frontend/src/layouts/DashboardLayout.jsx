import { Outlet } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function DashboardLayout() {
  return (
    <div className="shell">
      <Topbar />
      <Sidebar />
      <main className="shell__main" id="main">
        <Outlet />
      </main>
    </div>
  );
}

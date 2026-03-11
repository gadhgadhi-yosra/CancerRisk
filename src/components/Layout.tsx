import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

const Layout = () => (
  <div className="dark min-h-screen bg-background text-foreground">
    <Navbar />
    <main className="pt-16">
      <Outlet />
    </main>
  </div>
);

export default Layout;

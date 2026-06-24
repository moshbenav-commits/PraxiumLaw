import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import CommandPalette from "./CommandPalette";
import CoCounselSidebar from "./CoCounselSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet } from "react-router-dom";

export default function Shell() {
  const { user, loading } = useAuth();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setAiOpen((p) => !p);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-praxium-bg">
        <div className="font-mono text-xs uppercase tracking-widest text-praxium-subtle">
          loading praxium...
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen flex bg-praxium-bg text-praxium-ink">
      <Sidebar onAiToggle={() => setAiOpen((p) => !p)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onPaletteOpen={() => setPaletteOpen(true)} onAiToggle={() => setAiOpen((p) => !p)} />
        <main className="flex-1 overflow-auto" data-testid="main-content">
          <Outlet />
        </main>
      </div>
      <CoCounselSidebar open={aiOpen} onClose={() => setAiOpen(false)} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

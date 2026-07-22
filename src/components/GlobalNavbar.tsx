"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Factory, Snowflake, Settings, LogOut, FlaskConical, KeyRound } from "lucide-react";
import { useEffect, useState, FormEvent, Suspense } from "react";
import { User } from "@/lib/types";

function GlobalNavbarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoginError("");
    setBusy(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "A apărut o eroare.");
      }
      
      setCurrentUser(data.user);
      setLoginOpen(false);
      setLoginUsername("");
      setLoginPassword("");
      
      window.location.reload();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "A apărut o eroare.");
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      window.location.href = "/";
    } catch (error) {
      console.error(error);
    } finally {
      setBusy(false);
    }
  };

  const hasPermission = (p: string) => {
    if (!currentUser) return p === "calendar_view" || p === "gantt_view";
    if (currentUser.role === "Admin") return true;
    return currentUser.permissions?.includes(p as any) ?? false;
  };

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <Snowflake className="brand-icon" size={24} aria-hidden="true" />
          <strong>ClimaBook</strong>
          <span>Climate Chamber Booking</span>
        </div>

        <nav className="topnav" aria-label="Navigare">
          {hasPermission("calendar_view") && (
            <Link
              href="/"
              className={`nav-button ${pathname === "/" && view !== "admin" ? "active" : ""}`}
            >
              <CalendarDays size={16} aria-hidden="true" />
              Dashboard
            </Link>
          )}

          {hasPermission("gantt_view") && (
            <Link
              href="/ECR"
              className={`nav-button ${pathname.startsWith("/ECR") ? "active" : ""}`}
            >
              <Factory size={16} aria-hidden="true" />
              Gantt ECR
            </Link>
          )}

          {hasPermission("lab_view") && (
            <Link
              href="/lab-booking"
              className={`nav-button ${pathname.startsWith("/lab-booking") ? "active" : ""}`}
            >
              <FlaskConical size={16} aria-hidden="true" />
              Lab booking
            </Link>
          )}

          {hasPermission("admin") && (
            <Link
              href="/?view=admin"
              className={`nav-button ${pathname === "/" && view === "admin" ? "active" : ""}`}
            >
              <Settings size={16} aria-hidden="true" />
              Admin
            </Link>
          )}
        </nav>

        <div className="user-area">
          <span className="user-label">
            {currentUser ? `${currentUser.username} (${currentUser.role})` : "Viewer"}
          </span>
          {currentUser ? (
            <button className="button topbar-ghost" onClick={handleLogout} disabled={busy} type="button">
              <LogOut size={16} aria-hidden="true" />
              Logout
            </button>
          ) : (
            <button className="button primary" onClick={() => setLoginOpen(true)} disabled={busy} type="button">
              <KeyRound size={16} aria-hidden="true" />
              Login
            </button>
          )}
        </div>
      </header>

      {loginOpen && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-card input-card" onSubmit={handleLogin}>
            <h2>Autentificare</h2>
            {loginError && <div className="error-message">{loginError}</div>}
            <label>
              Username:
              <input
                autoFocus
                value={loginUsername}
                onChange={(event) => setLoginUsername(event.target.value)}
              />
            </label>
            <label>
              Parolă:
              <input
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                type="password"
              />
            </label>
            <div className="modal-actions">
              <button
                className="button secondary"
                onClick={() => {
                  setLoginOpen(false);
                  setLoginError("");
                }}
                type="button"
              >
                Anulează
              </button>
              <button className="button primary" disabled={busy} type="submit">
                Conectare
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export function GlobalNavbar() {
  return (
    <Suspense fallback={<header className="topbar"></header>}>
      <GlobalNavbarContent />
    </Suspense>
  );
}

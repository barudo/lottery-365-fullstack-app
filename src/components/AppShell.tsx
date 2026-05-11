import type { AppShellProps } from "../types";

export function AppShell({
  activePath,
  children,
  isAdmin,
  onLogout,
  onNavigate,
}: AppShellProps) {
  return (
    <main className="app-page">
      <header className="app-header">
        <h1>LUTRIJA365</h1>
        <nav aria-label="Main navigation">
          <a
            aria-current={activePath === "/profile" ? "page" : undefined}
            href="/profile"
            onClick={onNavigate("/profile")}
          >
            PROFILE
          </a>
          <a
            aria-current={activePath === "/tickets" ? "page" : undefined}
            href="/tickets"
            onClick={onNavigate("/tickets")}
          >
            NEW TICKET
          </a>
          <a
            aria-current={activePath === "/draw" ? "page" : undefined}
            href="/draw"
            onClick={onNavigate("/draw")}
          >
            DRAW
          </a>
          {isAdmin && (
            <a
              aria-current={activePath === "/users" ? "page" : undefined}
              href="/users"
              onClick={onNavigate("/users")}
            >
              USERS
            </a>
          )}
          <a
            aria-current={activePath === "/drawn-tickets" ? "page" : undefined}
            href="/drawn-tickets"
            onClick={onNavigate("/drawn-tickets")}
          >
            DRAWN TICKETS
          </a>
          <button type="button" onClick={onLogout}>
            LOGOUT
          </button>
        </nav>
      </header>

      {children}
    </main>
  );
}

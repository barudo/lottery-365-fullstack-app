import { type MouseEvent, type ReactNode, useEffect, useState } from "react";
import { DrawComponent } from "./components/DrawComponent";
import { DrawnTicketsComponent } from "./components/DrawnTicketsComponent";
import { LoginComponent } from "./components/LoginComponent";
import { ProfileComponent } from "./components/ProfileComponent";
import { RegisterComponent } from "./components/RegisterComponent";
import { TicketComponent } from "./components/TicketComponent";
import { UserComponent } from "./components/UserComponent";
import { getWebSocketUrl } from "./lib/api";
import { getCurrentUserRole, hasActiveSession } from "./lib/auth";
import type { DrawBroadcast } from "./types";
import "./App.css";

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [isAuthenticated, setIsAuthenticated] = useState(hasActiveSession);
  const [userRole, setUserRole] = useState(getCurrentUserRole);
  const [latestDraw, setLatestDraw] = useState<DrawBroadcast | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const socket = new WebSocket(getWebSocketUrl("/ws"));

    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data) as {
        data?: DrawBroadcast;
        event?: string;
      };

      if (payload.event === "admin-draw" && payload.data) {
        setLatestDraw(payload.data);
      }
    });

    return () => {
      socket.close();
    };
  }, [isAuthenticated]);

  const navigate =
    (nextPath: string) => (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      setCurrentPath(nextPath, setPath);
    };
  const isAdmin = userRole === "Admin";
  const handleLogout = () => logout(setIsAuthenticated, setUserRole, setPath);

  if (path === "/register") {
    return <RegisterComponent onNavigateLogin={navigate("/")} />;
  }

  if (path === "/profile") {
    return (
      <ProtectedRoute isAuthenticated={isAuthenticated} setPath={setPath}>
        <ProfileComponent isAdmin={isAdmin} onNavigate={navigate} onLogout={handleLogout} />
      </ProtectedRoute>
    );
  }

  if (path === "/tickets") {
    return (
      <ProtectedRoute isAuthenticated={isAuthenticated} setPath={setPath}>
        <TicketComponent isAdmin={isAdmin} onNavigate={navigate} onLogout={handleLogout} />
      </ProtectedRoute>
    );
  }

  if (path === "/draw") {
    return (
      <ProtectedRoute isAuthenticated={isAuthenticated} setPath={setPath}>
        <DrawComponent
          isAdmin={isAdmin}
          latestDraw={latestDraw}
          onNavigate={navigate}
          onLogout={handleLogout}
        />
      </ProtectedRoute>
    );
  }

  if (path === "/users") {
    return (
      <ProtectedRoute isAuthenticated={isAuthenticated} setPath={setPath}>
        {isAdmin ? (
          <UserComponent isAdmin={true} onNavigate={navigate} onLogout={handleLogout} />
        ) : null}
      </ProtectedRoute>
    );
  }

  if (path === "/drawn-tickets") {
    return (
      <ProtectedRoute isAuthenticated={isAuthenticated} setPath={setPath}>
        {isAdmin ? (
          <DrawnTicketsComponent isAdmin={true} onNavigate={navigate} onLogout={handleLogout} />
        ) : null}
      </ProtectedRoute>
    );
  }

  return (
    <LoginComponent
      onLogin={() => {
        setIsAuthenticated(true);
        setUserRole(getCurrentUserRole());
        setCurrentPath("/profile", setPath);
      }}
      onNavigateRegister={navigate("/register")}
    />
  );
}

type ProtectedRouteProps = {
  children: ReactNode;
  isAuthenticated: boolean;
  setPath: (path: string) => void;
};

function ProtectedRoute({
  children,
  isAuthenticated,
  setPath,
}: ProtectedRouteProps) {
  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentPath("/", setPath);
    }
  }, [isAuthenticated, setPath]);

  if (!isAuthenticated) {
    return null;
  }

  return children;
}

function logout(
  setIsAuthenticated: (isAuthenticated: boolean) => void,
  setUserRole: (role: string | null) => void,
  setPath: (path: string) => void,
) {
  localStorage.removeItem("lottery365.accessToken");
  localStorage.removeItem("lottery365.tokenExpiresAt");
  localStorage.removeItem("lottery365.userRole");
  setIsAuthenticated(false);
  setUserRole(null);
  setCurrentPath("/", setPath);
}

function setCurrentPath(nextPath: string, setPath: (path: string) => void) {
  window.history.pushState(null, "", nextPath);
  setPath(nextPath);
}

export default App;

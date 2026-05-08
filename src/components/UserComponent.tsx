import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { formatDateTime } from "../lib/format";
import type { PlayerUserResponse, ProtectedPageProps } from "../types";
import { AppShell } from "./AppShell";

export function UserComponent({ onLogout, onNavigate }: ProtectedPageProps) {
  const [users, setUsers] = useState<PlayerUserResponse[]>([]);
  const [message, setMessage] = useState("Loading users...");

  useEffect(() => {
    let isMounted = true;

    apiFetch("/api/users")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Users request failed.");
        }

        const nextUsers = (await response.json()) as PlayerUserResponse[];

        if (isMounted) {
          setUsers(nextUsers);
          setMessage("");
        }
      })
      .catch(() => {
        if (isMounted) {
          setMessage("Users could not be loaded.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AppShell activePath="/users" isAdmin={true} onLogout={onLogout} onNavigate={onNavigate}>
      <section className="profile-page">
        <h2 className="profile-table-title">USERS</h2>
        {message ? (
          <p className="profile-message" role="status">{message}</p>
        ) : (
          <div className="profile-table-wrap">
            <table className="profile-ticket-table">
              <thead>
                <tr>
                  <th>FIRST NAME</th>
                  <th>LAST NAME</th>
                  <th>EMAIL</th>
                  <th>CREATED AT</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={`${user.email}-${user.createdAt}`}>
                    <td>{user.name}</td>
                    <td>{user.lastname}</td>
                    <td>{user.email}</td>
                    <td>{formatDateTime(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}

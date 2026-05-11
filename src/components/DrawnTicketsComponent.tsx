import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { formatDateTime, formatNumbers, formatTicketId } from "../lib/format";
import type { DrawnTicketResponse, ProtectedPageProps } from "../types";
import { AppShell } from "./AppShell";

export function DrawnTicketsComponent({ isAdmin, onLogout, onNavigate }: ProtectedPageProps) {
  const [tickets, setTickets] = useState<DrawnTicketResponse[]>([]);
  const [message, setMessage] = useState("Loading drawn tickets...");

  useEffect(() => {
    let isMounted = true;

    apiFetch("/api/tickets/drawn")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Drawn tickets request failed.");
        }

        const nextTickets = (await response.json()) as DrawnTicketResponse[];

        if (isMounted) {
          setTickets(nextTickets);
          setMessage("");
        }
      })
      .catch(() => {
        if (isMounted) {
          setMessage("Drawn tickets could not be loaded.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AppShell activePath="/drawn-tickets" isAdmin={isAdmin} onLogout={onLogout} onNavigate={onNavigate}>
      <section className="profile-page">
        <h2 className="profile-table-title">DRAWN TICKETS</h2>
        {message ? (
          <p className="profile-message" role="status">{message}</p>
        ) : (
          <div className="profile-table-wrap">
            <table className="profile-ticket-table">
              <thead>
                <tr>
                  <th>WHEEL ID</th>
                  <th>WHEEL NUMBER</th>
                  <th>DRAW NUMBERS</th>
                  <th>WINNERS</th>
                  <th>DRAWN AT</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.wheelId}>
                    <td>{formatTicketId(ticket.wheelId)}</td>
                    <td>{ticket.wheelNumber}</td>
                    <td>{formatNumbers(ticket.drawNumbers)}</td>
                    <td>
                      {ticket.winners.length > 0
                        ? ticket.winners.map((winner) => `${winner.name} ${winner.lastname}`).join(", ")
                        : "No winners"}
                    </td>
                    <td>{formatDateTime(ticket.drawnAt)}</td>
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

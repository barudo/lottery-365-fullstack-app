import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { formatDrawStatus, formatNumbers, formatTicketId } from "../lib/format";
import type { MeResponse, ProtectedPageProps, TicketHistoryResponse } from "../types";
import { AppShell } from "./AppShell";

type EditProfileForm = {
  name: string;
  lastname: string;
  email: string;
};

export function ProfileComponent({ onLogout, onNavigate, isAdmin }: ProtectedPageProps) {
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [tickets, setTickets] = useState<TicketHistoryResponse[]>([]);
  const [message, setMessage] = useState("Loading profile...");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditProfileForm>({
    name: "",
    lastname: "",
    email: "",
  });
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let isMounted = true;

    Promise.all([apiFetch("/api/me"), apiFetch("/api/tickets")])
      .then(async ([profileResponse, ticketsResponse]) => {
        if (!profileResponse.ok || !ticketsResponse.ok) {
          throw new Error("Profile request failed.");
        }

        const nextProfile = (await profileResponse.json()) as MeResponse;
        const nextTickets =
          (await ticketsResponse.json()) as TicketHistoryResponse[];

        if (isMounted) {
          setProfile(nextProfile);
          setTickets(nextTickets);
          setMessage("");
        }
      })
      .catch(() => {
        if (isMounted) {
          setMessage("Profile could not be loaded.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (profile) {
      setEditForm({
        name: profile.name,
        lastname: profile.lastname,
        email: profile.email,
      });
    }
  }, [profile]);

  const openEditModal = () => {
    setSaveError("");
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => setIsEditModalOpen(false);

  const handleEditChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setEditForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile) {
      return;
    }

    setSaveError("");

    try {
      const response = await apiFetch("/api/me", {
        method: "PUT",
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        setSaveError("Unable to update profile.");
        return;
      }

      const updatedProfile = (await response.json()) as MeResponse;
      setProfile(updatedProfile);
      setIsEditModalOpen(false);
    } catch {
      setSaveError("Unable to update profile. Please try again.");
    }
  };

  return (
    <AppShell activePath="/profile" isAdmin={isAdmin} onLogout={onLogout} onNavigate={onNavigate}>
      <section className="profile-page">
        <div className="profile-summary">
          <div className="profile-photo" aria-label="Profile photo" />
          <div className="profile-details">
            <dl>
              <div><dt>IME:</dt><dd>{profile?.name ?? "-"}</dd></div>
              <div><dt>PREZIME:</dt><dd>{profile?.lastname ?? "-"}</dd></div>
              <div><dt>E MAIL:</dt><dd>{profile?.email ?? "-"}</dd></div>
            </dl>
            <button type="button" onClick={openEditModal}>EDIT PROFILE</button>
          </div>
        </div>

        {isEditModalOpen && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" onClick={closeEditModal}>
            <div className="edit-profile-modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <h2 id="edit-profile-title">Edit Profile</h2>
                <button type="button" className="modal-close-button" onClick={closeEditModal} aria-label="Close">×</button>
              </div>
              <form onSubmit={saveProfile} className="modal-content">
                <div className="modal-field"><label htmlFor="edit-name">First Name</label><input id="edit-name" name="name" type="text" value={editForm.name} onChange={handleEditChange} /></div>
                <div className="modal-field"><label htmlFor="edit-lastname">Last Name</label><input id="edit-lastname" name="lastname" type="text" value={editForm.lastname} onChange={handleEditChange} /></div>
                <div className="modal-field"><label htmlFor="edit-email">Email</label><input id="edit-email" name="email" type="email" value={editForm.email} onChange={handleEditChange} /></div>
                {saveError && <p className="modal-error">{saveError}</p>}
                <div className="modal-actions">
                  <button type="button" className="modal-secondary-button" onClick={closeEditModal}>Cancel</button>
                  <button type="submit" className="modal-primary-button">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <h2 className="profile-table-title">ODIGRANI LISTIĆI:</h2>
        {message ? (
          <p className="profile-message" role="status">{message}</p>
        ) : (
          <div className="profile-table-wrap">
            <table className="profile-ticket-table">
              <thead>
                <tr><th>TICEKT ID</th><th>ROUND ID</th><th>YOUR NUMBERS</th><th>DRAW NUMBERS</th><th>STATUS</th><th aria-label="Actions" /></tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>{formatTicketId(ticket.id)}</td>
                    <td>{ticket.roundId}</td>
                    <td>{formatNumbers(ticket.numbers)}</td>
                    <td>{ticket.drawNumbers ? formatNumbers(ticket.drawNumbers) : ""}</td>
                    <td className={`ticket-status ticket-status-${ticket.drawStatus.toLowerCase()}`}>{formatDrawStatus(ticket.drawStatus)}</td>
                    <td><button className="print-ticket-button" type="button" aria-label="Print ticket" /></td>
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

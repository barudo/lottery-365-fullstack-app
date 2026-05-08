import { type Dispatch, type SetStateAction, useState } from "react";
import { apiFetch } from "../lib/api";
import { getRandomDrawNumber } from "../lib/random";
import type { ProtectedPageProps } from "../types";
import { AppShell } from "./AppShell";

const ticketNumbers = Array.from({ length: 49 }, (_, index) => index + 1);

export function TicketComponent({ onLogout, onNavigate, isAdmin }: ProtectedPageProps) {
  const [manualNumbers, setManualNumbers] = useState<number[]>([]);
  const [randomNumbers, setRandomNumbers] = useState<number[]>([]);
  const [message, setMessage] = useState("");

  const toggleManualNumber = (number: number) => {
    setMessage("");
    setManualNumbers((currentNumbers) => {
      if (currentNumbers.includes(number)) {
        return currentNumbers.filter((currentNumber) => currentNumber !== number);
      }

      if (currentNumbers.length >= 6) {
        return currentNumbers;
      }

      return [...currentNumbers, number];
    });
  };

  const resetManualTicket = () => {
    setManualNumbers([]);
    setMessage("");
  };

  const generateRandomTicket = () => {
    setMessage("");
    setRandomNumbers((currentNumbers) => {
      if (currentNumbers.length >= 6) {
        return [];
      }

      return [...currentNumbers, getRandomDrawNumber(currentNumbers)];
    });
  };

  const saveTicket = async (
    numbers: number[],
    resetNumbers: Dispatch<SetStateAction<number[]>>,
  ) => {
    if (numbers.length !== 6) {
      setMessage("Choose 6 numbers before saving.");
      return;
    }

    const response = await apiFetch("/tickets", {
      body: JSON.stringify({ numbers }),
      method: "POST",
    });

    if (response.status !== 201) {
      setMessage("Ticket could not be saved.");
      return;
    }

    setMessage(`Ticket saved: ${numbers.join(", ")}`);
    resetNumbers([]);
  };

  return (
    <AppShell activePath="/tickets" isAdmin={isAdmin} onLogout={onLogout} onNavigate={onNavigate}>
      <section className="ticket-page">
        <div className="ticket-section">
          <div className="ticket-left">
            <h2>MAKE YOUR OWN TICKET</h2>
            <div className="number-grid" aria-label="Ticket numbers">
              {ticketNumbers.map((number) => (
                <button aria-pressed={manualNumbers.includes(number)} key={number} onClick={() => toggleManualNumber(number)} type="button">
                  {number}
                </button>
              ))}
            </div>
          </div>

          <TicketCircles numbers={manualNumbers} />

          <div className="ticket-buttons">
            {manualNumbers.length === 6 && <button className="reset-ticket-button" onClick={resetManualTicket} type="button">RESET</button>}
            <button className="save-ticket-button" onClick={() => saveTicket(manualNumbers, setManualNumbers)} type="button">SAVE</button>
          </div>
        </div>

        <div className="ticket-section random-ticket-section">
          <div className="ticket-left">
            <h2>RANDOM TICKET</h2>
            <button className="random-ticket-button" onClick={generateRandomTicket} type="button">
              {randomNumbers.length >= 6 ? "RESET" : "RANDOM"}
            </button>
          </div>

          <TicketCircles numbers={randomNumbers} />

          <div className="ticket-buttons">
            <button className="save-ticket-button" onClick={() => saveTicket(randomNumbers, setRandomNumbers)} type="button">SAVE</button>
          </div>
        </div>

        {message && <p className="ticket-message" role="status">{message}</p>}
      </section>
    </AppShell>
  );
}

function TicketCircles({ numbers }: { numbers: number[] }) {
  return (
    <div className="ticket-circles" aria-label="Selected ticket numbers">
      {Array.from({ length: 6 }, (_, index) => (
        <span className="ticket-circle" key={index}>
          {numbers[index] ?? ""}
        </span>
      ))}
    </div>
  );
}

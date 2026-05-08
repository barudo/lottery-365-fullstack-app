import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { getRandomDrawNumber } from "../lib/random";
import type { DrawBroadcast, ProtectedPageProps } from "../types";
import { AppShell } from "./AppShell";

type DrawComponentProps = ProtectedPageProps & {
  latestDraw: DrawBroadcast | null;
};

export function DrawComponent({ isAdmin, latestDraw, onLogout, onNavigate }: DrawComponentProps) {
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isAdmin || !latestDraw) {
      return;
    }

    const timeouts: number[] = [];
    setDrawnNumbers([]);
    setMessage(`Round ${latestDraw.currentDraw.roundNumber}`);

    latestDraw.currentDraw.numbers.forEach((number, index) => {
      const timeout = window.setTimeout(() => {
        setDrawnNumbers((currentNumbers) => [...currentNumbers, number]);
      }, index * 500);

      timeouts.push(timeout);
    });

    return () => {
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
    };
  }, [isAdmin, latestDraw]);

  const handleDraw = async () => {
    setMessage("");

    if (drawnNumbers.length >= 6) {
      setDrawnNumbers([]);
      return;
    }

    setIsDrawing(true);

    const nextNumbers = [...drawnNumbers, getRandomDrawNumber(drawnNumbers)];
    setDrawnNumbers(nextNumbers);

    if (nextNumbers.length < 6) {
      setIsDrawing(false);
      return;
    }

    try {
      const response = await apiFetch("/api/draws", {
        body: JSON.stringify({ numbers: nextNumbers }),
        method: "POST",
      });

      setMessage(response.ok ? "Draw published." : "Draw could not be saved.");
    } finally {
      setIsDrawing(false);
    }
  };

  return (
    <AppShell activePath="/draw" isAdmin={isAdmin} onLogout={onLogout} onNavigate={onNavigate}>
      <section className="admin-draw">
        {isAdmin ? (
          <>
            <h2>ADMIN DRAW NUMBERS</h2>
            <DrawCircles numbers={drawnNumbers} label="Drawn numbers" />
            <button className="draw-button" disabled={isDrawing} onClick={handleDraw} type="button">
              {drawnNumbers.length >= 6 ? "RESET" : "DRAW"}
            </button>
            {message && <p className="draw-message" role="status">{message}</p>}
          </>
        ) : (
          <>
            <h2>DRAW NUMBERS</h2>
            <DrawCircles numbers={drawnNumbers} label="Latest drawn numbers" />
            <p className="draw-message" role="status">
              {message || "Waiting for admin draw."}
            </p>
          </>
        )}
      </section>
    </AppShell>
  );
}

function DrawCircles({ numbers, label }: { numbers: number[]; label: string }) {
  return (
    <div className="draw-circles" aria-label={label}>
      {Array.from({ length: 6 }, (_, index) => (
        <span className="draw-circle" key={index}>
          {numbers[index] ?? ""}
        </span>
      ))}
    </div>
  );
}

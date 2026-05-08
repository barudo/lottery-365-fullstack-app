import type { MouseEvent, ReactNode } from "react";

export type ApiErrorResponse = {
  detail?: string;
  errors?: Record<string, string[]>;
  message?: string;
  title?: string;
};

export type DrawResponse = {
  drawnAt: string;
  id: string;
  numbers: number[];
  roundNumber: number;
};

export type DrawBroadcast = {
  currentDraw: DrawResponse;
  previousDraws: DrawResponse[];
};

export type DrawnTicketResponse = {
  drawNumbers: number[];
  drawnAt: string;
  wheelId: string;
  wheelNumber: number;
  winners: DrawWinnerResponse[];
};

export type DrawWinnerResponse = {
  email: string;
  lastname: string;
  name: string;
  ticketId: string;
  userId: string;
};

export type LoginResponse = {
  accessToken: string;
  expiresAt: string;
  tokenType: string;
  user: {
    email: string;
    id: string;
    lastname: string;
    name: string;
    role: string;
  };
};

export type MeResponse = {
  createdAt: string;
  email: string;
  id: string;
  lastname: string;
  name: string;
  role: string;
};

export type PlayerUserResponse = {
  createdAt: string;
  email: string;
  lastname: string;
  name: string;
};

export type TicketHistoryResponse = {
  createdAt: string;
  drawNumbers: number[] | null;
  drawStatus: string;
  id: string;
  numbers: number[];
  roundId: number;
};

export type ProtectedPageProps = {
  onLogout: () => void;
  onNavigate: (path: string) => (event: MouseEvent<HTMLAnchorElement>) => void;
  isAdmin: boolean;
};

export type AppShellProps = ProtectedPageProps & {
  activePath: string;
  children: ReactNode;
};

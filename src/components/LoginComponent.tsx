import { type ChangeEvent, type FormEvent, type MouseEvent, useState } from "react";
import { apiFetch } from "../lib/api";
import { getErrorMessages } from "../lib/format";
import type { ApiErrorResponse, LoginResponse } from "../types";

type LoginForm = {
  email: string;
  password: string;
};

type LoginComponentProps = {
  onLogin: () => void;
  onNavigateRegister: (event: MouseEvent<HTMLAnchorElement>) => void;
};

const initialForm: LoginForm = {
  email: "",
  password: "",
};

export function LoginComponent({ onLogin, onNavigateRegister }: LoginComponentProps) {
  const [form, setForm] = useState(initialForm);
  const [messages, setMessages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField =
    (field: keyof LoginForm) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessages([]);
    setIsSubmitting(true);

    try {
      const response = await apiFetch("/api/auth/login", {
        body: JSON.stringify(form),
        method: "POST",
      });

      if (!response.ok) {
        const error = (await response
          .json()
          .catch(() => null)) as ApiErrorResponse | null;
        setMessages(getErrorMessages(error, "Invalid email or password."));
        return;
      }

      const payload = (await response.json()) as LoginResponse;
      localStorage.setItem("lottery365.accessToken", payload.accessToken);
      localStorage.setItem("lottery365.tokenExpiresAt", payload.expiresAt);
      localStorage.setItem("lottery365.userRole", payload.user.role);
      setForm(initialForm);
      setMessages([`Logged in as ${payload.user.email}.`]);
      onLogin();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-header">
          <h1>LUTRIJA365</h1>
          <p>LOG IN</p>
        </div>

        <div className="login-fields">
          <input
            aria-label="Email"
            autoComplete="email"
            onChange={updateField("email")}
            placeholder="Email"
            required
            type="email"
            value={form.email}
          />
          <input
            aria-label="Password"
            autoComplete="current-password"
            onChange={updateField("password")}
            placeholder="Password"
            required
            type="password"
            value={form.password}
          />
        </div>

        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? "PRIJAVLJUJEM..." : "PRIJAVI SE"}
        </button>

        {messages.length > 0 && (
          <div className="login-messages" role="alert">
            {messages.map((currentMessage) => (
              <p key={currentMessage}>{currentMessage}</p>
            ))}
          </div>
        )}

        <a className="auth-link" href="/register" onClick={onNavigateRegister}>
          Create account
        </a>
      </form>
    </main>
  );
}

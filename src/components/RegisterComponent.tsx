import { type ChangeEvent, type FormEvent, type MouseEvent, useState } from "react";
import { apiFetch } from "../lib/api";
import { getErrorMessages } from "../lib/format";
import type { ApiErrorResponse } from "../types";

type RegistrationForm = {
  name: string;
  lastname: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type RegisterComponentProps = {
  onNavigateLogin: (event: MouseEvent<HTMLAnchorElement>) => void;
};

const initialRegistrationForm: RegistrationForm = {
  name: "",
  lastname: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function RegisterComponent({ onNavigateLogin }: RegisterComponentProps) {
  const [form, setForm] = useState(initialRegistrationForm);
  const [messages, setMessages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField =
    (field: keyof RegistrationForm) =>
    (event: ChangeEvent<HTMLInputElement>) => {
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
      const response = await apiFetch("/users", {
        body: JSON.stringify(form),
        method: "POST",
      });

      if (!response.ok) {
        const error = (await response
          .json()
          .catch(() => null)) as ApiErrorResponse | null;
        setMessages(getErrorMessages(error, "Registration failed."));
        return;
      }

      setForm(initialRegistrationForm);
      setMessages(["Registration successful."]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <form className="login-card registration-card" onSubmit={handleSubmit}>
        <div className="login-header registration-header">
          <h1>LUTRIJA365</h1>
          <p>REGISTRATION</p>
        </div>

        <div className="login-fields">
          <input aria-label="Name" autoComplete="given-name" onChange={updateField("name")} placeholder="Name" required type="text" value={form.name} />
          <input aria-label="Lastname" autoComplete="family-name" onChange={updateField("lastname")} placeholder="Lastname" required type="text" value={form.lastname} />
          <input aria-label="Email" autoComplete="email" onChange={updateField("email")} placeholder="Email" required type="email" value={form.email} />
          <input aria-label="Password" autoComplete="new-password" onChange={updateField("password")} placeholder="Password" required type="password" value={form.password} />
          <input aria-label="Confirm password" autoComplete="new-password" onChange={updateField("confirmPassword")} placeholder="Password" required type="password" value={form.confirmPassword} />
        </div>

        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? "REGISTERING" : "REGISTER"}
        </button>

        {messages.length > 0 && (
          <div className="login-messages" role="alert">
            {messages.map((currentMessage) => (
              <p key={currentMessage}>{currentMessage}</p>
            ))}
          </div>
        )}

        <a className="auth-link" href="/" onClick={onNavigateLogin}>
          Back to login
        </a>
      </form>
    </main>
  );
}

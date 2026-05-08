export function hasActiveSession() {
  const token = localStorage.getItem("lottery365.accessToken");
  const expiresAt = localStorage.getItem("lottery365.tokenExpiresAt");

  if (!token || !expiresAt) {
    return false;
  }

  return new Date(expiresAt).getTime() > Date.now();
}

export function getCurrentUserRole() {
  const storedRole = localStorage.getItem("lottery365.userRole");

  if (storedRole) {
    return storedRole;
  }

  const token = localStorage.getItem("lottery365.accessToken");

  if (!token) {
    return null;
  }

  try {
    const encodedPayload = token
      .split(".")[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const payload = JSON.parse(atob(encodedPayload)) as { role?: string };

    return payload.role ?? null;
  } catch {
    return null;
  }
}

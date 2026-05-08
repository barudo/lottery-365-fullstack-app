export function formatTicketId(id: string) {
  return id.replace(/-/g, "").slice(0, 6);
}

export function formatNumbers(numbers: number[]) {
  return numbers.join(" ");
}

export function formatDrawStatus(status: string) {
  return status === "Loading" ? "LOADING" : status.toUpperCase();
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function getErrorMessages(
  error: {
    detail?: string;
    errors?: Record<string, string[]>;
    message?: string;
    title?: string;
  } | null,
  fallbackMessage: string,
) {
  if (!error) {
    return [fallbackMessage];
  }

  if (error.errors) {
    const validationMessages = Object.values(error.errors).flat();

    if (validationMessages.length > 0) {
      return validationMessages;
    }
  }

  return [error.message ?? error.detail ?? error.title ?? fallbackMessage];
}

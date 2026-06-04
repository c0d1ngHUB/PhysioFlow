let onAuthFailure: (() => void) | null = null;

export function setOnAuthFailure(handler: (() => void) | null) {
  onAuthFailure = handler;
}

export function notifyAuthFailure() {
  onAuthFailure?.();
}

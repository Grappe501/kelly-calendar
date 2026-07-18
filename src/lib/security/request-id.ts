const REQUEST_ID_RE = /^[A-Za-z0-9._-]{8,64}$/;

export function createRequestId(): string {
  const rand = crypto.randomUUID().replaceAll("-", "");
  return `req_${rand.slice(0, 20)}`;
}

export function normalizeRequestId(incoming: string | null | undefined): string {
  if (incoming && REQUEST_ID_RE.test(incoming)) return incoming;
  return createRequestId();
}

export function isValidRequestId(value: string): boolean {
  return REQUEST_ID_RE.test(value);
}

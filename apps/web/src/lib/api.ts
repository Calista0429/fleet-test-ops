export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}
export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  headers.set('Accept', 'application/json');
  if (options?.body) headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await fetch(path, { ...options, headers });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiClientError(
      0,
      'NETWORK_ERROR',
      'Could not connect. Check that the server is running and try again.',
    );
  }
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiClientError(
      response.status,
      body?.error?.code ?? 'REQUEST_FAILED',
      body?.error?.message ?? 'The request failed. Please try again.',
      body?.error?.fieldErrors,
    );
  if (body === null)
    throw new ApiClientError(
      response.status,
      'INVALID_RESPONSE',
      'The server returned an unreadable response. Please try again.',
    );
  return body as T;
}

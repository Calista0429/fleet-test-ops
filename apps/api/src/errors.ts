import type { ErrorRequestHandler } from 'express';
import { ZodError, flattenError } from 'zod';
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fieldErrors?: Record<string, string[]>) { super(message); }
}
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  void _next; // Express identifies error middleware by its four-argument signature.
  if (error instanceof ZodError) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Check the supplied values.', fieldErrors: flattenError(error).fieldErrors } });
  } else if (error instanceof ApiError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message, ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}) } });
  } else if (error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Send a valid JSON request body.' } });
  } else {
    console.error('API request failed:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed. Please try again.' } });
  }
};

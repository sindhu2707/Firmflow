import { AxiosError } from 'axios';

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

// Shape of the 403 checkPlanLimit sends on the server — distinct from the
// {status, message} ApiErrorPayload the rest of the API uses, so it needs
// its own narrowing rather than reusing getErrorMessage's generic path.
export interface PlanLimitErrorPayload {
  error: 'PLAN_LIMIT_REACHED';
  message: string;
  resource: 'products' | 'employees';
  limit: number;
  currentCount: number;
}

export function getPlanLimitError(error: unknown): PlanLimitErrorPayload | null {
  if (!(error instanceof AxiosError)) return null;
  const data = error.response?.data;
  return data?.error === 'PLAN_LIMIT_REACHED' ? (data as PlanLimitErrorPayload) : null;
}
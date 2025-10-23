/**
 * Base API service
 * Provides typed fetch wrapper for backend API calls
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export class APIError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message?: string
  ) {
    super(message || `${status} ${statusText}`);
    this.name = 'APIError';
  }
}

/**
 * Generic GET request with type safety
 */
export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  
  try {
    const res = await fetch(url, {
      ...init,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new APIError(res.status, res.statusText);
    }

    return res.json() as Promise<T>;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new Error(`Failed to fetch ${url}: ${error}`);
  }
}

/**
 * Generic POST request with type safety
 */
export async function apiPost<T>(
  path: string,
  body?: any,
  init?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${path}`;
  
  try {
    const res = await fetch(url, {
      ...init,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      throw new APIError(res.status, res.statusText);
    }

    return res.json() as Promise<T>;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new Error(`Failed to post to ${url}: ${error}`);
  }
}

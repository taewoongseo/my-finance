import { useAuth } from '@clerk/clerk-react';

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export function useApiToken() {
  const { getToken } = useAuth();
  return getToken;
}

export async function authFetch(url, getToken, options = {}) {
  const token = await getToken();
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

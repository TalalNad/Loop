// frontend/src/api/auth.js
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';

async function handleResponse(response) {
  const isJson = response.headers
    .get('content-type')
    ?.includes('application/json');

  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    // backend sometimes uses "message", sometimes "error"
    const message = data?.message || data?.error || 'Something went wrong';
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function signup({ username, email, password }) {
  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, email, password }),
  });

  return handleResponse(res);
}

export async function login({ credential, password }) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ credential, password }),
  });

  return handleResponse(res);
}
// frontend/src/api/chat.js

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';

// Helper to attach token if you use JWT auth (you do for login/signup).
function authHeaders() {
  const token = localStorage.getItem('loop_token');

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(response) {
  const isJson = response.headers
    .get('content-type')
    ?.includes('application/json');

  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = data?.message || data?.error || 'Something went wrong';
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Fetch chatrooms for the current user.
 *
 * 🔧 ADAPT THIS to match your backend:
 * - If your route is different (e.g. /chatrooms/user), change the URL.
 * - If response shape is { chatrooms: [...] } adjust mapping in ChatsPage.
 */
export async function fetchChatrooms() {
  const res = await fetch(`${API_BASE_URL}/chatrooms`, {
    method: 'GET',
    headers: authHeaders(),
  });

  return handleResponse(res);
}

/**
 * Fetch messages for a given chatroom.
 * Assumes GET /chatrooms/:id/messages
 */
export async function fetchMessages(chatroomId) {
  const res = await fetch(
    `${API_BASE_URL}/chatrooms/${encodeURIComponent(chatroomId)}/messages`,
    {
      method: 'GET',
      headers: authHeaders(),
    }
  );

  return handleResponse(res);
}

/**
 * Send a message to a chatroom.
 * Assumes POST /chatrooms/:id/messages with { content }.
 */
export async function sendMessage(chatroomId, content) {
  const res = await fetch(
    `${API_BASE_URL}/chatrooms/${encodeURIComponent(chatroomId)}/messages`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ content }),
    }
  );

  return handleResponse(res);
}

/**
 * Search users by username.
 * Assumes GET /auth/users?username=xyz
 * 🔧 Change URL / query param if your backend is different.
 */
export async function searchUsersByUsername(username) {
  const res = await fetch(
    `${API_BASE_URL}/auth/users?username=${encodeURIComponent(username)}`,
    {
      method: 'GET',
      headers: authHeaders(),
    }
  );

  return handleResponse(res);
}

/**
 * Create (or get) a chatroom with another user.
 * For now I assume POST /chatrooms/start with { username } payload.
 * 🔧 Change path/body if your backend uses IDs or a different route.
 */
export async function startChatWithUser(username) {
  const res = await fetch(`${API_BASE_URL}/chatrooms/start`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ username }),
  });

  return handleResponse(res);
}
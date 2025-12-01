// frontend/src/api/chat.js

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';

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

// ========== 1:1 CHAT APIs ==========

export async function fetchChatrooms() {
  const res = await fetch(`${API_BASE_URL}/chatrooms`, {
    method: 'GET',
    headers: authHeaders(),
  });

  return handleResponse(res);
}

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

export async function startChatWithUser(username) {
  const res = await fetch(`${API_BASE_URL}/chatrooms/start`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ username }),
  });

  return handleResponse(res);
}

// ========== GROUP CHAT APIs ==========

// Create a group. Backend expects: { groupname, userid }
export async function createGroup(groupName, creatorUserId) {
  const res = await fetch(`${API_BASE_URL}/chatrooms/create-group`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      groupname: groupName,
      userid: creatorUserId,
    }),
  });

  return handleResponse(res);
}

// Add a member to a group. Backend expects: { groupid, userid }
export async function addGroupMember(groupId, userId) {
  const res = await fetch(`${API_BASE_URL}/chatrooms/add-group-member`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      groupid: groupId,
      userid: userId,
    }),
  });

  return handleResponse(res);
}

// Fetch messages for a group: GET /chatrooms/chatroom/group/:groupid
export async function fetchGroupMessages(groupId) {
  const res = await fetch(
    `${API_BASE_URL}/chatrooms/chatroom/group/${encodeURIComponent(groupId)}`,
    {
      method: 'GET',
      headers: authHeaders(),
    }
  );

  return handleResponse(res);
}

// Send a group message. Backend expects: { senderid, groupid, message }
export async function sendGroupMessage(groupId, content, senderId) {
  const res = await fetch(`${API_BASE_URL}/chatrooms/send-group-message`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      groupid: groupId,
      senderid: senderId,
      message: content,
    }),
  });

  return handleResponse(res);
}
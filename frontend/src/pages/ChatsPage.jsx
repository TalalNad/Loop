// frontend/src/pages/ChatsPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  fetchChatrooms,
  fetchMessages,
  sendMessage,
  searchUsersByUsername,
  startChatWithUser,
} from '../api/chat';

export default function ChatsPage() {
  const navigate = useNavigate();

  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null); // start with NOTHING selected
  const [messagesByChat, setMessagesByChat] = useState({});
  const [draft, setDraft] = useState('');

  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');

  // global user search (top left bar)
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSearchError, setUserSearchError] = useState('');

  const storedUser = localStorage.getItem('loop_user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  // Load chatrooms on mount
  useEffect(() => {
    async function loadChats() {
      setLoadingChats(true);
      setError('');
      try {
        const data = await fetchChatrooms();
        // Try to be flexible about the response shape:
        // it could be { chatrooms: [...] } or just [...]
        const list = Array.isArray(data) ? data : data.chatrooms || [];
        setChats(list);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to load chats');
      } finally {
        setLoadingChats(false);
      }
    }

    loadChats();
  }, []);

  const selectedChat = useMemo(
    () =>
      chats.find(
        (c) => String(c.id || c.chatroomid) === String(selectedChatId)
      ) || null,
    [chats, selectedChatId]
  );

  const messages = messagesByChat[selectedChatId] || [];

  // Load messages when chat changes
  useEffect(() => {
    if (!selectedChatId) return;

    async function loadMessages() {
      setLoadingMessages(true);
      try {
        const data = await fetchMessages(selectedChatId);
        const list = Array.isArray(data) ? data : data.messages || [];
        setMessagesByChat((prev) => ({
          ...prev,
          [selectedChatId]: list,
        }));
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to load messages');
      } finally {
        setLoadingMessages(false);
      }
    }

    // If we already have them locally, don’t refetch
    if (!messagesByChat[selectedChatId]) {
      loadMessages();
    }
  }, [selectedChatId, messagesByChat]);

  const handleSend = async (event) => {
    event.preventDefault();
    if (!draft.trim() || !selectedChatId) return;

    const content = draft.trim();
    setDraft('');

    // optimistic UI: show it instantly
    const optimistic = {
      id: Date.now(),
      fromMe: true,
      text: content,
      time: 'Just now',
    };

    setMessagesByChat((prev) => ({
      ...prev,
      [selectedChatId]: [...(prev[selectedChatId] || []), optimistic],
    }));

    try {
      const saved = await sendMessage(selectedChatId, content);
      // If backend returns the full message, normalize & replace the optimistic one if you want.
      // For now we simply trust optimistic message.
      console.log('Message saved:', saved);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to send message');
    }
  };

  // USER SEARCH – start chat by username
  const handleUserSearchSubmit = async (e) => {
    e.preventDefault();
    if (!userSearchTerm.trim()) return;

    setUserSearchLoading(true);
    setUserSearchError('');
    setUserSearchResults([]);

    try {
      const data = await searchUsersByUsername(userSearchTerm.trim());
      const users = Array.isArray(data) ? data : data.users || [];
      setUserSearchResults(users);
      if (users.length === 0) {
        setUserSearchError('No users found with that username.');
      }
    } catch (err) {
      console.error(err);
      setUserSearchError(err.message || 'Failed to search users');
    } finally {
      setUserSearchLoading(false);
    }
  };

  const handleStartChatWithUser = async (user) => {
    try {
      const chat = await startChatWithUser(user.username);

      // Again, try to be flexible: maybe response is { chatroom: {...} } or {...}
      const chatroom = chat.chatroom || chat.room || chat;

      // If this chatroom is not already in the list, add it
      setChats((prev) => {
        const exists = prev.some(
          (c) =>
            String(c.id || c.chatroomid) ===
            String(chatroom.id || chatroom.chatroomid)
        );
        return exists ? prev : [...prev, chatroom];
      });

      const id = chatroom.id || chatroom.chatroomid;
      setSelectedChatId(id);

      // Clear search UI
      setUserSearchTerm('');
      setUserSearchResults([]);
      setUserSearchError('');
    } catch (err) {
      console.error(err);
      setUserSearchError(err.message || 'Failed to start chat');
    }
  };

  return (
    <div className="wa-chat-layout">
      {/* LEFT SIDEBAR */}
      <aside className="wa-chat-sidebar">
        <header className="wa-chat-sidebar-header">
          <div className="wa-avatar-circle">
            <span className="wa-avatar-initial">
              {currentUser?.username?.[0]?.toUpperCase() || 'L'}
            </span>
          </div>

          {/* Global user search bar – top right area of header */}
          <form
            className="wa-header-search-form"
            onSubmit={handleUserSearchSubmit}
          >
            <input
              className="wa-header-search-input"
              placeholder="Search username to chat"
              value={userSearchTerm}
              onChange={(e) => {
                setUserSearchTerm(e.target.value);
                setUserSearchError('');
                setUserSearchResults([]);
              }}
            />
          </form>
        </header>

        {/* Show search results dropdown if any */}
        {userSearchTerm &&
          (userSearchLoading ||
            userSearchResults.length > 0 ||
            userSearchError) && (
            <div className="wa-user-search-results">
              {userSearchLoading && (
                <div className="wa-user-search-row small-text">
                  Searching…
                </div>
              )}

              {userSearchError && !userSearchLoading && (
                <div className="wa-user-search-row error-text">
                  {userSearchError}
                </div>
              )}

              {!userSearchLoading &&
                userSearchResults.map((user) => (
                  <button
                    key={user.userid || user.id || user.username}
                    type="button"
                    className="wa-user-search-row"
                    onClick={() => handleStartChatWithUser(user)}
                  >
                    <div className="wa-avatar-circle small">
                      <span className="wa-avatar-initial">
                        {(user.username || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="wa-user-search-text">
                      <div className="wa-user-search-name">
                        {user.username}
                      </div>
                      <div className="wa-user-search-email">
                        {user.email}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}

        <div className="wa-chat-tabs">
          <button className="wa-chat-tab active">All</button>
          <button className="wa-chat-tab">Unread</button>
          <button className="wa-chat-tab">Favourites</button>
          <button className="wa-chat-tab">Groups</button>
        </div>

        {/* Existing search bar under tabs can later be used to filter chat list only */}
        <div className="wa-chat-search-wrap">
          <input
            className="wa-chat-search-input"
            placeholder="Search or start a new chat"
          />
        </div>

        <div className="wa-chat-list">
          {loadingChats && (
            <div className="wa-chat-list-item">
              <span className="wa-chat-last">Loading chats…</span>
            </div>
          )}

          {!loadingChats && chats.length === 0 && (
            <div className="wa-chat-list-item">
              <span className="wa-chat-last">
                No chats yet. Search a username above to start one.
              </span>
            </div>
          )}

          {!loadingChats &&
            chats.map((chat) => {
              const id = chat.id || chat.chatroomid;
              const isActive = String(id) === String(selectedChatId);

              // Try to infer fields but keep fallbacks
              const name =
                chat.name || chat.title || chat.otherUsername || 'Chat';

              const lastMessage = chat.lastMessage || chat.preview || '';

              const time = chat.lastMessageTime || chat.time || '';

              const unread = chat.unread || chat.unreadCount || 0;

              return (
                <button
                  key={id}
                  className={`wa-chat-list-item ${
                    isActive ? 'active' : ''
                  }`}
                  onClick={() => setSelectedChatId(id)}
                >
                  <div className="wa-chat-avatar">
                    <div className="wa-avatar-circle small">
                      <span className="wa-avatar-initial">
                        {name[0].toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="wa-chat-list-main">
                    <div className="wa-chat-list-top">
                      <span className="wa-chat-name">{name}</span>
                      <span className="wa-chat-time">{time}</span>
                    </div>
                    <div className="wa-chat-list-bottom">
                      <span className="wa-chat-last">{lastMessage}</span>
                      {unread > 0 && (
                        <span className="wa-chat-unread-badge">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
        </div>

        {/* BOTTOM LEFT USER ICON – GO TO PROFILE + LOGOUT */}
        <div className="wa-chat-sidebar-bottom">
          <Link to="/profile" className="wa-profile-button">
            <div className="wa-avatar-circle small">
              <span className="wa-avatar-initial">
                {currentUser?.username?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <span className="wa-profile-label">Profile</span>
          </Link>

          <button
            type="button"
            className="wa-logout-button"
            onClick={() => {
              localStorage.removeItem('loop_token');
              localStorage.removeItem('loop_user');
              navigate('/login');
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* RIGHT PANEL – CURRENT CHAT OR LOOP EMPTY STATE */}
      <main className="wa-chat-main">
        {error && (
          <div className="wa-error-banner" style={{ margin: 8 }}>
            {error}
          </div>
        )}

        {selectedChat ? (
          <>
            <header className="wa-chat-main-header">
              <div className="wa-chat-header-left">
                <div className="wa-avatar-circle small">
                  <span className="wa-avatar-initial">
                    {(
                      selectedChat.name ||
                      selectedChat.title ||
                      selectedChat.otherUsername ||
                      'C'
                    )[0].toUpperCase()}
                  </span>
                </div>
                <div className="wa-chat-header-text">
                  <div className="wa-chat-header-name">
                    {selectedChat.name ||
                      selectedChat.title ||
                      selectedChat.otherUsername ||
                      'Chat'}
                  </div>
                  <div className="wa-chat-header-status">Online</div>
                </div>
              </div>
              <div className="wa-chat-header-right">
                {/* future header icons */}
              </div>
            </header>

            <section className="wa-chat-messages">
              {loadingMessages && !messages.length && (
                <div className="wa-chat-empty">
                  <p>Loading messages…</p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`wa-message-row ${
                    msg.fromMe ? 'from-me' : 'from-them'
                  }`}
                >
                  <div className="wa-message-bubble">
                    <span className="wa-message-text">
                      {msg.text || msg.content}
                    </span>
                    <span className="wa-message-time">
                      {msg.time || msg.sentAt || ''}
                    </span>
                  </div>
                </div>
              ))}
            </section>

            <form className="wa-chat-input-row" onSubmit={handleSend}>
              <div className="wa-chat-input-inner">
                <input
                  className="wa-chat-input"
                  placeholder="Type a message"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
              </div>
              <button type="submit" className="wa-send-button">
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="wa-chat-empty">
            <div className="wa-chat-empty-logo">Loop</div>
            <h2>Welcome to Loop</h2>
            <p>
              Select a chat on the left or search a username above to start a
              new conversation.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
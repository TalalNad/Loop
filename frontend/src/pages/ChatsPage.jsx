// frontend/src/pages/ChatsPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  fetchChatrooms,
  fetchMessages,
  sendMessage,
  searchUsersByUsername,
  startChatWithUser,
  createGroup,
  addGroupMember,
  fetchGroupMessages,
  sendGroupMessage,
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

  // global user search (top left bar, for 1:1 chats)
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSearchError, setUserSearchError] = useState('');

  // GROUP CREATION STATE
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState([]); // array of user objects
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [groupSearchResults, setGroupSearchResults] = useState([]);
  const [groupSearchLoading, setGroupSearchLoading] = useState(false);
  const [groupSearchError, setGroupSearchError] = useState('');

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

  // IMPORTANT: for groups, use groupid as key; for 1:1 use id/chatroomid
  const selectedChat = useMemo(
    () =>
      chats.find((c) => {
        const key = c.isGroup
          ? (c.groupid || c.id)
          : (c.id || c.chatroomid);
        return String(key) === String(selectedChatId);
      }) || null,
    [chats, selectedChatId]
  );

  const messages = messagesByChat[selectedChatId] || [];

  // Load messages when chat changes (1:1 vs group aware)
  useEffect(() => {
    if (!selectedChatId) return;
    if (!selectedChat) return;

    async function loadMessages() {
      setLoadingMessages(true);
      try {
        let list = [];

        if (selectedChat.isGroup) {
          // GROUP CHAT – always use the real groupid
          const groupId = selectedChat.groupid || selectedChatId;
          const data = await fetchGroupMessages(groupId);
          const raw = Array.isArray(data) ? data : data.messages || [];

          list = raw.map((row, index) => ({
            id: row.id || index + 1,
            fromMe:
              currentUser &&
              String(row.senderid) === String(currentUser.userid),
            content: row.content,
            sentAt: row.sent_at || row.created_at || row.sentAt || '',
            senderName: row.username || row.senderName || '',
          }));
        } else {
          // 1:1 CHAT – selectedChatId should be other user's id
          const data = await fetchMessages(selectedChatId);
          list = Array.isArray(data) ? data : data.messages || [];
        }

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
  }, [selectedChatId, selectedChat, messagesByChat, currentUser]);

  const handleSend = async (event) => {
    event.preventDefault();
    if (!draft.trim() || !selectedChatId || !selectedChat) return;

    const content = draft.trim();
    setDraft('');

    // optimistic UI: show it instantly
    const optimistic = {
      id: Date.now(),
      fromMe: true,
      content,
      sentAt: 'Just now',
    };

    setMessagesByChat((prev) => ({
      ...prev,
      [selectedChatId]: [...(prev[selectedChatId] || []), optimistic],
    }));

    try {
      if (selectedChat.isGroup) {
        // send group message – use groupid
        const groupId = selectedChat.groupid || selectedChatId;
        await sendGroupMessage(groupId, content, currentUser?.userid);
      } else {
        // send 1:1 message
        await sendMessage(selectedChatId, content);
      }
      // For now, we trust optimistic message.
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to send message');
    }
  };

  // USER SEARCH – start 1:1 chat by username
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

  // GROUP: search users to add as members
  const handleGroupUserSearchSubmit = async (e) => {
    e.preventDefault();
    if (!groupSearchTerm.trim()) return;

    setGroupSearchLoading(true);
    setGroupSearchError('');
    setGroupSearchResults([]);

    try {
      const data = await searchUsersByUsername(groupSearchTerm.trim());
      const users = Array.isArray(data) ? data : data.users || [];
      setGroupSearchResults(users);
      if (users.length === 0) {
        setGroupSearchError('No users found.');
      }
    } catch (err) {
      console.error(err);
      setGroupSearchError(err.message || 'Failed to search users');
    } finally {
      setGroupSearchLoading(false);
    }
  };

  const toggleAddGroupMember = (user) => {
    const key = user.userid || user.id || user.username;
    setGroupMembers((prev) => {
      const exists = prev.some(
        (u) => (u.userid || u.id || u.username) === key
      );
      if (exists) {
        return prev.filter(
          (u) => (u.userid || u.id || u.username) !== key
        );
      }
      return [...prev, user];
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || groupMembers.length === 0 || !currentUser) return;

    try {
      // 1) Create the group
      const created = await createGroup(groupName.trim(), currentUser.userid);
      const group = created.group || created;

      const groupId = group.groupid || group.id;

      // 2) Add each selected member
      for (const member of groupMembers) {
        const memberId = member.userid || member.id;
        await addGroupMember(groupId, memberId);
      }

      // 3) Add the group to chats sidebar
      const groupChatroom = {
        id: groupId, // keep for backwards compatibility
        groupid: groupId, // explicit group id
        name: group.groupname || groupName.trim(),
        isGroup: true,
        lastMessage: '',
        lastMessageTime: '',
        unread: 0,
      };

      setChats((prev) => [...prev, groupChatroom]);

      // 4) Select this group & exit creation mode
      setSelectedChatId(groupId);
      setIsCreatingGroup(false);
      setGroupName('');
      setGroupMembers([]);
      setGroupSearchTerm('');
      setGroupSearchResults([]);
      setGroupSearchError('');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to create group');
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

          {/* Global user search bar – top right area of header (for 1:1) */}
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

        {/* Show user search results dropdown if any */}
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

          {/* NEW GROUP BUTTON */}
          <button
            type="button"
            className="wa-chat-tab wa-chat-tab-new-group"
            onClick={() => {
              setIsCreatingGroup(true);
              setGroupName('');
              setGroupMembers([]);
              setGroupSearchTerm('');
              setGroupSearchResults([]);
              setGroupSearchError('');
            }}
          >
            + New Group
          </button>
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
              // For groups, use groupid as selection id; for 1:1 use id/chatroomid
              const id = chat.isGroup
                ? (chat.groupid || chat.id)
                : (chat.id || chat.chatroomid);
              const isActive = String(id) === String(selectedChatId);

              // Try to infer fields but keep fallbacks
              const name =
                chat.name ||
                chat.title ||
                chat.otherUsername ||
                chat.groupname ||
                'Chat';

              const lastMessage = chat.lastMessage || chat.preview || '';

              const time = chat.lastMessageTime || chat.time || '';

              const unread = chat.unread || chat.unreadCount || 0;

              return (
                <button
                  key={id}
                  className={`wa-chat-list-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedChatId(id);
                    setIsCreatingGroup(false); // if you were creating a group, exit
                  }}
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
                      <span className="wa-chat-name">
                        {name}
                        {chat.isGroup && (
                          <span className="wa-chat-group-label">
                            &nbsp;• Group
                          </span>
                        )}
                      </span>
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

      {/* RIGHT PANEL – CURRENT CHAT OR GROUP CREATION OR LOOP EMPTY STATE */}
      <main className="wa-chat-main">
        {error && (
          <div className="wa-error-banner" style={{ margin: 8 }}>
            {error}
          </div>
        )}

        {isCreatingGroup ? (
          <div className="wa-chat-empty wa-group-create">
            <h2>Create a new group</h2>

            <div className="wa-group-field">
              <label className="wa-label">Group name</label>
              <input
                className="wa-chat-input"
                placeholder="My awesome group"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            <div className="wa-group-field">
              <label className="wa-label">Add members</label>
              <form
                className="wa-header-search-form"
                onSubmit={handleGroupUserSearchSubmit}
              >
                <input
                  className="wa-header-search-input"
                  placeholder="Search username"
                  value={groupSearchTerm}
                  onChange={(e) => {
                    setGroupSearchTerm(e.target.value);
                    setGroupSearchError('');
                    setGroupSearchResults([]);
                  }}
                />
              </form>

            {/* Selected members chips */}
            <div className="wa-group-members-chips">
              {groupMembers.map((user) => (
                <button
                  key={user.userid || user.id || user.username}
                  type="button"
                  className="wa-chip"
                  onClick={() => toggleAddGroupMember(user)}
                >
                  {user.username}
                  <span className="wa-chip-remove">×</span>
                </button>
              ))}
              {groupMembers.length === 0 && (
                <span className="small-text">No members added yet.</span>
              )}
            </div>

            {/* Search results for adding members */}
            <div className="wa-user-search-results">
              {groupSearchLoading && (
                <div className="wa-user-search-row small-text">
                  Searching…
                </div>
              )}

              {groupSearchError && !groupSearchLoading && (
                <div className="wa-user-search-row error-text">
                  {groupSearchError}
                </div>
              )}

              {!groupSearchLoading &&
                groupSearchResults.map((user) => {
                  const key = user.userid || user.id || user.username;
                  const alreadyAdded = groupMembers.some(
                    (u) =>
                      (u.userid || u.id || u.username) === key
                  );
                  if (alreadyAdded) return null;

                  return (
                    <button
                      key={key}
                      type="button"
                      className="wa-user-search-row"
                      onClick={() => toggleAddGroupMember(user)}
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
                  );
                })}
            </div>
          </div>

          <div className="wa-group-actions">
            <button
              type="button"
              className="wa-logout-button"
              onClick={() => setIsCreatingGroup(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="wa-send-button"
              disabled={!groupName.trim() || groupMembers.length === 0}
              onClick={handleCreateGroup}
            >
              Create group
            </button>
          </div>
        </div>
        ) : selectedChat ? (
          <>
            <header className="wa-chat-main-header">
              <div className="wa-chat-header-left">
                <div className="wa-avatar-circle small">
                  <span className="wa-avatar-initial">
                    {(
                      selectedChat.name ||
                      selectedChat.title ||
                      selectedChat.otherUsername ||
                      selectedChat.groupname ||
                      'C'
                    )[0].toUpperCase()}
                  </span>
                </div>
                <div className="wa-chat-header-text">
                  <div className="wa-chat-header-name">
                    {selectedChat.name ||
                      selectedChat.title ||
                      selectedChat.otherUsername ||
                      selectedChat.groupname ||
                      'Chat'}
                  </div>
                  <div className="wa-chat-header-status">
                    {selectedChat.isGroup ? 'Group chat' : 'Online'}
                  </div>
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
                    {/* Show sender name for incoming 1:1 messages */}
                    {!selectedChat.isGroup && !msg.fromMe && (
                      <div className="wa-message-sender small-text">
                        {selectedChat.name}
                      </div>
                    )}
                    {/* For groups, show sender name for incoming messages */}
                    {selectedChat?.isGroup &&
                      !msg.fromMe &&
                      msg.senderName && (
                        <div className="wa-message-sender small-text">
                          {msg.senderName}
                        </div>
                      )}

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
              Select a chat on the left, start a new 1:1 chat from the search
              box, or create a new group.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
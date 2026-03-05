// src/components/Chat.jsx
import React, { useState, useEffect, useRef } from "react";
import { socket } from "../utils/socket";
import { Send } from "lucide-react";
import "./Chat.css";

// FIX #3: Store messages outside the component so they survive panel close/reopen
// Keyed by roomId so different rooms don't share history
const persistedMessages = {};

function Chat({ roomId, username, users, onClose }) {
  const [messages, setMessages] = useState(
    () => persistedMessages[roomId] || [],
  );
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleChatMessage = (data) => {
      setMessages((prev) => {
        const next = [...prev, data];
        // Persist so messages survive panel close/reopen and code runs
        persistedMessages[roomId] = next;
        return next;
      });
    };
    socket.on("chat-message", handleChatMessage);
    return () => socket.off("chat-message", handleChatMessage);
  }, [roomId]);

  // FIX #3: Load chat history when joining a room that already has messages
  useEffect(() => {
    const handler = (e) => {
      if (e.detail.roomId === roomId && e.detail.messages?.length > 0) {
        setMessages(e.detail.messages);
        persistedMessages[roomId] = e.detail.messages;
      }
    };
    window.addEventListener("chat-history", handler);
    return () => window.removeEventListener("chat-history", handler);
  }, [roomId]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      socket.emit("chat-message", {
        roomId,
        message: inputMessage.trim(),
        username,
      });
      setInputMessage("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const formatTime = (timestamp) =>
    new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const isOwn = (msg) => msg.username === username;

  return (
    <div className="chat-sidebar">
      {/* ── Users ── */}
      <div className="users-list">
        <h4>Active Users ({users.length})</h4>
        <div className="users">
          {users.map((user) => (
            <div key={user.socketId} className="user-item">
              <div
                className="user-avatar"
                style={{ background: user.color || "#667eea" }}
              >
                {user.username[0].toUpperCase()}
              </div>
              <span>{user.username}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <p>No messages yet. Say hi! 👋</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const own = isOwn(msg);
            const prevMsg = messages[index - 1];
            const isNewSender = !prevMsg || prevMsg.username !== msg.username;

            return (
              <div
                key={index}
                className={`message ${own ? "own-message" : ""} ${isNewSender ? "new-sender" : ""}`}
              >
                {isNewSender && (
                  <div className="message-header">
                    <span
                      className="message-username"
                      style={{
                        color: own ? "#9b8fe8" : msg.color || "#667eea",
                      }}
                    >
                      {own ? "You" : msg.username}
                    </span>
                    <span className="message-time">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                )}
                <div className="message-content">{msg.message}</div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          placeholder="Type a message... (Enter to send)"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="chat-input"
        />
        <button
          type="submit"
          className="btn-send"
          title="Send"
          disabled={!inputMessage.trim()}
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}

export default Chat;

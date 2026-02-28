// src/pages/Home.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Code2, Users, Zap, Play, LogOut, Crown, Sparkles } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import AuthModal from "../components/AuthModal";
import "./Home.css";

function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState("login");
  const navigate = useNavigate();
  const { user, isLoggedIn, isPremium, logout } = useAuth();

  // Pre-fill username if logged in
  const displayName = isLoggedIn ? user.username : username;

  const generateRoomId = () => {
    const id = Math.random().toString(36).substring(2, 9).toUpperCase();
    setRoomId(id);
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    const name = isLoggedIn ? user.username : username;
    if (roomId.trim() && name.trim()) {
      navigate(`/room/${roomId}`, { state: { username: name } });
    }
  };

  function openLogin() {
    setAuthTab("login");
    setShowAuthModal(true);
  }

  function openRegister() {
    setAuthTab("register");
    setShowAuthModal(true);
  }

  return (
    <div className="home-container">
      <div className="animated-bg">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
      </div>

      <div className="home-content">
        {/* Top auth bar */}
        <div className="home-auth-bar">
          {isLoggedIn ? (
            <div className="home-user-info">
              <div className="home-user-avatar">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="home-user-details">
                <span className="home-user-name">{user.username}</span>
                {isPremium ? (
                  <span className="home-badge premium">
                    <Crown size={10} /> Pro
                  </span>
                ) : (
                  <span className="home-badge free">Free</span>
                )}
              </div>
              <button
                className="home-logout-btn"
                onClick={logout}
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="home-auth-buttons">
              <button className="home-signin-btn" onClick={openLogin}>
                Sign In
              </button>
              <button className="home-register-btn" onClick={openRegister}>
                <Sparkles size={14} />
                Register Free
              </button>
            </div>
          )}
        </div>

        <div className="header">
          <div className="logo-wrapper">
            <Code2 size={52} className="logo-icon" />
          </div>
          <h1 className="title">CodeTogether</h1>
          <p className="subtitle">Collaborate. Code. Create.</p>
        </div>

        <form onSubmit={handleJoinRoom} className="join-form">
          {/* Show name input only if not logged in */}
          {!isLoggedIn ? (
            <div className="input-wrapper">
              <input
                type="text"
                placeholder="Enter your name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                required
              />
            </div>
          ) : (
            <div className="home-logged-name">
              <div className="home-user-avatar small">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span>
                Joining as <strong>{user.username}</strong>
              </span>
            </div>
          )}

          <div className="room-group">
            <input
              type="text"
              placeholder="Room Code"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              className="input-field room-input"
              maxLength={7}
              required
            />
            <button
              type="button"
              onClick={generateRoomId}
              className="btn-generate"
            >
              Generate
            </button>
          </div>

          <button type="submit" className="btn-join">
            <span>Join Room</span>
            <Play size={18} />
          </button>
        </form>

        {/* Upgrade nudge for free/guest users */}
        {!isPremium && (
          <div className="home-upgrade-nudge" onClick={openRegister}>
            <Sparkles size={14} />
            <span>
              {isLoggedIn
                ? "Upgrade to Pro — unlock unlimited AI, Interview Mode & more →"
                : "Sign up free — unlock AI Assistant, Interview Mode & Version History →"}
            </span>
          </div>
        )}

        <div className="features">
          <div className="feature">
            <div className="feature-icon-wrapper">
              <Users size={24} />
            </div>
            <span>Real-time Collaboration</span>
          </div>
          <div className="feature">
            <div className="feature-icon-wrapper">
              <Code2 size={24} />
            </div>
            <span>15+ Languages</span>
          </div>
          <div className="feature">
            <div className="feature-icon-wrapper">
              <Zap size={24} />
            </div>
            <span>Instant Execution</span>
          </div>
        </div>
      </div>

      {showAuthModal && (
        <AuthModal
          defaultTab={authTab}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}

export default Home;

// src/pages/Home.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  LogOut,
  Crown,
  Sparkles,
  ArrowRight,
  Users,
  Zap,
  Code2,
  Shield,
  GitBranch,
  Cpu,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import AuthModal from "../components/AuthModal";
import PricingModal from "../components/PricingModal";
import "./Home.css";

const TYPING_WORDS = ["Together.", "Faster.", "Smarter.", "Live."];

function AnimatedOrb({ color, size, startX, startY, rangeX, rangeY, speed }) {
  const ref = useRef(null);
  const t = useRef(Math.random() * 100);

  useEffect(() => {
    let raf;
    const animate = () => {
      t.current += speed;
      const x =
        startX +
        Math.sin(t.current * 0.8) * rangeX +
        Math.cos(t.current * 0.5) * rangeX * 0.4;
      const y =
        startY +
        Math.cos(t.current * 0.6) * rangeY +
        Math.sin(t.current * 0.9) * rangeY * 0.3;
      if (ref.current) {
        ref.current.style.transform = `translate(${x}px, ${y}px)`;
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        filter: "blur(80px)",
        pointerEvents: "none",
        zIndex: 0,
        top: 0,
        left: 0,
        willChange: "transform",
      }}
    />
  );
}

function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState("login");
  const [typingIndex, setTypingIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const navigate = useNavigate();
  const { user, isLoggedIn, isPremium, logout } = useAuth();

  useEffect(() => {
    const word = TYPING_WORDS[typingIndex];
    let timeout;
    if (!isDeleting && displayed.length < word.length) {
      timeout = setTimeout(
        () => setDisplayed(word.slice(0, displayed.length + 1)),
        90,
      );
    } else if (!isDeleting && displayed.length === word.length) {
      timeout = setTimeout(() => setIsDeleting(true), 1800);
    } else if (isDeleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 45);
    } else if (isDeleting && displayed.length === 0) {
      setIsDeleting(false);
      setTypingIndex((i) => (i + 1) % TYPING_WORDS.length);
    }
    return () => clearTimeout(timeout);
  }, [displayed, isDeleting, typingIndex]);

  const generateRoomId = () =>
    setRoomId(Math.random().toString(36).substring(2, 9).toUpperCase());

  const handleJoinRoom = (e) => {
    e.preventDefault();
    const name = isLoggedIn ? user.username : username;
    if (roomId.trim() && name.trim()) {
      navigate(`/room/${roomId}`, { state: { username: name } });
    }
  };

  return (
    <div className="home-root">
      <div className="home-mesh" />
      <div className="home-grid" />

      <AnimatedOrb
        color="radial-gradient(circle, rgba(99,102,241,0.55) 0%, transparent 70%)"
        size="520px"
        startX={-100}
        startY={-80}
        rangeX={120}
        rangeY={100}
        speed={0.008}
      />
      <AnimatedOrb
        color="radial-gradient(circle, rgba(52,211,153,0.45) 0%, transparent 70%)"
        size="460px"
        startX={window.innerWidth - 400}
        startY={window.innerHeight - 350}
        rangeX={110}
        rangeY={90}
        speed={0.006}
      />
      <AnimatedOrb
        color="radial-gradient(circle, rgba(167,139,250,0.4) 0%, transparent 70%)"
        size="400px"
        startX={window.innerWidth * 0.6}
        startY={window.innerHeight * 0.15}
        rangeX={130}
        rangeY={110}
        speed={0.007}
      />
      <AnimatedOrb
        color="radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)"
        size="600px"
        startX={window.innerWidth * 0.2}
        startY={window.innerHeight * 0.3}
        rangeX={80}
        rangeY={140}
        speed={0.004}
      />

      {/* Nav */}
      <nav className="home-nav">
        <div className="home-nav-logo">
          <div className="nav-logo-icon">
            <Code2 size={18} />
          </div>
          <span>CodeTogether</span>
        </div>
        <div className="home-nav-right">
          {isLoggedIn ? (
            <div className="nav-user">
              <div className="nav-avatar">{user.username[0].toUpperCase()}</div>
              <span className="nav-username">{user.username}</span>
              {isPremium ? (
                <span className="nav-pro-badge">
                  <Crown size={10} /> Pro
                </span>
              ) : (
                <button
                  className="nav-upgrade-btn"
                  onClick={() => setShowPricing(true)}
                >
                  <Crown size={12} /> Upgrade
                </button>
              )}
              <button className="nav-logout" onClick={logout}>
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="nav-auth-btns">
              <button
                className="nav-signin"
                onClick={() => {
                  setAuthTab("login");
                  setShowAuthModal(true);
                }}
              >
                Sign in
              </button>
              <button
                className="nav-register"
                onClick={() => {
                  setAuthTab("register");
                  setShowAuthModal(true);
                }}
              >
                Get started free <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="home-hero">
        <div className="hero-badge">
          <Sparkles size={12} />
          <span>AI-powered collaborative coding</span>
        </div>

        <h1 className="hero-title">
          Code <span className="hero-gradient">Together</span>
          <br />
          Ship{" "}
          <span className="hero-typewriter">
            {displayed}
            <span className="hero-cursor">|</span>
          </span>
        </h1>

        <p className="hero-sub">
          Real-time collaboration, AI assistance, interview prep — everything
          your team needs in one editor.
        </p>

        <div className="join-card">
          <div className="join-card-inner">
            <p className="join-card-label">Start or join a room</p>

            {!isLoggedIn ? (
              <input
                className="join-input"
                type="text"
                placeholder="Your name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            ) : (
              <div className="join-logged-name">
                <div className="join-avatar">
                  {user.username[0].toUpperCase()}
                </div>
                <span>
                  Joining as <strong>{user.username}</strong>
                </span>
                {isPremium && (
                  <span className="join-pro">
                    <Crown size={11} /> Pro
                  </span>
                )}
              </div>
            )}

            <div className="join-row">
              <input
                className="join-input room-input"
                type="text"
                placeholder="Room code"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                maxLength={7}
              />
              <button className="join-generate" onClick={generateRoomId}>
                Generate
              </button>
            </div>

            <button
              className="join-btn"
              onClick={handleJoinRoom}
              disabled={!roomId.trim() || (!isLoggedIn && !username.trim())}
            >
              <Play size={16} /> Join Room
            </button>

            {!isPremium && (
              <button
                className="join-upgrade-nudge"
                onClick={() => {
                  if (isLoggedIn) setShowPricing(true);
                  else {
                    setAuthTab("register");
                    setShowAuthModal(true);
                  }
                }}
              >
                <Sparkles size={12} />
                {isLoggedIn
                  ? "Upgrade to Pro — unlock unlimited AI & more"
                  : "Sign up free — unlock AI, interviews & more"}
                <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="feature-pills">
          {[
            { icon: <Users size={14} />, text: "Real-time collab" },
            { icon: <Cpu size={14} />, text: "AI Assistant" },
            { icon: <Shield size={14} />, text: "Interview Mode" },
            { icon: <GitBranch size={14} />, text: "Version History" },
            { icon: <Zap size={14} />, text: "10+ Languages" },
          ].map((f, i) => (
            <div className="pill" key={i}>
              {f.icon}
              <span>{f.text}</span>
            </div>
          ))}
        </div>

        <div className="home-stats">
          {[
            { value: "10+", label: "Languages" },
            { value: "∞", label: "Collaborators", infinity: true },
            { value: "<100ms", label: "Sync latency" },
          ].map((s, i) => (
            <div className="stat" key={i}>
              <span
                className={`stat-value${s.infinity ? " stat-infinity" : ""}`}
              >
                {s.value}
              </span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </main>

      {showAuthModal && (
        <AuthModal
          defaultTab={authTab}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
    </div>
  );
}

export default Home;

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Code2, Users, Zap, Play } from "lucide-react";
import "./Home.css";

function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const generateRoomId = () => {
    const id = Math.random().toString(36).substring(2, 9).toUpperCase();
    setRoomId(id);
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomId.trim() && username.trim()) {
      navigate(`/room/${roomId}`, { state: { username } });
    }
  };

  return (
    <div className="home-container">
      <div className="animated-bg">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
      </div>

      <div className="home-content">
        <div className="header">
          <div className="logo-wrapper">
            <Code2 size={52} className="logo-icon" />
          </div>
          <h1 className="title">CodeTogether</h1>
          <p className="subtitle">Collaborate. Code. Create.</p>
        </div>

        <form onSubmit={handleJoinRoom} className="join-form">
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
    </div>
  );
}

export default Home;

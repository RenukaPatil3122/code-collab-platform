// src/components/whiteboard/Whiteboard.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  Pen,
  Square,
  Circle,
  Minus,
  Trash2,
  Download,
  Eraser,
  Undo2,
} from "lucide-react";
import { socket } from "../../utils/socket";
import "./Whiteboard.css";

const COLORS = [
  "#ffffff",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#000000",
];
const SIZES = [2, 4, 8, 16];

function Whiteboard({ roomId, username, onClose }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#ffffff");
  const [size, setSize] = useState(4);
  const snapshotRef = useRef(null);
  const startPosRef = useRef(null);
  const historyRef = useRef([]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Receive remote drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const handleRemoteDraw = ({ drawData }) => {
      applyDraw(ctx, drawData);
    };
    const handleRemoteClear = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    const handleBoardState = ({ imageData }) => {
      if (!imageData) return;
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = imageData;
    };

    socket.on("whiteboard-draw", handleRemoteDraw);
    socket.on("whiteboard-clear", handleRemoteClear);
    socket.on("whiteboard-state", handleBoardState);
    socket.emit("whiteboard-join", { roomId });

    return () => {
      socket.off("whiteboard-draw", handleRemoteDraw);
      socket.off("whiteboard-clear", handleRemoteClear);
      socket.off("whiteboard-state", handleBoardState);
    };
  }, [roomId]);

  const applyDraw = (ctx, data) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = data.size;

    if (data.tool === "eraser") {
      // True erase — cuts transparent hole in the canvas pixels
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.beginPath();
      ctx.moveTo(data.x0, data.y0);
      ctx.lineTo(data.x1, data.y1);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over"; // always reset
      return;
    }

    // All other tools use normal composite
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = data.color;

    if (data.tool === "pen") {
      ctx.beginPath();
      ctx.moveTo(data.x0, data.y0);
      ctx.lineTo(data.x1, data.y1);
      ctx.stroke();
    } else if (data.tool === "rect") {
      if (!data.snapshot) return;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(img, 0, 0);
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.size;
        ctx.strokeRect(data.x0, data.y0, data.x1 - data.x0, data.y1 - data.y0);
      };
      img.src = data.snapshot;
    } else if (data.tool === "circle") {
      if (!data.snapshot) return;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(img, 0, 0);
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.size;
        ctx.beginPath();
        const rx = (data.x1 - data.x0) / 2;
        const ry = (data.y1 - data.y0) / 2;
        ctx.ellipse(
          data.x0 + rx,
          data.y0 + ry,
          Math.abs(rx),
          Math.abs(ry),
          0,
          0,
          2 * Math.PI,
        );
        ctx.stroke();
      };
      img.src = data.snapshot;
    } else if (data.tool === "line") {
      if (!data.snapshot) return;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(img, 0, 0);
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.size;
        ctx.beginPath();
        ctx.moveTo(data.x0, data.y0);
        ctx.lineTo(data.x1, data.y1);
        ctx.stroke();
      };
      img.src = data.snapshot;
    }
  };

  const emitDraw = useCallback(
    (drawData) => socket.emit("whiteboard-draw", { roomId, drawData }),
    [roomId],
  );

  const handleMouseDown = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const pos = getPos(e, canvas);
    isDrawing.current = true;
    lastPos.current = pos;
    startPosRef.current = pos;

    historyRef.current.push(canvas.toDataURL());
    if (historyRef.current.length > 40) historyRef.current.shift();

    if (["rect", "circle", "line"].includes(tool)) {
      snapshotRef.current = canvas.toDataURL();
    }
  };

  const handleMouseMove = (e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);

    if (tool === "pen" || tool === "eraser") {
      const drawData = {
        tool,
        color,
        size: tool === "eraser" ? size * 3 : size, // eraser is wider
        x0: lastPos.current.x,
        y0: lastPos.current.y,
        x1: pos.x,
        y1: pos.y,
      };
      applyDraw(ctx, drawData);
      emitDraw(drawData);
      lastPos.current = pos;
    } else {
      const drawData = {
        tool,
        color,
        size,
        x0: startPosRef.current.x,
        y0: startPosRef.current.y,
        x1: pos.x,
        y1: pos.y,
        snapshot: snapshotRef.current,
      };
      applyDraw(ctx, drawData);
    }
  };

  const handleMouseUp = (e) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    const pos = getPos(e, canvas);

    if (["rect", "circle", "line"].includes(tool)) {
      const drawData = {
        tool,
        color,
        size,
        x0: startPosRef.current.x,
        y0: startPosRef.current.y,
        x1: pos.x,
        y1: pos.y,
        snapshot: snapshotRef.current,
      };
      emitDraw(drawData);
    }

    socket.emit("whiteboard-sync", { roomId, imageData: canvas.toDataURL() });
    snapshotRef.current = null;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    historyRef.current = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit("whiteboard-clear", { roomId });
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current.pop();
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      socket.emit("whiteboard-sync", { roomId, imageData: canvas.toDataURL() });
    };
    img.src = prev;
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    // Composite onto a solid background for the download
    const offscreen = document.createElement("canvas");
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const octx = offscreen.getContext("2d");
    octx.fillStyle = "#13131f";
    octx.fillRect(0, 0, offscreen.width, offscreen.height);
    octx.drawImage(canvas, 0, 0);
    const a = document.createElement("a");
    a.download = `whiteboard-${roomId}-${Date.now()}.png`;
    a.href = offscreen.toDataURL();
    a.click();
  };

  const tools = [
    { id: "pen", icon: <Pen size={16} />, label: "Pen" },
    { id: "eraser", icon: <Eraser size={16} />, label: "Eraser" },
    { id: "line", icon: <Minus size={16} />, label: "Line" },
    { id: "rect", icon: <Square size={16} />, label: "Rectangle" },
    { id: "circle", icon: <Circle size={16} />, label: "Circle" },
  ];

  return (
    <div
      className="wb-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="wb-modal">
        <div className="wb-header">
          <div className="wb-title">
            <Pen size={18} />
            <span>Whiteboard</span>
            <span className="wb-badge">Live</span>
          </div>
          <div className="wb-header-actions">
            <button className="wb-icon-btn" onClick={handleUndo} title="Undo">
              <Undo2 size={16} />
            </button>
            <button
              className="wb-icon-btn"
              onClick={handleDownload}
              title="Download"
            >
              <Download size={16} />
            </button>
            <button
              className="wb-icon-btn wb-icon-btn-danger"
              onClick={handleClear}
              title="Clear"
            >
              <Trash2 size={16} />
            </button>
            <button className="wb-icon-btn" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="wb-body">
          <div className="wb-toolbar">
            <div className="wb-tool-group">
              {tools.map((t) => (
                <button
                  key={t.id}
                  className={`wb-tool-btn ${tool === t.id ? "active" : ""}`}
                  onClick={() => setTool(t.id)}
                  title={t.label}
                >
                  {t.icon}
                </button>
              ))}
            </div>

            <div className="wb-divider" />

            <div className="wb-tool-group">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`wb-color-btn ${color === c ? "active" : ""}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  title={c}
                />
              ))}
            </div>

            <div className="wb-divider" />

            <div className="wb-tool-group">
              {SIZES.map((s) => (
                <button
                  key={s}
                  className={`wb-size-btn ${size === s ? "active" : ""}`}
                  onClick={() => setSize(s)}
                  title={`${s}px`}
                >
                  <div
                    className="wb-size-dot"
                    style={{ width: s + 4, height: s + 4 }}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="wb-canvas-wrapper">
            <canvas
              ref={canvasRef}
              width={1200}
              height={700}
              className="wb-canvas"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Whiteboard;

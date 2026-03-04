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

  // Refs so touch listeners (registered once) always read latest state
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const sizeRef = useRef(size);
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  useEffect(() => {
    colorRef.current = color;
  }, [color]);
  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  const getPos = (e, canvas) => {
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches && e.touches.length > 0)
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    if (e.changedTouches && e.changedTouches.length > 0)
      return {
        x: (e.changedTouches[0].clientX - rect.left) * scaleX,
        y: (e.changedTouches[0].clientY - rect.top) * scaleY,
      };
    return {
      x: ((e.clientX ?? 0) - rect.left) * scaleX,
      y: ((e.clientY ?? 0) - rect.top) * scaleY,
    };
  };

  const applyDraw = useCallback((ctx, data) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = data.size;
    if (data.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.beginPath();
      ctx.moveTo(data.x0, data.y0);
      ctx.lineTo(data.x1, data.y1);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      return;
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = data.color;
    if (data.tool === "pen") {
      ctx.beginPath();
      ctx.moveTo(data.x0, data.y0);
      ctx.lineTo(data.x1, data.y1);
      ctx.stroke();
    } else if (["rect", "circle", "line"].includes(data.tool)) {
      if (!data.snapshot) return;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(img, 0, 0);
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.size;
        if (data.tool === "rect") {
          ctx.strokeRect(
            data.x0,
            data.y0,
            data.x1 - data.x0,
            data.y1 - data.y0,
          );
        } else if (data.tool === "circle") {
          const rx = (data.x1 - data.x0) / 2,
            ry = (data.y1 - data.y0) / 2;
          ctx.beginPath();
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
        } else {
          ctx.beginPath();
          ctx.moveTo(data.x0, data.y0);
          ctx.lineTo(data.x1, data.y1);
          ctx.stroke();
        }
      };
      img.src = data.snapshot;
    }
  }, []);

  const emitDraw = useCallback(
    (drawData) => socket.emit("whiteboard-draw", { roomId, drawData }),
    [roomId],
  );

  // Remote events
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const handleRemoteDraw = ({ drawData }) => applyDraw(ctx, drawData);
    const handleRemoteClear = () =>
      ctx.clearRect(0, 0, canvas.width, canvas.height);
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
  }, [roomId, applyDraw]);

  // ── KEY FIX: Touch listeners registered with { passive: false }
  // React synthetic onTouch* props are passive in React 17+ and cannot call preventDefault()
  // which causes "Unable to preventDefault inside passive event listener" console spam.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      const pos = getPos(e, canvas);
      isDrawing.current = true;
      lastPos.current = pos;
      startPosRef.current = pos;
      historyRef.current.push(canvas.toDataURL());
      if (historyRef.current.length > 40) historyRef.current.shift();
      if (["rect", "circle", "line"].includes(toolRef.current))
        snapshotRef.current = canvas.toDataURL();
    };

    const onTouchMove = (e) => {
      e.preventDefault();
      if (!isDrawing.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const pos = getPos(e, canvas);
      const t = toolRef.current,
        c = colorRef.current,
        s = sizeRef.current;
      if (t === "pen" || t === "eraser") {
        if (!lastPos.current) {
          lastPos.current = pos;
          return;
        }
        const drawData = {
          tool: t,
          color: c,
          size: t === "eraser" ? s * 3 : s,
          x0: lastPos.current.x,
          y0: lastPos.current.y,
          x1: pos.x,
          y1: pos.y,
        };
        applyDraw(ctx, drawData);
        emitDraw(drawData);
        lastPos.current = pos;
      } else {
        if (!startPosRef.current) return;
        applyDraw(ctx, {
          tool: t,
          color: c,
          size: s,
          x0: startPosRef.current.x,
          y0: startPosRef.current.y,
          x1: pos.x,
          y1: pos.y,
          snapshot: snapshotRef.current,
        });
      }
    };

    const onTouchEnd = (e) => {
      e.preventDefault();
      if (!isDrawing.current) return;
      isDrawing.current = false;
      const canvas = canvasRef.current;
      const pos = getPos(e, canvas) || lastPos.current;
      const t = toolRef.current,
        c = colorRef.current,
        s = sizeRef.current;
      if (
        pos &&
        ["rect", "circle", "line"].includes(t) &&
        startPosRef.current
      ) {
        emitDraw({
          tool: t,
          color: c,
          size: s,
          x0: startPosRef.current.x,
          y0: startPosRef.current.y,
          x1: pos.x,
          y1: pos.y,
          snapshot: snapshotRef.current,
        });
      }
      socket.emit("whiteboard-sync", { roomId, imageData: canvas.toDataURL() });
      snapshotRef.current = null;
      lastPos.current = null;
      startPosRef.current = null;
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [roomId, applyDraw, emitDraw]);

  // Mouse handlers (desktop)
  const handleMouseDown = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getPos(e, canvas);
    isDrawing.current = true;
    lastPos.current = pos;
    startPosRef.current = pos;
    historyRef.current.push(canvas.toDataURL());
    if (historyRef.current.length > 40) historyRef.current.shift();
    if (["rect", "circle", "line"].includes(tool))
      snapshotRef.current = canvas.toDataURL();
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    if (tool === "pen" || tool === "eraser") {
      if (!lastPos.current) {
        lastPos.current = pos;
        return;
      }
      const drawData = {
        tool,
        color,
        size: tool === "eraser" ? size * 3 : size,
        x0: lastPos.current.x,
        y0: lastPos.current.y,
        x1: pos.x,
        y1: pos.y,
      };
      applyDraw(ctx, drawData);
      emitDraw(drawData);
      lastPos.current = pos;
    } else {
      if (!startPosRef.current) return;
      applyDraw(ctx, {
        tool,
        color,
        size,
        x0: startPosRef.current.x,
        y0: startPosRef.current.y,
        x1: pos.x,
        y1: pos.y,
        snapshot: snapshotRef.current,
      });
    }
  };

  const finishDrawing = useCallback(
    (e) => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const pos = e ? getPos(e, canvas) : lastPos.current;
      if (
        pos &&
        ["rect", "circle", "line"].includes(tool) &&
        startPosRef.current
      ) {
        emitDraw({
          tool,
          color,
          size,
          x0: startPosRef.current.x,
          y0: startPosRef.current.y,
          x1: pos.x,
          y1: pos.y,
          snapshot: snapshotRef.current,
        });
      }
      socket.emit("whiteboard-sync", { roomId, imageData: canvas.toDataURL() });
      snapshotRef.current = null;
      lastPos.current = null;
      startPosRef.current = null;
    },
    [tool, color, size, roomId, emitDraw],
  );

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
    if (!historyRef.current.length) return;
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
    const off = document.createElement("canvas");
    off.width = canvas.width;
    off.height = canvas.height;
    const oc = off.getContext("2d");
    const isDark =
      document.querySelector(".room-container")?.getAttribute("data-theme") !==
      "light";
    oc.fillStyle = isDark ? "#13131f" : "#ffffff";
    oc.fillRect(0, 0, off.width, off.height);
    oc.drawImage(canvas, 0, 0);
    const a = document.createElement("a");
    a.download = `whiteboard-${roomId}-${Date.now()}.png`;
    a.href = off.toDataURL();
    a.click();
  };

  const toolList = [
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
              {toolList.map((t) => (
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
            {/* Touch events registered via useEffect with { passive: false } — NOT as React props */}
            <canvas
              ref={canvasRef}
              width={1200}
              height={700}
              className="wb-canvas"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={finishDrawing}
              onMouseLeave={finishDrawing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Whiteboard;

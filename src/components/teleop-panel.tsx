"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTeleop, TeleopState } from "@/hooks/use-teleop";
import { useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Joystick } from "./joystick";

const MAX_LINEAR_SPEED = 0.5; // m/s
const MAX_ANGULAR_SPEED = 0.5; // rad/s
const COMMAND_RATE_MS = 100; // 10 Hz
const VIDEO_STALE_MS = 500; // 500ms without a new frame = stale
const RTT_THRESHOLD_MS = 200; // must match backend SafetyValidator

export function TeleopPanel({ identity }: { identity: string }) {
  const { state, requestControl, releaseControl, acceptTransfer, denyTransfer, sendCommand } =
    useTeleop(identity);
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: true });

  const joystickRef = useRef({ x: 0, y: 0 });
  const hasControlRef = useRef(state.hasControl);
  hasControlRef.current = state.hasControl;

  const [velocity, setVelocity] = useState({ linear: 0, angular: 0 });

  // --- Video staleness tracking via requestVideoFrameCallback ---
  // Use state (not ref) for the video element so assignment triggers a re-render
  // and the effect below re-runs. A ref would silently update without re-running.
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const [videoFresh, setVideoFresh] = useState(false);

  // Register requestVideoFrameCallback when we get a video element
  useEffect(() => {
    if (!videoEl || !("requestVideoFrameCallback" in videoEl)) return;

    let handle: number;
    const onFrame = () => {
      lastFrameTimeRef.current = Date.now();
      handle = (videoEl as any).requestVideoFrameCallback(onFrame);
    };
    handle = (videoEl as any).requestVideoFrameCallback(onFrame);
    return () => (videoEl as any).cancelVideoFrameCallback(handle);
  }, [videoEl]);

  // Poll staleness at 100ms intervals
  useEffect(() => {
    const id = setInterval(() => {
      const fresh = lastFrameTimeRef.current > 0
        && (Date.now() - lastFrameTimeRef.current) < VIDEO_STALE_MS;
      setVideoFresh(fresh);
    }, 100);
    return () => clearInterval(id);
  }, []);

  // --- Safety block reason ---
  const hasVideo = tracks.length > 0;
  const safetyBlockReason: string | null = !hasVideo
    ? "No video stream available"
    : !videoFresh
    ? "Video stream is stale"
    : state.rttMs !== null && state.rttMs > RTT_THRESHOLD_MS
    ? `Latency too high (${state.rttMs.toFixed(0)}ms > ${RTT_THRESHOLD_MS}ms)`
    : null;

  const controlsBlocked = safetyBlockReason !== null;
  const safetyBlockRef = useRef(controlsBlocked);
  safetyBlockRef.current = controlsBlocked;

  // Send commands at fixed rate while joystick is displaced
  useEffect(() => {
    if (!state.hasControl) return;
    const interval = setInterval(() => {
      if (safetyBlockRef.current) return;
      const { x, y } = joystickRef.current;
      if (x === 0 && y === 0) return;
      sendCommand(-y * MAX_LINEAR_SPEED, 0, -x * MAX_ANGULAR_SPEED);
    }, COMMAND_RATE_MS);
    return () => clearInterval(interval);
  }, [state.hasControl, sendCommand]);

  const handleJoystickChange = useCallback((x: number, y: number) => {
    joystickRef.current = { x, y };
    setVelocity({ linear: -y * MAX_LINEAR_SPEED, angular: -x * MAX_ANGULAR_SPEED });
  }, []);

  const handleJoystickRelease = useCallback(() => {
    joystickRef.current = { x: 0, y: 0 };
    setVelocity({ linear: 0, angular: 0 });
    if (hasControlRef.current) sendCommand(0, 0, 0);
  }, [sendCommand]);

  // Keyboard WASD fallback
  useEffect(() => {
    const keys = { w: false, a: false, s: false, d: false };
    const emit = () => {
      const lin = (keys.w ? MAX_LINEAR_SPEED : 0) + (keys.s ? -MAX_LINEAR_SPEED : 0);
      const ang = (keys.a ? MAX_ANGULAR_SPEED : 0) + (keys.d ? -MAX_ANGULAR_SPEED : 0);
      setVelocity({ linear: lin, angular: ang });
      sendCommand(lin, 0, ang);
    };
    const down = (e: KeyboardEvent) => {
      if (!hasControlRef.current || safetyBlockRef.current) return;
      const k = e.key.toLowerCase();
      if (k === " ") { e.preventDefault(); sendCommand(0, 0, 0); setVelocity({ linear: 0, angular: 0 }); return; }
      if (k in keys) { e.preventDefault(); keys[k as keyof typeof keys] = true; emit(); }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k in keys) { e.preventDefault(); keys[k as keyof typeof keys] = false; emit(); }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [sendCommand]);

  return (
    <div className="flex flex-col h-full" style={{ background: "#eef2f7" }}>
      {/* Transfer request modal (full-screen overlay) */}
      {state.pendingTransfer && (
        <TransferRequestModal
          requester={state.pendingTransfer.requesterIdentity}
          timeoutSeconds={state.pendingTransfer.timeoutSeconds}
          receivedAt={state.pendingTransfer.receivedAt}
          onAccept={acceptTransfer}
          onDeny={denyTransfer}
        />
      )}

      {/* Header */}
      <header
        className="flex items-center justify-between px-5 py-3"
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ width: 32, height: 32, background: "#3b82f6" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L2 5v6l6 4 6-4V5L8 1z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
              <circle cx="8" cy="8" r="2" fill="#fff"/>
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight" style={{ color: "#1e293b" }}>
              Teleop Control
            </h1>
            <p className="text-xs" style={{ color: "#94a3b8" }}>{identity}</p>
          </div>
        </div>
        <StatusPill
          color={state.connected ? "green" : "red"}
          label={state.connected ? "Connected" : "Disconnected"}
        />
      </header>

      {/* Main */}
      <div className="flex flex-1 min-h-0 gap-3 p-3">
        {/* Video */}
        <div
          className="flex-1 relative rounded-xl overflow-hidden"
          style={{
            background: "#e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)",
          }}
        >
          {tracks.length > 0 ? (
            <video
              ref={(el) => {
                setVideoEl(el);
                if (el && tracks[0]?.publication?.track) {
                  tracks[0].publication.track.attach(el);
                }
              }}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="4" y="8" width="32" height="24" rx="3" stroke="#94a3b8" strokeWidth="1.5" fill="none"/>
                <circle cx="20" cy="20" r="6" stroke="#94a3b8" strokeWidth="1.5" fill="none"/>
                <circle cx="20" cy="20" r="2" fill="#94a3b8"/>
              </svg>
              <span style={{ color: "#94a3b8", fontSize: 13 }}>
                Waiting for robot video stream...
              </span>
            </div>
          )}
          <div className="absolute top-3 left-3">
            <StatusPill
              color={!hasVideo ? "neutral" : videoFresh ? "green" : "yellow"}
              label={!hasVideo ? "No Video" : videoFresh ? "Video OK" : "Video Stale"}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div
          className="w-[22rem] flex flex-col gap-3 p-4 rounded-xl"
          style={{
            background: "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.03)",
          }}
        >
          <h2 className="font-semibold text-center text-xs tracking-wide uppercase" style={{ color: "#94a3b8" }}>
            Control Panel
          </h2>

          {/* Control status */}
          <ControlStatus state={state} />

          {/* Awaiting transfer notification (shown to the requester) */}
          {state.awaitingTransfer && (
            <div
              className="p-3 rounded-xl"
              style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}
            >
              <div className="flex items-center gap-2">
                <svg className="animate-spin flex-shrink-0" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="#bfdbfe" strokeWidth="1.5" />
                  <path d="M7 1a6 6 0 0 1 6 6" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <p className="text-xs" style={{ color: "#1e40af" }}>
                  The current operator has been asked to yield control.
                  Waiting for their response...
                </p>
              </div>
            </div>
          )}

          {/* Control button */}
          {!state.hasControl ? (
            <button
              onClick={requestControl}
              disabled={!hasVideo || state.awaitingTransfer}
              className="w-full py-2.5 text-white rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: hasVideo && !state.awaitingTransfer
                  ? "linear-gradient(to bottom, #3b82f6, #2563eb)"
                  : "#94a3b8",
                boxShadow: hasVideo && !state.awaitingTransfer
                  ? "0 1px 2px rgba(37,99,235,0.3), 0 0 0 1px rgba(37,99,235,0.1)"
                  : "none",
              }}
            >
              {!hasVideo ? "Waiting for Video..." : state.awaitingTransfer ? "Transfer Pending..." : "Request Control"}
            </button>
          ) : (
            <button
              onClick={releaseControl}
              className="w-full py-2.5 text-white rounded-xl font-medium text-sm transition-all"
              style={{
                background: "linear-gradient(to bottom, #ef4444, #dc2626)",
                boxShadow: "0 1px 2px rgba(220,38,38,0.3), 0 0 0 1px rgba(220,38,38,0.1)",
              }}
            >
              Release Control
            </button>
          )}

          {/* RTT */}
          <RttIndicator rttMs={state.rttMs} />

          {/* Joystick area (only when controlling) */}
          {state.hasControl && (
            <div
              className="flex flex-col gap-2 p-3 rounded-xl"
              style={{ background: "#f8fafc", border: "1px solid #f1f5f9" }}
            >
              {controlsBlocked && (
                <div
                  className="flex items-center gap-2 p-2 rounded-lg"
                  style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                    <circle cx="7" cy="7" r="6" stroke="#ef4444" strokeWidth="1.5"/>
                    <line x1="7" y1="4" x2="7" y2="8" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="7" cy="10" r="0.75" fill="#ef4444"/>
                  </svg>
                  <p className="text-xs" style={{ color: "#991b1b" }}>
                    {safetyBlockReason}
                  </p>
                </div>
              )}
              <div className="flex gap-3 items-start">
                <Joystick
                  onChange={handleJoystickChange}
                  onRelease={handleJoystickRelease}
                  size={130}
                  disabled={controlsBlocked}
                />
                <VelocityDisplay linear={velocity.linear} angular={velocity.angular} />
              </div>
              <p className="text-center" style={{ fontSize: 10, color: "#94a3b8" }}>
                {controlsBlocked ? "Controls disabled — safety check failed" : "Drag joystick or use WASD keys · Space = stop"}
              </p>
            </div>
          )}

          {/* Connection info */}
          <div
            className="mt-auto flex gap-3 p-2.5 rounded-xl"
            style={{ background: "#f8fafc", border: "1px solid #f1f5f9" }}
          >
            <StatusPill
              color={state.connected ? "green" : "red"}
              label="LiveKit"
              small
            />
            <StatusPill
              color={!hasVideo ? "neutral" : videoFresh ? "green" : "yellow"}
              label="Camera"
              small
            />
          </div>
        </div>
      </div>

      {/* Error bar */}
      {state.lastError && (
        <div
          className="px-5 py-2.5 text-sm flex items-center gap-2"
          style={{
            background: "#fef2f2",
            borderTop: "1px solid #fecaca",
            color: "#991b1b",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="#ef4444" strokeWidth="1.5"/>
            <line x1="7" y1="4" x2="7" y2="8" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="7" cy="10" r="0.75" fill="#ef4444"/>
          </svg>
          {state.lastError}
        </div>
      )}
    </div>
  );
}

function ControlStatus({ state }: { state: TeleopState }) {
  const { hasControl, controllerIdentity, leaseExpiry } = state;

  if (hasControl) {
    return (
      <div
        className="p-3 rounded-xl"
        style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}
      >
        <div className="flex items-center justify-center gap-2">
          <div className="rounded-full" style={{ width: 8, height: 8, background: "#22c55e" }} />
          <p className="text-sm font-medium" style={{ color: "#166534" }}>
            You are controlling
          </p>
        </div>
        {leaseExpiry && <LeaseCountdown expiry={leaseExpiry} />}
      </div>
    );
  }

  return (
    <div
      className="p-3 rounded-xl"
      style={{ background: "#fffbeb", border: "1px solid #fde68a" }}
    >
      <p className="text-sm font-medium text-center" style={{ color: "#92400e" }}>
        View-Only Mode
      </p>
      {controllerIdentity && (
        <p className="text-xs text-center mt-1" style={{ color: "#a3a3a3" }}>
          Controlled by {controllerIdentity}
        </p>
      )}
    </div>
  );
}

function LeaseCountdown({ expiry }: { expiry: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const update = () => {
      const ms = new Date(expiry).getTime() - Date.now();
      if (ms <= 0) { setRemaining("Expired"); return; }
      const totalSec = Math.ceil(ms / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      setRemaining(`${min}:${sec.toString().padStart(2, "0")}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiry]);

  return (
    <p className="text-xs text-center mt-1.5" style={{ color: "#6b7280" }}>
      Lease: {remaining} remaining
    </p>
  );
}

function RttIndicator({ rttMs }: { rttMs: number | null }) {
  let color = "#94a3b8";
  let bg = "#f8fafc";
  let border = "#f1f5f9";
  let status = "";

  if (rttMs !== null) {
    if (rttMs < 100) {
      color = "#166534"; bg = "#f0fdf4"; border = "#dcfce7"; status = "OK";
    } else if (rttMs < 200) {
      color = "#854d0e"; bg = "#fffbeb"; border = "#fef3c7"; status = "Fair";
    } else {
      color = "#991b1b"; bg = "#fef2f2"; border = "#fecaca"; status = "High";
    }
  }

  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: bg, border: `1px solid ${border}` }}>
      <span className="text-xs" style={{ color: "#64748b" }}>Latency</span>
      <span className="font-mono text-sm font-semibold" style={{ color }}>
        {rttMs !== null ? `${rttMs.toFixed(0)} ms` : "—"}{" "}
        {status && <span className="text-xs font-normal opacity-75">{status}</span>}
      </span>
    </div>
  );
}

function VelocityDisplay({ linear, angular }: { linear: number; angular: number }) {
  const linActive = Math.abs(linear) > 0.01;
  const angActive = Math.abs(angular) > 0.01;
  return (
    <div
      className="flex flex-col gap-1.5 justify-center min-w-0 flex-1 p-2.5 rounded-xl"
      style={{ background: "#f8fafc", border: "1px solid #f1f5f9" }}
    >
      <p className="text-[10px] font-medium" style={{ color: "#94a3b8" }}>Velocity</p>
      <div className="flex items-baseline gap-1 whitespace-nowrap">
        <span className="text-[10px]" style={{ color: "#94a3b8" }}>Lin</span>
        <span
          className="font-mono text-xs font-semibold tabular-nums"
          style={{ color: linActive ? "#1d4ed8" : "#94a3b8" }}
        >
          {linear >= 0 ? "\u00a0" : ""}{linear.toFixed(2)}
        </span>
        <span className="text-[10px]" style={{ color: "#b0b8c4" }}>m/s</span>
      </div>
      <div className="flex items-baseline gap-1 whitespace-nowrap">
        <span className="text-[10px]" style={{ color: "#94a3b8" }}>Ang</span>
        <span
          className="font-mono text-xs font-semibold tabular-nums"
          style={{ color: angActive ? "#1d4ed8" : "#94a3b8" }}
        >
          {angular >= 0 ? "\u00a0" : ""}{angular.toFixed(2)}
        </span>
        <span className="text-[10px]" style={{ color: "#b0b8c4" }}>r/s</span>
      </div>
    </div>
  );
}

function TransferRequestModal({
  requester,
  timeoutSeconds,
  receivedAt,
  onAccept,
  onDeny,
}: {
  requester: string;
  timeoutSeconds: number;
  receivedAt: number;
  onAccept: () => void;
  onDeny: () => void;
}) {
  const [remaining, setRemaining] = useState(timeoutSeconds);

  useEffect(() => {
    const update = () => {
      const elapsed = (Date.now() - receivedAt) / 1000;
      const left = Math.max(0, Math.ceil(timeoutSeconds - elapsed));
      setRemaining(left);
      if (left <= 0) onDeny();
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [timeoutSeconds, receivedAt, onDeny]);

  const progress = remaining / timeoutSeconds;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(2px)" }}
    >
      <div
        className="w-[22rem] rounded-2xl overflow-hidden"
        style={{
          background: "#ffffff",
          boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
        }}
      >
        {/* Timeout progress bar */}
        <div style={{ height: 3, background: "#e2e8f0" }}>
          <div
            style={{
              height: "100%",
              width: `${progress * 100}%`,
              background: remaining <= 5 ? "#f59e0b" : "#3b82f6",
              transition: "width 1s linear, background 0.3s",
            }}
          />
        </div>

        <div className="p-5">
          {/* Icon + title */}
          <div className="flex items-center gap-3 mb-3">
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 40, height: 40, background: "#eff6ff" }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 3v7" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="10" cy="14" r="1" fill="#3b82f6"/>
                <circle cx="10" cy="10" r="8.5" stroke="#3b82f6" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#1e293b" }}>
                Control Transfer Request
              </p>
              <p className="text-xs" style={{ color: "#64748b" }}>
                {remaining}s remaining
              </p>
            </div>
          </div>

          {/* Message */}
          <p className="text-sm mb-4" style={{ color: "#475569" }}>
            <strong style={{ color: "#1e293b" }}>{requester}</strong> is requesting
            control of the robot. Would you like to yield?
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onAccept}
              className="flex-1 py-2.5 text-sm font-medium rounded-xl text-white transition-all"
              style={{
                background: "linear-gradient(to bottom, #3b82f6, #2563eb)",
                boxShadow: "0 1px 2px rgba(37,99,235,0.3)",
              }}
            >
              Yield Control
            </button>
            <button
              onClick={onDeny}
              className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-all"
              style={{
                background: "#ffffff",
                border: "1px solid #d1d5db",
                color: "#374151",
              }}
            >
              Keep Control
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({
  color,
  label,
  small,
}: {
  color: "green" | "red" | "yellow" | "neutral";
  label: string;
  small?: boolean;
}) {
  const styles: Record<string, { bg: string; text: string; dot: string }> = {
    green: { bg: "#f0fdf4", text: "#166534", dot: "#22c55e" },
    red: { bg: "#fef2f2", text: "#991b1b", dot: "#ef4444" },
    yellow: { bg: "#fffbeb", text: "#92400e", dot: "#f59e0b" },
    neutral: { bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8" },
  };
  const s = styles[color];

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full"
      style={{
        background: s.bg,
        padding: small ? "2px 8px" : "3px 10px",
        fontSize: small ? 11 : 12,
        color: s.text,
        fontWeight: 500,
      }}
    >
      <div className="rounded-full" style={{ width: 6, height: 6, background: s.dot }} />
      {label}
    </div>
  );
}

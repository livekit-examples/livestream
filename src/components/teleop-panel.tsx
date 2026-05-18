"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTeleop, TeleopState } from "@/hooks/use-teleop";
import { useRoomContext, useTracks } from "@livekit/components-react";
import { Track, RemoteTrackPublication } from "livekit-client";
import { Joystick } from "./joystick";
import { installLatencyReaders } from "@/lib/latency";

const MAX_LINEAR_SPEED = 0.5; // m/s
const MAX_ANGULAR_SPEED = 0.5; // rad/s
const COMMAND_RATE_MS = 50; // 20 Hz — must match hal-can-interfaces command interval
const VIDEO_STALE_MS = 500; // 500ms without a new frame = stale
const RTT_THRESHOLD_MS = 200; // must match backend SafetyValidator
const STREAM_LATENCY_GOOD_MS = 350; // < this = green
const STREAM_LATENCY_FAIR_MS = 500; // < this = yellow; >= this blocks commands
const STALE_WINDOW_MS = 60_000; // 1-minute rolling window for stale event rate

/**
 * The teleop agent names video tracks with the camera's topic-prefix shape:
 * mono `camera_front` → track `front`; stereo `camera_front/left` → track
 * `front-left`. The webapp's `selectedCameras` is a list of *directions*
 * (front/rear/left/right), so a track matches a selected camera if its
 * name equals the direction outright or starts with `${direction}-`.
 */
function cameraNameMatches(trackName: string, direction: string): boolean {
  return trackName === direction || trackName.startsWith(direction + "-");
}

export function TeleopPanel({ identity }: { identity: string }) {
  const { state, requestControl, releaseControl, acceptTransfer, denyTransfer, sendCommand, selectCameras } =
    useTeleop(identity);
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: true });

  // Match tracks to selected cameras by track name (the agent publishes
  // each camera as a track named `front`, `front-left`, etc.).
  const selectedTracks = tracks.filter((t) => {
    const trackName = t.publication?.trackName;
    if (!trackName) return false;
    return state.selectedCameras.some((dir) => cameraNameMatches(trackName, dir));
  });

  const joystickRef = useRef({ x: 0, y: 0 });
  const hasControlRef = useRef(state.hasControl);
  hasControlRef.current = state.hasControl;
  const rttRef = useRef(state.rttMs);
  rttRef.current = state.rttMs;

  const [velocity, setVelocity] = useState({ linear: 0, angular: 0 });

  // --- Minimize browser-side jitter buffer via playout delay hint ---
  // Lower values reduce latency but make playback more sensitive to jitter.
  // 100ms matches ugur-webrtc_teleop_test; 50ms was too aggressive for Starlink
  // jitter (80-220ms RTT spikes cause frame drops at low playout delay).
  //
  // livekit-client v2 changed the signature: a single `delayInSeconds`
  // number replaces the v1 `{ min, max }` object.
  useEffect(() => {
    for (const t of selectedTracks) {
      const pub0 = t.publication;
      if (!pub0 || !(pub0 instanceof RemoteTrackPublication)) continue;
      const remoteTrack = pub0.track;
      if (remoteTrack && "setPlayoutDelay" in remoteTrack) {
        (remoteTrack as any).setPlayoutDelay(0.1);
      }
    }
  }, [selectedTracks]);

  // --- Video staleness tracking via requestVideoFrameCallback ---
  // Use state (not ref) for the video element so assignment triggers a re-render
  // and the effect below re-runs. A ref would silently update without re-running.
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const [videoFresh, setVideoFresh] = useState(false);

  // --- Stale event tracking (rolling window, debug-only) ---
  // Logged to the console; not surfaced in the UI.
  const staleEventsRef = useRef<{ timestamp: number; durationMs: number }[]>([]);
  const staleStartRef = useRef<number | null>(null); // when current stale period began
  const wasFreshRef = useRef(false);

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

  // Poll staleness at 100ms intervals, track fresh→stale transitions
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const fresh = lastFrameTimeRef.current > 0
        && (now - lastFrameTimeRef.current) < VIDEO_STALE_MS;
      setVideoFresh(fresh);

      // Detect fresh → stale transition
      if (wasFreshRef.current && !fresh) {
        staleStartRef.current = now;
      }
      // Detect stale → fresh recovery
      if (!wasFreshRef.current && fresh && staleStartRef.current !== null) {
        const durationMs = now - staleStartRef.current;
        staleEventsRef.current.push({ timestamp: now, durationMs });
        console.warn(
          `[teleop-video] STALE event recovered after ${(durationMs / 1000).toFixed(1)}s`
        );
        staleStartRef.current = null;
      }
      wasFreshRef.current = fresh;

      // Prune old events outside the rolling window
      const cutoff = now - STALE_WINDOW_MS;
      staleEventsRef.current = staleEventsRef.current.filter(e => e.timestamp > cutoff);
    }, 100);
    return () => clearInterval(id);
  }, []);

  // --- LKTS timestamp extraction → frame age display ---
  // Hook the room's `TrackSubscribed` event and attach an encoded-streams
  // transform to each camera receiver the moment it subscribes — we have
  // to do this BEFORE the first frame is processed, or Chrome rejects
  // `createEncodedStreams()` with InvalidStateError. The Insertable
  // Streams transform parses the LKTS packet trailer the teleop agent
  // appends to every NAL and reports the embedded user_timestamp
  // (microseconds, sensor capture time at the robot).
  //
  // We stash the latest microsecond stamp keyed by trackName in a ref so
  // per-frame updates (~30/s) don't trigger React renders. A 200ms tick
  // re-renders the badges from the latest refs.
  const room = useRoomContext();
  const latencyTimestampsRef = useRef<Map<string, number>>(new Map());
  const [, setLatencyTick] = useState(0);

  useEffect(() => {
    if (!room) return;
    return installLatencyReaders(room, (trackName, userTimestampUs) => {
      latencyTimestampsRef.current.set(trackName, userTimestampUs);
    });
  }, [room]);

  useEffect(() => {
    const id = setInterval(() => setLatencyTick((n) => (n + 1) % 1_000_000), 200);
    return () => clearInterval(id);
  }, []);

  // --- WebRTC video stats (latency diagnostics) ---
  // Polls inbound-rtp stats every 2s and logs jitter buffer, decode, and loss metrics.
  useEffect(() => {
    const pub0 = selectedTracks[0]?.publication;
    if (!pub0 || !(pub0 instanceof RemoteTrackPublication)) return;
    const remoteTrack = pub0.track;
    if (!remoteTrack) return;

    // Access the underlying RTCRtpReceiver via the track's mediaStreamTrack
    const mediaTrack = remoteTrack.mediaStreamTrack;
    if (!mediaTrack) return;

    // Keep previous values for delta computation
    let prevJitterBufferDelay = 0;
    let prevJitterBufferEmitted = 0;
    let prevFramesDecoded = 0;
    let prevFramesDropped = 0;
    let prevBytesReceived = 0;
    let prevTimestamp = Date.now();

    const interval = setInterval(async () => {
      try {
        // Try to get stats from the RTCPeerConnection via livekit internals
        const receiver = (remoteTrack as any).receiver as RTCRtpReceiver | undefined;
        if (!receiver) return;
        const stats = await receiver.getStats();
        stats.forEach((report: any) => {
          if (report.type === "inbound-rtp" && report.kind === "video") {
            const now = Date.now();
            const jbDelay = report.jitterBufferDelay ?? 0;
            const jbEmitted = report.jitterBufferEmittedCount ?? 0;
            const framesDecoded = report.framesDecoded ?? 0;
            const framesDropped = report.framesDropped ?? 0;
            const bytesReceived = report.bytesReceived ?? 0;

            // Compute average jitter buffer delay over this interval
            const deltaDelay = jbDelay - prevJitterBufferDelay;
            const deltaEmitted = jbEmitted - prevJitterBufferEmitted;
            const avgJbMs = deltaEmitted > 0 ? (deltaDelay / deltaEmitted) * 1000 : 0;

            const deltaDecoded = framesDecoded - prevFramesDecoded;
            const deltaDropped = framesDropped - prevFramesDropped;

            // Bandwidth: kbps over this polling interval
            const deltaBytes = bytesReceived - prevBytesReceived;
            const deltaSecs = (now - prevTimestamp) / 1000;
            const kbps = deltaSecs > 0 ? (deltaBytes * 8) / (deltaSecs * 1000) : 0;

            // FPS: frames decoded in this interval
            const fps = deltaSecs > 0 ? deltaDecoded / deltaSecs : 0;

            const staleEvents = staleEventsRef.current;
            const staleEvts = staleEvents.length;
            const avgStaleSec = staleEvts > 0
              ? staleEvents.reduce((a, e) => a + e.durationMs, 0) / staleEvts / 1000
              : 0;

            const rtt = rttRef.current;
            const networkOneWay = rtt !== null ? rtt / 2 : null;
            // Estimated e2e: jitter buffer + network one-way + browser decode (~5ms)
            const estE2e = networkOneWay !== null
              ? avgJbMs + networkOneWay + 5
              : null;

            console.log(
              `[teleop-stats] jitterBuffer=${avgJbMs.toFixed(1)}ms ` +
              `rtt=${rtt !== null ? rtt.toFixed(0) : "?"}ms ` +
              `estBrowserE2e=${estE2e !== null ? estE2e.toFixed(0) : "?"}ms ` +
              `fps=${fps.toFixed(1)} bw=${kbps.toFixed(0)}kbps ` +
              `decoded=${deltaDecoded} dropped=${deltaDropped} ` +
              `staleEvents=${staleEvts}/min avgStaleDuration=${avgStaleSec.toFixed(1)}s ` +
              `nack=${report.nackCount ?? 0} pli=${report.pliCount ?? 0}`
            );

            prevJitterBufferDelay = jbDelay;
            prevJitterBufferEmitted = jbEmitted;
            prevFramesDecoded = framesDecoded;
            prevFramesDropped = framesDropped;
            prevBytesReceived = bytesReceived;
            prevTimestamp = now;
          }
        });
      } catch {
        // Stats collection is best-effort; don't spam errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedTracks]);

  // --- Camera toggle handler ---
  const toggleCamera = useCallback(
    (cam: string) => {
      const selected = state.selectedCameras.includes(cam)
        ? state.selectedCameras.filter((c) => c !== cam)
        : [...state.selectedCameras, cam];
      selectCameras(selected);
    },
    [state.selectedCameras, selectCameras]
  );

  // --- Safety block reason ---
  const hasVideo = selectedTracks.length > 0;
  // Worst (highest) capture-to-display latency across selected cameras.
  let worstStreamLatencyMs: number | null = null;
  for (const t of selectedTracks) {
    const name = t.publication?.trackName;
    if (!name) continue;
    const ts = latencyTimestampsRef.current.get(name);
    if (ts === undefined) continue;
    const age = Math.max(0, Date.now() - ts / 1000);
    if (age > 10_000) continue; // sanity gate — clock skew
    if (worstStreamLatencyMs === null || age > worstStreamLatencyMs) {
      worstStreamLatencyMs = age;
    }
  }
  // Stream-latency gate. `null` = no LKTS trailer data despite a fresh
  // video stream (extractor wiring bug, missing packet trailer worker on
  // the room, …). `0` = `Math.max(0, …)` clamped a negative value, which
  // happens when the robot's wall clock is ahead of the operator's
  // (clock skew bigger than the true one-way delay). Both are
  // unreliable readings and should block commands.
  const streamLatencyReason: string | null =
    worstStreamLatencyMs === null
      ? "Stream latency unavailable (no LKTS trailer data)"
      : worstStreamLatencyMs === 0
      ? "Stream latency reads 0 ms (likely clock skew between robot and operator)"
      : worstStreamLatencyMs >= STREAM_LATENCY_FAIR_MS
      ? `Stream latency too high (${worstStreamLatencyMs.toFixed(0)}ms ≥ ${STREAM_LATENCY_FAIR_MS}ms)`
      : null;
  const safetyBlockReason: string | null = !hasVideo
    ? "No video stream available"
    : !videoFresh
    ? "Video stream is stale"
    : state.rttMs !== null && state.rttMs > RTT_THRESHOLD_MS
    ? `Latency too high (${state.rttMs.toFixed(0)}ms > ${RTT_THRESHOLD_MS}ms)`
    : streamLatencyReason;

  const controlsBlocked = safetyBlockReason !== null;
  const safetyBlockRef = useRef(controlsBlocked);
  safetyBlockRef.current = controlsBlocked;

  // Send commands at fixed rate while joystick/keyboard is active
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

  // Keyboard WASD fallback — updates joystickRef so the interval sends at a fixed rate
  useEffect(() => {
    const keys = { w: false, a: false, s: false, d: false };
    const update = () => {
      const lin = (keys.w ? 1 : 0) + (keys.s ? -1 : 0);
      const ang = (keys.a ? 1 : 0) + (keys.d ? -1 : 0);
      joystickRef.current = { x: -ang, y: -lin };
      setVelocity({ linear: lin * MAX_LINEAR_SPEED, angular: ang * MAX_ANGULAR_SPEED });
    };
    const down = (e: KeyboardEvent) => {
      if (!hasControlRef.current || safetyBlockRef.current) return;
      const k = e.key.toLowerCase();
      if (k === " ") { e.preventDefault(); joystickRef.current = { x: 0, y: 0 }; setVelocity({ linear: 0, angular: 0 }); sendCommand(0, 0, 0); return; }
      if (k in keys) { e.preventDefault(); keys[k as keyof typeof keys] = true; update(); }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k in keys) { e.preventDefault(); keys[k as keyof typeof keys] = false; update(); }
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
        {/* Video area */}
        <div className="flex-1 flex flex-col min-h-0 gap-2">
          {/* Camera selector */}
          {state.availableCameras.length > 0 && (
            <div className="flex gap-2 flex-shrink-0">
              {state.availableCameras.map((cam) => {
                const selected = state.selectedCameras.includes(cam);
                return (
                  <button
                    key={cam}
                    onClick={() => toggleCamera(cam)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                    style={{
                      background: selected ? "#3b82f6" : "#ffffff",
                      color: selected ? "#ffffff" : "#64748b",
                      border: selected ? "1px solid #2563eb" : "1px solid #e2e8f0",
                      boxShadow: selected
                        ? "0 1px 2px rgba(37,99,235,0.3)"
                        : "0 1px 2px rgba(0,0,0,0.04)",
                    }}
                  >
                    {cam}
                  </button>
                );
              })}
            </div>
          )}

          {/* Video grid */}
          <div
            className={`flex-1 min-h-0 gap-2 ${
              selectedTracks.length <= 1
                ? "flex"
                : "grid grid-cols-2"
            }`}
          >
            {selectedTracks.length > 0 ? (
              selectedTracks.map((trackRef) => {
                const camName = trackRef.publication?.trackName ?? "unknown";
                const isFirst = trackRef === selectedTracks[0];
                const userTimestampUs = latencyTimestampsRef.current.get(camName);
                const ageMs =
                  userTimestampUs !== undefined
                    ? Math.max(0, Date.now() - userTimestampUs / 1000)
                    : null;
                // Display only sane values; >10s usually means operator clock
                // skew or no frames received yet — show "—" instead.
                const ageLabel =
                  ageMs === null || ageMs > 10_000
                    ? "—"
                    : `${ageMs.toFixed(0)} ms`;
                const ageColor =
                  ageMs === null
                    ? "rgba(255,255,255,0.6)"
                    : ageMs < STREAM_LATENCY_GOOD_MS
                    ? "#86efac"
                    : ageMs < STREAM_LATENCY_FAIR_MS
                    ? "#fde68a"
                    : "#fca5a5";
                return (
                  <div
                    key={camName}
                    className="relative rounded-xl overflow-hidden"
                    style={{
                      background: "#e2e8f0",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)",
                    }}
                  >
                    <video
                      ref={(el) => {
                        if (isFirst) setVideoEl(el);
                        if (el && trackRef.publication?.track) {
                          trackRef.publication.track.attach(el);
                        }
                      }}
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain"
                      style={{ filter: "contrast(1.03) saturate(1.05)" }}
                    />
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ boxShadow: "inset 0 0 80px 30px rgba(0,0,0,0.25)" }}
                    />
                    <div className="absolute top-2 left-2">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-medium capitalize"
                        style={{ background: "rgba(0,0,0,0.5)", color: "#ffffff" }}
                      >
                        {camName}
                      </span>
                    </div>
                    <div className="absolute top-2 right-2">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-mono"
                        style={{
                          background: "rgba(0,0,0,0.55)",
                          color: ageColor,
                        }}
                        title="Video age — sensor capture → operator paint. Requires NTP-synced clocks on both sides."
                      >
                        Video age: {ageLabel}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div
                className="flex-1 flex flex-col items-center justify-center rounded-xl"
                style={{
                  background: "#e2e8f0",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)",
                }}
              >
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <rect x="4" y="8" width="32" height="24" rx="3" stroke="#94a3b8" strokeWidth="1.5" fill="none"/>
                  <circle cx="20" cy="20" r="6" stroke="#94a3b8" strokeWidth="1.5" fill="none"/>
                  <circle cx="20" cy="20" r="2" fill="#94a3b8"/>
                </svg>
                <span style={{ color: "#94a3b8", fontSize: 13 }} className="mt-2">
                  {state.availableCameras.length === 0
                    ? "Waiting for cameras..."
                    : "Select a camera above"}
                </span>
              </div>
            )}
          </div>

          {/* Video status pill */}
          {selectedTracks.length > 0 && (
            <div className="flex-shrink-0">
              <StatusPill
                color={!hasVideo ? "neutral" : videoFresh ? "green" : "yellow"}
                label={!hasVideo ? "No Video" : videoFresh ? "Video OK" : "Video Stale"}
              />
            </div>
          )}
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

          {/* Control link RTT (data-channel ping/pong round-trip). The
              per-camera "Video age" badge above each preview shows the
              capture→display age for each individual stream. */}
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
    <div
      className="flex items-center justify-between p-2.5 rounded-xl"
      style={{ background: bg, border: `1px solid ${border}` }}
      title="Control link round-trip time — measured by data-channel ping/pong between the operator and the robot. Independent of the per-camera video age."
    >
      <span className="text-xs" style={{ color: "#64748b" }}>Control link RTT</span>
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

/** Robot width guide overlay — draws converging perspective lines representing
 *  the robot's 48-inch (1.22m) width projected into the camera view.
 *
 *  The lines originate from the bottom of the frame (where the robot body is)
 *  and converge toward the vanishing point near the horizon. Positions are
 *  approximate — no camera calibration is applied. Adjust the constants below
 *  if the camera mounting changes.
 */
function RobotWidthGuide() {
  // Vanishing point (percentage of video frame)
  const vx = 50;  // horizontal center
  const vy = 35;  // roughly where the horizon sits

  // Robot edge positions at the bottom of the frame.
  // These are visual estimates for a center-mounted forward camera with
  // ~48° effective HFOV (after 2.5x crop from wide-angle lens).
  const leftX = 30;
  const rightX = 70;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {/* Left robot edge */}
      <line
        x1={leftX} y1={100} x2={vx} y2={vy}
        stroke="rgba(255,50,50,0.7)"
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
        strokeDasharray="6,4"
      />
      {/* Right robot edge */}
      <line
        x1={rightX} y1={100} x2={vx} y2={vy}
        stroke="rgba(255,50,50,0.7)"
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
        strokeDasharray="6,4"
      />
      {/* Center line (driving direction) */}
      <line
        x1={vx} y1={100} x2={vx} y2={vy}
        stroke="rgba(255,50,50,0.35)"
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
        strokeDasharray="3,6"
      />
    </svg>
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

// Stream-latency reader.
//
// Preferred path (when the publisher advertises `packet_trailer_features`
// AND the room has a packet-trailer worker configured): the SDK's
// `PacketTrailerManager` extracts the LKTS trailer the teleop agent
// appends to every encoded H264 frame and caches `{ userTimestamp }`
// keyed by RTP timestamp. We listen to `TrackEvent.TimeSyncUpdate`
// (fires per-rAF with the currently-rendering frame's RTP timestamp)
// and call `track.lookupFrameMetadata` to retrieve `userTimestamp`.
//
// Fallback path (when no packet-trailer worker is configured, or the
// publisher hasn't advertised the feature): poll receiver stats at
// 1 Hz. Combine `lastSenderReportRemoteTimestamp` (sender wall clock
// at SR send time) and the local stats `timestamp` (when we received
// that SR) — assuming NTP-synced clocks, their difference is the SR
// packet's one-way network delay. Add `jitterBufferDelay + decode time`
// and report a synthetic `userTimestamp = Date.now() - total`.
//
// Both paths feed `onUpdate(trackName, userTimestampUs)` so the UI is
// agnostic to which one's active.

import {
  Room,
  RoomEvent,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteVideoTrack,
  Track,
  TrackEvent,
} from "livekit-client";

export type LatencyUpdate = (trackName: string, userTimestampUs: number) => void;

const STATS_POLL_MS = 1000;

function attachLatencyReader(
  track: RemoteVideoTrack,
  trackName: string,
  onUpdate: LatencyUpdate,
): () => void {
  let stopped = false;
  let trailerSeen = false;

  // Path 1: TimeSyncUpdate + lookupFrameMetadata.
  const timeSyncHandler = ({ rtpTimestamp }: { rtpTimestamp: number; timestamp: number }) => {
    const meta = track.lookupFrameMetadata({ rtpTimestamp });
    if (meta?.userTimestamp !== undefined && meta.userTimestamp > BigInt(0)) {
      trailerSeen = true;
      // Number coercion is safe: 2^53 µs = ~285k years past Unix epoch.
      onUpdate(trackName, Number(meta.userTimestamp));
    }
  };
  track.on(TrackEvent.TimeSyncUpdate, timeSyncHandler);

  // Path 2 (fallback): poll receiver stats and compute SR-network + jitter.
  // Only used if the trailer never arrives — once we've seen even one
  // trailer hit, the exact capture-time path takes over for good.
  const poll = async () => {
    if (stopped) return;
    if (trailerSeen) {
      if (!stopped) setTimeout(poll, STATS_POLL_MS);
      return;
    }
    const stats = await readReceiverStats(track);
    const localOnlyMs =
      (stats.jitterBufferDelayMs ?? 0) + (stats.totalDecodeMs ?? 0);
    let networkOneWayMs: number | undefined;
    if (
      stats.srRemoteTimestampMs !== undefined &&
      stats.srLocalTimestampMs !== undefined
    ) {
      networkOneWayMs = Math.max(
        0,
        stats.srLocalTimestampMs - stats.srRemoteTimestampMs,
      );
    }
    if (localOnlyMs > 0 || networkOneWayMs !== undefined) {
      const totalMs = (networkOneWayMs ?? 0) + localOnlyMs;
      const syntheticCaptureMs = Date.now() - totalMs;
      onUpdate(trackName, syntheticCaptureMs * 1000);
    }
    if (!stopped) setTimeout(poll, STATS_POLL_MS);
  };
  poll();

  return () => {
    stopped = true;
    track.off(TrackEvent.TimeSyncUpdate, timeSyncHandler);
  };
}

interface ReceiverStatsSummary {
  rtpTimestamp?: number;
  rtpReceiveTimestamp?: number;
  jitterBufferDelayMs?: number;
  totalDecodeMs?: number;
  srRemoteTimestampMs?: number;
  srLocalTimestampMs?: number;
}

async function readReceiverStats(
  track: RemoteVideoTrack,
): Promise<ReceiverStatsSummary> {
  const out: ReceiverStatsSummary = {};
  const receiver = track.receiver;
  if (!receiver) return out;

  const sources = receiver.getSynchronizationSources?.();
  if (sources && sources.length > 0) {
    out.rtpTimestamp = sources[0].rtpTimestamp;
    out.rtpReceiveTimestamp = sources[0].timestamp;
  }

  try {
    const stats = await receiver.getStats();
    let remoteId: string | undefined;
    stats.forEach((report: any) => {
      if (report.type === "inbound-rtp" && report.kind === "video") {
        remoteId = report.remoteId;
        if (typeof report.jitterBufferDelay === "number" &&
            typeof report.jitterBufferEmittedCount === "number" &&
            report.jitterBufferEmittedCount > 0) {
          out.jitterBufferDelayMs =
            (report.jitterBufferDelay / report.jitterBufferEmittedCount) * 1000;
        }
        if (typeof report.totalDecodeTime === "number" &&
            typeof report.framesDecoded === "number" &&
            report.framesDecoded > 0) {
          out.totalDecodeMs =
            (report.totalDecodeTime / report.framesDecoded) * 1000;
        }
      }
    });
    if (remoteId) {
      stats.forEach((report: any) => {
        if (report.id === remoteId && report.type === "remote-outbound-rtp") {
          if (typeof report.remoteTimestamp === "number") {
            out.srRemoteTimestampMs = report.remoteTimestamp;
          }
          if (typeof report.timestamp === "number") {
            out.srLocalTimestampMs = report.timestamp;
          }
        }
      });
    }
  } catch (err) {
    console.warn("[latency] getStats failed:", err);
  }
  return out;
}

export function installLatencyReaders(
  room: Room,
  onUpdate: LatencyUpdate,
): () => void {
  const perTrackCleanup = new Map<string, () => void>();

  // We key the latency map by `publication.trackName` (e.g. `front`,
  // `front-left`) because that's how the UI looks the value up. The
  // RemoteTrack itself doesn't carry the published name in v2.
  const onSubscribed = (track: RemoteTrack, publication: RemoteTrackPublication) => {
    if (track.kind !== Track.Kind.Video || track.source !== Track.Source.Camera) {
      return;
    }
    if (!(track instanceof RemoteVideoTrack)) return;
    const sid = track.sid;
    if (!sid) return;
    const trackName = publication.trackName ?? sid;
    const cleanup = attachLatencyReader(track, trackName, onUpdate);
    perTrackCleanup.set(sid, cleanup);
  };

  const onUnsubscribed = (track: RemoteTrack) => {
    const sid = track.sid;
    if (!sid) return;
    const cleanup = perTrackCleanup.get(sid);
    if (cleanup) {
      cleanup();
      perTrackCleanup.delete(sid);
    }
  };

  room.on(RoomEvent.TrackSubscribed, onSubscribed);
  room.on(RoomEvent.TrackUnsubscribed, onUnsubscribed);

  return () => {
    room.off(RoomEvent.TrackSubscribed, onSubscribed);
    room.off(RoomEvent.TrackUnsubscribed, onUnsubscribed);
    perTrackCleanup.forEach((cleanup) => cleanup());
    perTrackCleanup.clear();
  };
}

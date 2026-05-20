"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import {
  ConnectionState,
  DataPacket_Kind,
  RemoteParticipant,
  RoomEvent,
} from "livekit-client";
import {
  TeleopMessage,
  encodeTeleopMessage,
  parseTeleopMessage,
} from "@/lib/teleop-messages";

/**
 * Identity of the teleop agent (the robot) in the LiveKit room.
 * Must match `PARTICIPANT_IDENTITY` in
 * amiga-apps/teleop-agent-app/src/lib.rs.
 */
const ROBOT_IDENTITY = "teleop_agent";

export type TransferRequest = {
  requesterIdentity: string;
  timeoutSeconds: number;
  receivedAt: number; // Date.now()
};

export type TeleopState = {
  connected: boolean;
  hasControl: boolean;
  controllerIdentity: string | null;
  rttMs: number | null;
  leaseExpiry: string | null;
  lastError: string | null;
  pendingTransfer: TransferRequest | null;
  /** True while we're waiting for someone else to yield control to us. */
  awaitingTransfer: boolean;
  /** Camera names currently available on the robot. */
  availableCameras: string[];
  /** Camera names the user has selected to view. */
  selectedCameras: string[];
};

export function useTeleop(identity: string) {
  const room = useRoomContext();
  const sequenceRef = useRef(0);
  const leaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Store the lease duration so we can extend it on each command
  const leaseDurationMsRef = useRef<number | null>(null);
  const [state, setState] = useState<TeleopState>({
    connected: false,
    hasControl: false,
    controllerIdentity: null,
    rttMs: null,
    leaseExpiry: null,
    lastError: null,
    pendingTransfer: null,
    awaitingTransfer: false,
    availableCameras: [],
    selectedCameras: [],
  });

  const clearLeaseTimer = useCallback(() => {
    if (leaseTimerRef.current) {
      clearTimeout(leaseTimerRef.current);
      leaseTimerRef.current = null;
    }
  }, []);

  const setLeaseTimer = useCallback(
    (expiryIso: string) => {
      clearLeaseTimer();
      const expiryMs = new Date(expiryIso).getTime() - Date.now();
      if (expiryMs <= 0) {
        setState((s) => ({
          ...s,
          hasControl: false,
          controllerIdentity: null,
          leaseExpiry: null,
          lastError: "Control lease expired",
        }));
        return;
      }
      leaseTimerRef.current = setTimeout(() => {
        setState((s) => ({
          ...s,
          hasControl: false,
          controllerIdentity: null,
          leaseExpiry: null,
          lastError: "Control lease expired",
        }));
      }, expiryMs);
    },
    [clearLeaseTimer]
  );

  // Extend the lease from now by the original duration.
  // Called on each command send — mirrors the backend's renew_lease() behavior.
  const extendLease = useCallback(() => {
    const duration = leaseDurationMsRef.current;
    if (!duration) return;
    const newExpiry = new Date(Date.now() + duration).toISOString();
    setState((s) => ({ ...s, leaseExpiry: newExpiry }));
    setLeaseTimer(newExpiry);
  }, [setLeaseTimer]);

  const sendMessage = useCallback(
    async (msg: TeleopMessage) => {
      try {
        const payload = encodeTeleopMessage(msg);
        await room.localParticipant.publishData(
          payload,
          DataPacket_Kind.RELIABLE,
          { topic: "teleop" }
        );
      } catch (err) {
        console.error("Failed to send teleop message:", err);
      }
    },
    [room]
  );

  // Track hasControl in a ref so event handlers always see the latest value.
  const hasControlRef = useRef(false);
  useEffect(() => {
    hasControlRef.current = state.hasControl;
  }, [state.hasControl]);

  // Handle incoming messages from the robot
  useEffect(() => {
    const handleData = (
      payload: Uint8Array,
      _participant: any,
      _kind: any,
      _topic: string | undefined
    ) => {
      const msg = parseTeleopMessage(payload);
      if (!msg) return;

      switch (msg.type) {
        case "ping":
          sendMessage({
            type: "pong",
            pingId: msg.pingId,
            timestamp: new Date().toISOString(),
          });
          break;

        case "control_response":
          // Ignore responses addressed to other participants
          if (msg.targetIdentity !== identity) break;
          if (msg.granted) {
            // Compute and store the lease duration for future renewals
            if (msg.leaseExpiry) {
              const duration = new Date(msg.leaseExpiry).getTime() - Date.now();
              leaseDurationMsRef.current = Math.max(duration, 5000);
              setLeaseTimer(msg.leaseExpiry);
            }
            setState((s) => ({
              ...s,
              hasControl: true,
              controllerIdentity: msg.teleoperatorIdentity,
              leaseExpiry: msg.leaseExpiry,
              lastError: null,
              pendingTransfer: null,
              awaitingTransfer: false,
            }));
          } else {
            clearLeaseTimer();
            leaseDurationMsRef.current = null;
            setState((s) => ({
              ...s,
              hasControl: false,
              controllerIdentity: null,
              leaseExpiry: null,
              lastError: msg.denialReason || "Control denied",
              pendingTransfer: null,
              awaitingTransfer: false,
            }));
          }
          break;

        case "release_control_response":
          // Ignore responses addressed to other participants
          if (msg.targetIdentity !== identity) break;
          clearLeaseTimer();
          leaseDurationMsRef.current = null;
          if (msg.success) {
            setState((s) => ({
              ...s,
              hasControl: false,
              controllerIdentity: null,
              leaseExpiry: null,
              lastError: null,
              pendingTransfer: null,
              awaitingTransfer: false,
            }));
          } else {
            // Server revoked control (e.g. lease expired) — clear all control state
            setState((s) => ({
              ...s,
              hasControl: false,
              controllerIdentity: null,
              leaseExpiry: null,
              lastError: msg.errorMessage || "Release failed",
            }));
          }
          break;

        case "control_transfer_request":
          if (msg.targetIdentity === identity) {
            // We're the current controller — someone wants our control
            setState((s) => ({
              ...s,
              pendingTransfer: {
                requesterIdentity: msg.requesterIdentity,
                timeoutSeconds: msg.timeoutSeconds,
                receivedAt: Date.now(),
              },
            }));
          } else if (msg.requesterIdentity === identity) {
            // We're the requester — the current controller has been asked to yield
            setState((s) => ({
              ...s,
              awaitingTransfer: true,
            }));
          }
          break;

        case "rtt_update":
          setState((s) => ({ ...s, rttMs: msg.rttMs }));
          break;

        case "available_cameras":
          setState((s) => ({
            ...s,
            availableCameras: msg.cameras,
            // Remove any selected cameras that are no longer available
            selectedCameras: s.selectedCameras.filter((c) =>
              msg.cameras.includes(c)
            ),
          }));
          break;

        default:
          break;
      }
    };

    // When LiveKit reconnects after a network disruption, the backend may have
    // fired ParticipantDisconnected and revoked our control. Re-request it so
    // the operator doesn't have to manually click "Take Control" again.
    const handleReconnected = () => {
      console.log("[teleop] LiveKit reconnected");
      if (hasControlRef.current) {
        console.log("[teleop] Re-requesting control after reconnect");
        sendMessage({
          type: "control_request",
          userIdentity: identity,
          timestamp: new Date().toISOString(),
        });
      }
    };

    const handleDisconnected = () => {
      console.log("[teleop] LiveKit disconnected");
      clearLeaseTimer();
      leaseDurationMsRef.current = null;
      setState((s) => ({
        ...s,
        connected: false,
        hasControl: false,
        controllerIdentity: null,
        leaseExpiry: null,
        rttMs: null,
        lastError: "Disconnected from room",
        pendingTransfer: null,
        awaitingTransfer: false,
      }));
    };

    // The robot's teleop agent left the room (crashed, network drop, restart).
    // The lease will eventually expire on its own, but proactively clear control
    // state so the operator gets immediate feedback instead of trying to drive
    // a robot that isn't there.
    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      if (participant.identity !== ROBOT_IDENTITY) return;
      console.log("[teleop] Robot disconnected from room");
      clearLeaseTimer();
      leaseDurationMsRef.current = null;
      setState((s) => ({
        ...s,
        hasControl: false,
        controllerIdentity: null,
        leaseExpiry: null,
        rttMs: null,
        lastError: "Robot disconnected",
        pendingTransfer: null,
        awaitingTransfer: false,
      }));
    };

    // Fires once the LiveKit socket is actually up and the local participant
    // has joined. publishData before this point silently fails — the request
    // never reaches the agent.
    const handleConnected = () => {
      setState((s) => ({ ...s, connected: true }));
      sendMessage({
        type: "request_available_cameras",
        userIdentity: identity,
      });
    };

    room.on(RoomEvent.DataReceived, handleData);
    room.on(RoomEvent.Connected, handleConnected);
    room.on(RoomEvent.Reconnected, handleReconnected);
    room.on(RoomEvent.Disconnected, handleDisconnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

    // The room may already be Connected by the time this effect attaches
    // (e.g. fast reconnect, StrictMode re-run), in which case the Connected
    // event has already fired and won't fire again.
    if (room.state === ConnectionState.Connected) {
      handleConnected();
    }

    return () => {
      room.off(RoomEvent.DataReceived, handleData);
      room.off(RoomEvent.Connected, handleConnected);
      room.off(RoomEvent.Reconnected, handleReconnected);
      room.off(RoomEvent.Disconnected, handleDisconnected);
      room.off(
        RoomEvent.ParticipantDisconnected,
        handleParticipantDisconnected
      );
      clearLeaseTimer();
    };
  }, [room, sendMessage, identity, setLeaseTimer, clearLeaseTimer]);

  const requestControl = useCallback(() => {
    sendMessage({
      type: "control_request",
      userIdentity: identity,
      timestamp: new Date().toISOString(),
    });
  }, [sendMessage, identity]);

  const releaseControl = useCallback(() => {
    sendMessage({
      type: "release_control",
      userIdentity: identity,
    });
  }, [sendMessage, identity]);

  const acceptTransfer = useCallback(() => {
    sendMessage({
      type: "control_transfer_decision",
      userIdentity: identity,
      accepted: true,
    });
    setState((s) => ({ ...s, pendingTransfer: null }));
  }, [sendMessage, identity]);

  const denyTransfer = useCallback(() => {
    sendMessage({
      type: "control_transfer_decision",
      userIdentity: identity,
      accepted: false,
    });
    setState((s) => ({ ...s, pendingTransfer: null }));
  }, [sendMessage, identity]);

  const selectCameras = useCallback(
    (cameras: string[]) => {
      setState((s) => ({ ...s, selectedCameras: cameras }));
      sendMessage({
        type: "camera_selection",
        userIdentity: identity,
        cameras,
      });
    },
    [sendMessage, identity]
  );

  const sendCommand = useCallback(
    (linearX: number, linearY: number, angular: number) => {
      sequenceRef.current += 1;
      sendMessage({
        type: "command",
        sequence: sequenceRef.current,
        timestamp: new Date().toISOString(),
        twist: {
          linearVelocityX: linearX,
          linearVelocityY: linearY,
          angularVelocity: angular,
        },
      });
      // Mirror the backend's lease renewal on valid commands
      extendLease();
    },
    [sendMessage, extendLease]
  );

  return {
    state,
    requestControl,
    releaseControl,
    acceptTransfer,
    denyTransfer,
    sendCommand,
    selectCameras,
  };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { DataPacket_Kind, RoomEvent } from "livekit-client";
import {
  TeleopMessage,
  encodeTeleopMessage,
  parseTeleopMessage,
} from "@/lib/teleop-messages";

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
            }));
          } else {
            setState((s) => ({
              ...s,
              lastError: msg.errorMessage || "Release failed",
            }));
          }
          break;

        case "control_transfer_request":
          // Only the current controller receives this
          if (msg.targetIdentity !== identity) break;
          setState((s) => ({
            ...s,
            pendingTransfer: {
              requesterIdentity: msg.requesterIdentity,
              timeoutSeconds: msg.timeoutSeconds,
              receivedAt: Date.now(),
            },
          }));
          break;

        case "rtt_update":
          setState((s) => ({ ...s, rttMs: msg.rttMs }));
          break;

        default:
          break;
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    setState((s) => ({ ...s, connected: true }));

    return () => {
      room.off(RoomEvent.DataReceived, handleData);
      clearLeaseTimer();
    };
  }, [room, sendMessage, setLeaseTimer, clearLeaseTimer]);

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
  };
}

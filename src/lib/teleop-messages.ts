// TeleopMessage types matching the Rust backend's serde JSON format.
// The backend uses internally tagged enums: {"type": "control_request", ...}

export type Twist2d = {
  linearVelocityX: number;
  linearVelocityY: number;
  angularVelocity: number;
};

export type ControlRequest = {
  type: "control_request";
  userIdentity: string;
  timestamp: string;
};

export type ControlResponse = {
  type: "control_response";
  targetIdentity: string;
  granted: boolean;
  teleoperatorIdentity: string | null;
  leaseExpiry: string | null;
  isTransferred: boolean;
  denialReason: string | null;
  retryAfterSeconds: number | null;
};

export type ReleaseControl = {
  type: "release_control";
  userIdentity: string;
};

export type ReleaseControlResponse = {
  type: "release_control_response";
  targetIdentity: string;
  success: boolean;
  errorMessage: string | null;
};

export type Command = {
  type: "command";
  sequence: number;
  timestamp: string;
  twist: Twist2d;
};

export type Ping = {
  type: "ping";
  pingId: string;
  timestamp: string;
};

export type Pong = {
  type: "pong";
  pingId: string;
  timestamp: string;
};

export type RttUpdate = {
  type: "rtt_update";
  rttMs: number;
  timestamp: string;
};

export type TeleopMessage =
  | ControlRequest
  | ControlResponse
  | ReleaseControl
  | ReleaseControlResponse
  | Command
  | Ping
  | Pong
  | RttUpdate;

export function parseTeleopMessage(data: Uint8Array): TeleopMessage | null {
  try {
    const text = new TextDecoder().decode(data);
    return JSON.parse(text) as TeleopMessage;
  } catch {
    console.warn("Failed to parse teleop message:", data);
    return null;
  }
}

export function encodeTeleopMessage(msg: TeleopMessage): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(msg));
}

import { AccessToken } from "livekit-server-sdk";

export type ConnectionDetails = {
  token: string;
  ws_url: string;
};

export type JoinRoomParams = {
  room_name: string;
  identity: string;
};

export type JoinRoomResponse = {
  connection_details: ConnectionDetails;
};

export class Controller {
  async joinRoom({
    identity,
    room_name,
  }: JoinRoomParams): Promise<JoinRoomResponse> {
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      { identity }
    );

    at.addGrant({
      room: room_name,
      roomJoin: true,
      canPublish: false,
      canSubscribe: true,
      canPublishData: true,
    });

    return {
      connection_details: {
        ws_url: process.env.LIVEKIT_WS_URL!,
        token: at.toJwt(),
      },
    };
  }
}

import { createTRPCRouter, publicProcedure } from "../trpc";

import { env } from "@/env.mjs";
import { AccessToken } from "livekit-server-sdk";
import { z } from "zod";

export const tokenRouter = createTRPCRouter({
  // This token allows the user to publish audio/video tracks and data (chat) to the room.
  getWrite: publicProcedure
    .input(
      z.object({
        roomName: z
          .string()
          .regex(/^([a-z][a-z0-9]*)(-[a-z0-9]+)*$/)
          .min(3),
        identity: z.string().min(3),
      })
    )
    .query(({ input }) => {
      const token = new AccessToken(
        env.LIVEKIT_API_KEY,
        env.LIVEKIT_API_SECRET,
        { identity: input.identity }
      );

      token.addGrant({
        room: input.roomName,
        roomJoin: true,
        canPublish: true,
        canPublishData: true,
      });

      return { token: token.toJwt() };
    }),

  // This token only allows the user to publish data (chat) to the room.
  getRead: publicProcedure
    .input(
      z.object({
        roomName: z
          .string()
          .regex(/^([a-z][a-z0-9]*)(-[a-z0-9]+)*$/)
          .min(3),
        identity: z.string().min(3),
      })
    )
    .query(({ input }) => {
      const token = new AccessToken(
        env.LIVEKIT_API_KEY,
        env.LIVEKIT_API_SECRET,
        { identity: input.identity }
      );

      token.addGrant({
        room: input.roomName,
        roomJoin: true,
        canPublish: false,
        canPublishData: true,
      });

      return { token: token.toJwt() };
    }),
});

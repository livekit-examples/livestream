import { createTRPCRouter, publicProcedure } from "../trpc";

import { AccessToken } from "livekit-server-sdk";
import { env } from "@/env.mjs";
import { z } from "zod";

export const tokenRouter = createTRPCRouter({
  get: publicProcedure
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

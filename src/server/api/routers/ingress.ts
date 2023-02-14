import { createTRPCRouter, publicProcedure } from "../trpc";

import { IngressInput } from "livekit-server-sdk";
import { VideoQuality } from "livekit-server-sdk/dist/proto/livekit_models";
import { z } from "zod";

export const ingressRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        roomSlug: z
          .string()
          .regex(/^([a-z][a-z0-9]*)(-[a-z0-9]+)*$/)
          .min(3),
        streamerName: z.string().min(3),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { ingressClient } = ctx;

      const ingress = await ingressClient.createIngress(
        IngressInput.RTMP_INPUT,
        {
          name: input.roomSlug,
          roomName: input.roomSlug,
          participantName: input.streamerName,
          participantIdentity: input.roomSlug,
          videoParams: {
            mimeType: "video/H264",
            layers: [
              {
                quality: VideoQuality.HIGH,
                width: 1920,
                height: 1080,
                bitrate: 6000000,
                ssrc: 0,
              },
              {
                quality: VideoQuality.MEDIUM,
                width: 640,
                height: 360,
                bitrate: 800000,
                ssrc: 0,
              },
              {
                quality: VideoQuality.LOW,
                width: 480,
                height: 270,
                bitrate: 400000,
                ssrc: 0,
              },
            ],
          },
        }
      );

      return ingress;
    }),

  deleteAll: publicProcedure.mutation(async ({ ctx }) => {
    const { ingressClient } = ctx;
    const ingresses = await ingressClient.listIngress();

    for (const ingress of ingresses) {
      if (ingress.ingressId) {
        await ingressClient.deleteIngress(ingress.ingressId);
      }
    }
  }),
});

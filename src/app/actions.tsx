"use server";

import {
  AccessToken,
  IngressAudioEncodingPreset,
  IngressClient,
  IngressInput,
  IngressVideoEncodingPreset,
  type CreateIngressOptions,
} from "livekit-server-sdk";
import { TrackSource } from "livekit-server-sdk/dist/proto/livekit_models";

const ingressClient = new IngressClient(process.env.LIVEKIT_API_URL!);

export async function createStreamerToken(slug: string) {
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      // HACK: should really be the streamer's name
      identity: slug,
    }
  );

  token.addGrant({
    room: slug,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
  });

  return await Promise.resolve(token.toJwt());
}

export async function createViewerToken(roomName: string, identity: string) {
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity: identity,
    }
  );

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: false,
    canPublishData: true,
  });

  return await Promise.resolve(token.toJwt());
}

export async function createIngress(
  roomSlug: string,
  ingressType: IngressInput
) {
  const options: CreateIngressOptions = {
    name: roomSlug,
    roomName: roomSlug,
    participantName: roomSlug,
    participantIdentity: roomSlug,
  };

  if (ingressType === IngressInput.WHIP_INPUT) {
    // https://docs.livekit.io/egress-ingress/ingress/overview/#bypass-transcoding-for-whip-sessions
    options.bypassTranscoding = true;
  } else {
    options.video = {
      source: TrackSource.CAMERA,
      preset: IngressVideoEncodingPreset.H264_1080P_30FPS_3_LAYERS,
    };
    options.audio = {
      source: TrackSource.MICROPHONE,
      preset: IngressAudioEncodingPreset.OPUS_STEREO_96KBPS,
    };
  }

  const ingress = await ingressClient.createIngress(ingressType, options);

  return ingress;
}

export async function resetIngresses() {
  const ingresses = await ingressClient.listIngress({});

  for (const ingress of ingresses) {
    if (ingress.ingressId) {
      await ingressClient.deleteIngress(ingress.ingressId);
    }
  }
}

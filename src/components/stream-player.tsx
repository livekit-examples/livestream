import {
  StartAudio,
  useConnectionState,
  useRemoteParticipant,
  useTracks,
} from "@livekit/components-react";
import { ConnectionState, Track, type Participant } from "livekit-client";
import React, { useCallback, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

import Link from "next/link";
import { Icons } from "./ui/icons";

function toString(connectionState: string) {
  switch (connectionState) {
    case "connected":
      return "Connected!";
    case "connecting":
      return "Connecting...";
    case "disconnected":
      return "Disconnected";
    case "reconnecting":
      return "Reconnecting";
    default:
      return "Unknown";
  }
}

interface Props {
  streamerIdentity: string;
}

export default function StreamPlayerWrapper({ streamerIdentity }: Props) {
  const connectionState = useConnectionState();
  const participant = useRemoteParticipant(streamerIdentity);
  const tracks = useTracks(Object.values(Track.Source)).filter(
    (track) => track.participant.identity === streamerIdentity
  );

  if (connectionState !== ConnectionState.Connected || !participant) {
    return (
      <div className="grid aspect-video items-center justify-center bg-black text-sm uppercase text-white">
        {connectionState === ConnectionState.Connected
          ? "Stream is offline"
          : toString(connectionState)}
      </div>
    );
  } else if (tracks.length === 0) {
    return (
      <>
        <div className="flex aspect-video items-center justify-center bg-black text-sm uppercase text-white">
          <div className="flex gap-2">
            <div className="h-4 w-4 rounded-full bg-neutral-400 animate-bounce delay-100" />
            <div className="h-4 w-4 rounded-full bg-neutral-500 animate-bounce delay-200" />
            <div className="h-4 w-4 rounded-full bg-neutral-600 animate-bounce delay-300" />
          </div>
        </div>
      </>
    );
  }

  return <StreamPlayer participant={participant} />;
}

export const StreamPlayer = ({ participant }: { participant: Participant }) => {
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const videoEl = useRef<HTMLVideoElement>(null);
  const playerEl = useRef<HTMLDivElement>(null);

  useTracks(Object.values(Track.Source))
    .filter((track) => track.participant.identity === participant.identity)
    .forEach((track) => {
      if (videoEl.current) {
        track.publication.track?.attach(videoEl.current);
      }
    });

  const onVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMuted(e.target.value === "0");
      setVolume(+e.target.value);
      if (videoEl?.current) {
        videoEl.current.muted = e.target.value === "0";
        videoEl.current.volume = +e.target.value * 0.01;
      }
    },
    []
  );

  const onToggleMute = useCallback(() => {
    setMuted(!muted);
    setVolume(muted ? 50 : 0);
    if (videoEl?.current) {
      videoEl.current.muted = !muted;
      videoEl.current.volume = muted ? 0.5 : 0;
    }
  }, [muted]);

  const onFullScreen = useCallback(() => {
    if (isFullScreen) {
      document.exitFullscreen().catch((err) => console.error(err));
      setIsFullScreen(false);
    } else if (playerEl?.current) {
      playerEl.current.requestFullscreen().catch((err) => console.error(err));
      setIsFullScreen(true);
    }
  }, [isFullScreen]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative flex aspect-video bg-black" ref={playerEl}>
        <video ref={videoEl} width="100%" />
        <div className="absolute top-0 h-full w-full opacity-0 hover:opacity-100 hover:transition-all">
          <div className="absolute bottom-0 flex h-14 w-full items-center justify-between bg-gradient-to-t from-neutral-900 px-4">
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger>
                  <div className="text-white" onClick={onToggleMute}>
                    {muted ? (
                      <Icons.volumeOff className="h-6 w-6 hover:scale-110 hover:transition-all" />
                    ) : (
                      <Icons.volumeOn className="h-6 w-6 hover:scale-110 hover:transition-all" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>{muted ? "Unmute" : "Mute"}</TooltipContent>
              </Tooltip>
              <input
                type="range"
                onChange={onVolumeChange}
                className="ml-1 h-0.5 w-24 cursor-pointer appearance-none rounded-full bg-white accent-white"
                value={volume}
              />
            </div>
            <div className="flex items-center justify-center gap-4">
              <Tooltip>
                <TooltipTrigger>
                  <div className="text-white" onClick={onFullScreen}>
                    {isFullScreen ? (
                      <Icons.minimize className="h-5 w-5 hover:scale-110 hover:transition-all" />
                    ) : (
                      <Icons.maximize className="h-5 w-5 hover:scale-110 hover:transition-all" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {isFullScreen ? "Exit fullscreen" : "Enter fullscreen"}
                </TooltipContent>
              </Tooltip>
              <Link href="https://livekit.io/" target="_blank" rel="noreferrer">
                <Icons.livekit className="w-16 text-white hover:text-rose-400 hover:transition-all" />
              </Link>
            </div>
          </div>
        </div>
        <StartAudio
          label="Click to allow audio playback"
          className="absolute top-0 h-full w-full bg-black bg-opacity-75 text-white"
        />
      </div>
    </TooltipProvider>
  );
};

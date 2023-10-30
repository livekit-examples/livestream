import { Button } from "@/components/ui";
import { useLocalParticipant } from "@livekit/components-react";
import { createLocalTracks, Track, type LocalTrack } from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  slug: string;
}

export default function HostStudio({ slug }: Props) {
  const [videoTrack, setVideoTrack] = useState<LocalTrack>();
  const [audioTrack, setAudioTrack] = useState<LocalTrack>();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const previewVideoEl = useRef<HTMLVideoElement>(null);

  const { localParticipant } = useLocalParticipant();

  const createTracks = async () => {
    const tracks = await createLocalTracks({ audio: true, video: true });
    tracks.forEach((track) => {
      switch (track.kind) {
        case Track.Kind.Video: {
          if (previewVideoEl?.current) {
            track.attach(previewVideoEl.current);
          }
          setVideoTrack(track);
          break;
        }
        case Track.Kind.Audio: {
          setAudioTrack(track);
          break;
        }
      }
    });
  };

  useEffect(() => {
    void createTracks();
  }, []);

  useEffect(() => {
    return () => {
      videoTrack?.stop();
      audioTrack?.stop();
    };
  }, [videoTrack, audioTrack]);

  const togglePublishing = useCallback(async () => {
    if (isPublishing && localParticipant) {
      setIsUnpublishing(true);

      if (videoTrack) {
        void localParticipant.unpublishTrack(videoTrack);
      }
      if (audioTrack) {
        void localParticipant.unpublishTrack(audioTrack);
      }

      await createTracks();

      setTimeout(() => {
        setIsUnpublishing(false);
      }, 2000);
    } else if (localParticipant) {
      if (videoTrack) {
        void localParticipant.publishTrack(videoTrack);
      }
      if (audioTrack) {
        void localParticipant.publishTrack(audioTrack);
      }
    }

    setIsPublishing((prev) => !prev);
  }, [audioTrack, isPublishing, localParticipant, videoTrack]);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-[5px] text-lg font-bold">
          {isPublishing && !isUnpublishing ? (
            <div className="flex items-center gap-1">
              <span className="relative mr-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
              </span>
              LIVE
            </div>
          ) : (
            "Ready to stream"
          )}{" "}
          as{" "}
          <div className="italic text-purple-500 dark:text-purple-300">
            {slug}
          </div>
        </div>
        <div className="flex gap-2">
          {isPublishing ? (
            <Button
              size="sm"
              className=" bg-red-500 text-white hover:bg-red-700 dark:bg-red-500  dark:text-white dark:hover:bg-red-600"
              onClick={() => void togglePublishing()}
              disabled={isUnpublishing}
            >
              {isUnpublishing ? "Stopping..." : "Stop stream"}
            </Button>
          ) : (
            <Button
              size="sm"
              className=" bg-blue-500 text-white hover:bg-blue-700 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-600"
              onClick={() => void togglePublishing()}
            >
              Start stream
            </Button>
          )}
        </div>
      </div>
      <div className="aspect-video rounded-sm border border-neutral-500 bg-neutral-800">
        <video ref={previewVideoEl} width="100%" height="100%" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-purple-200 px-2 py-1 text-xs font-medium uppercase text-purple-600 ring-1 ring-inset ring-purple-600">
            Note
          </span>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Do not stream to RTMP/WHIP endpoint at the same time.
          </p>
        </div>
      </div>
    </div>
  );
}

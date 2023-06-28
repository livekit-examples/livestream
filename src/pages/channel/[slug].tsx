import ChannelInfo from "@/components/channel/ChannelInfo";
import Chat from "@/components/channel/Chat";
import Sidebar from "@/components/channel/Sidebar";
import StreamPlayer from "@/components/channel/StreamPlayer";
import WatchingAsBar from "@/components/channel/WatchingAsBar";
import { env } from "@/env.mjs";
import { api } from "@/lib/api";
import { generateName } from "@/lib/faker";
import { LiveKitRoom as RoomProvider } from "@livekit/components-react";
import jwt, { type JwtPayload } from "jwt-decode";
import {
  type GetServerSideProps,
  type InferGetServerSidePropsType,
} from "next";
import { useEffect, useMemo, useState } from "react";

interface Props {
  slug: string;
}

export const getServerSideProps: GetServerSideProps<Props> = async ({
  params,
}) => {
  return Promise.resolve({
    props: {
      slug: params?.slug as string,
    },
  });
};

export default function ChannelPage({
  slug,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const SESSION_VIEWER_TOKEN_KEY = `${slug}-viewer-token`;
  const generatedName = useMemo(() => generateName(), []);

  const [viewerName, setViewerName] = useState("");
  const [viewerToken, setViewerToken] = useState("");
  const [queryEnabled, setQueryEnabled] = useState(false);

  api.token.get.useQuery(
    {
      roomName: slug,
      identity: generatedName,
    },
    {
      onSuccess: (data) => {
        const payload: JwtPayload = jwt(data?.token);

        if (payload.jti) {
          setViewerName(payload.jti);
        }

        setViewerToken(data?.token);
        sessionStorage.setItem(SESSION_VIEWER_TOKEN_KEY, data?.token);
      },
      enabled: queryEnabled,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    }
  );

  // NOTE: This is a hack to persist the viewer token in the session storage
  // so that the client doesn't have to create a viewer token every time they
  // navigate back to the page.
  useEffect(() => {
    const sessionToken = sessionStorage.getItem(SESSION_VIEWER_TOKEN_KEY);

    if (sessionToken) {
      const payload: JwtPayload = jwt(sessionToken);

      if (payload.exp) {
        const expiry = new Date(payload.exp * 1000);
        if (expiry < new Date()) {
          sessionStorage.removeItem(SESSION_VIEWER_TOKEN_KEY);
          setQueryEnabled(true);
          return;
        }
      }

      if (payload.jti) {
        setViewerName(payload.jti);
      }

      setViewerToken(sessionToken);
    } else {
      setQueryEnabled(true);
    }
  }, [SESSION_VIEWER_TOKEN_KEY]);

  if (viewerToken === "" || viewerName === "") {
    return null;
  }

  return (
    <RoomProvider
      token={viewerToken}
      serverUrl={env.NEXT_PUBLIC_LIVEKIT_WS_URL}
      className="flex flex-1 flex-col"
    >
      <WatchingAsBar viewerName={viewerName} />
      <div className="flex h-full flex-1">
        <div className="sticky hidden w-80 border-r dark:border-zinc-800 dark:bg-zinc-900 lg:block">
          <div className="absolute left-0 top-0 bottom-0 flex h-full w-full flex-col gap-2 px-4 py-2">
            <Sidebar />
          </div>
        </div>
        <div className="flex-1 flex-col dark:border-t-zinc-200 dark:bg-black">
          <StreamPlayer streamerIdentity={slug} />
          <ChannelInfo streamerIdentity={slug} />
        </div>
        <div className="sticky hidden w-80 border-l dark:border-zinc-800 dark:bg-zinc-900 md:block">
          <div className="absolute top-0 bottom-0 right-0 flex h-full w-full flex-col gap-2 p-2">
            <Chat viewerName={viewerName} />
          </div>
        </div>
      </div>
    </RoomProvider>
  );
}

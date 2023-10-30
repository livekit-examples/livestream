import Chat from "@/components/channel/Chat";
import HostStudio from "@/components/channel/HostStudio";
import { env } from "@/env.mjs";
import { api } from "@/lib/api";
import { LiveKitRoom as RoomProvider } from "@livekit/components-react";
import jwt, { type JwtPayload } from "jwt-decode";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { useEffect, useState } from "react";

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

export default function ChannelHostPage({
  slug,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const SESSION_STREAMER_TOKEN_KEY = `${slug}-streamer-token`;

  const [streamerToken, setStreamerToken] = useState("");
  const [queryEnabled, setQueryEnabled] = useState(false);

  api.token.getWrite.useQuery(
    {
      roomName: slug,
      identity: slug,
    },
    {
      onSuccess: (data) => {
        setStreamerToken(data?.token);
        sessionStorage.setItem(SESSION_STREAMER_TOKEN_KEY, data?.token);
      },
      enabled: queryEnabled,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    }
  );

  // NOTE: This is a hack to persist the streamer token in the session storage
  // so that the client doesn't have to create a streamer token every time they
  // navigate back to the page.
  useEffect(() => {
    const sessionToken = sessionStorage.getItem(SESSION_STREAMER_TOKEN_KEY);

    if (sessionToken) {
      const payload: JwtPayload = jwt(sessionToken);

      if (payload.exp) {
        const expiry = new Date(payload.exp * 1000);
        if (expiry < new Date()) {
          sessionStorage.removeItem(SESSION_STREAMER_TOKEN_KEY);
          setQueryEnabled(true);
          return;
        }
      }

      setStreamerToken(sessionToken);
    } else {
      setQueryEnabled(true);
    }
  }, [SESSION_STREAMER_TOKEN_KEY]);

  if (streamerToken === "") {
    return null;
  }

  return (
    <RoomProvider
      token={streamerToken}
      serverUrl={env.NEXT_PUBLIC_LIVEKIT_WS_URL}
      className="flex flex-1 flex-col"
    >
      <div className="flex h-full flex-1">
        <div className="flex-1 flex-col p-12 dark:border-t-zinc-200 dark:bg-black">
          <HostStudio slug={slug} />
        </div>
        <div className="sticky hidden w-80 border-l dark:border-zinc-800 dark:bg-zinc-900 md:block">
          <div className="absolute top-0 bottom-0 right-0 flex h-full w-full flex-col gap-2 p-2">
            <Chat viewerName={slug} />
          </div>
        </div>
      </div>
    </RoomProvider>
  );
}

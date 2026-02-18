"use client";

import { useSearchParams, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LiveKitRoom } from "@livekit/components-react";
import { TeleopPanel } from "@/components/teleop-panel";
import type { ConnectionDetails } from "@/lib/controller";

export default function TeleopPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomName = params.roomName as string;
  const identity = searchParams.get("identity") || "operator";

  const [connectionDetails, setConnectionDetails] =
    useState<ConnectionDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function connect() {
      try {
        const res = await fetch("/api/join_stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room_name: roomName, identity }),
        });

        if (!res.ok) {
          const text = await res.text();
          setError(text || `HTTP ${res.status}`);
          return;
        }

        const data = await res.json();
        setConnectionDetails(data.connection_details);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Connection failed");
      }
    }

    connect();
  }, [roomName, identity]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8" style={{ background: "#f8fafc" }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ color: "#dc2626" }}>
            Connection Error
          </h1>
          <p style={{ color: "#6b7280" }}>{error}</p>
        </div>
      </main>
    );
  }

  if (!connectionDetails) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8" style={{ background: "#f8fafc" }}>
        <p style={{ color: "#6b7280" }}>
          Connecting to room &quot;{roomName}&quot;...
        </p>
      </main>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={connectionDetails.ws_url}
      token={connectionDetails.token}
      className="h-screen"
    >
      <TeleopPanel identity={identity} />
    </LiveKitRoom>
  );
}

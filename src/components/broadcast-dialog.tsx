"use client";

import { CreateStreamResponse } from "@/lib/controller";
import {
  Button,
  Dialog,
  Flex,
  Switch,
  Text,
  TextField,
} from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AllowParticipationInfo } from "./allow-participation-info";
import { Spinner } from "./spinner";

export function BroadcastDialog({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [name, setName] = useState("");
  const [enableChat, setEnableChat] = useState(true);
  const [allowParticipation, setAllowParticipation] = useState(true);

  const onGoLive = async () => {
    setLoading(true);
    const res = await fetch("/api/create_stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room_name: roomName,
        metadata: {
          creator_identity: name,
          enable_chat: enableChat,
          allow_participation: allowParticipation,
        },
      }),
    });
    const {
      auth_token,
      connection_details: { token },
    } = (await res.json()) as CreateStreamResponse;
    router.push(`/host?&at=${auth_token}&rt=${token}`);
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger>{children}</Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>Create new stream</Dialog.Title>
        <Flex direction="column" gap="4" mt="4">
          <label>
            <Text as="div" size="2" mb="1" weight="bold">
              Room name
            </Text>
            <TextField.Input
              type="text"
              placeholder="abcd-1234"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
          </label>
          <label>
            <Text as="div" size="2" mb="1" weight="bold">
              Your name
            </Text>
            <TextField.Input
              type="text"
              placeholder="Roger Dunn"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <Flex direction="column" gap="2">
            <Flex justify="between">
              <Text as="div" size="2" mb="1" weight="bold">
                Enable chat
              </Text>
              <Switch
                checked={enableChat}
                onCheckedChange={(e) => setEnableChat(e)}
              />
            </Flex>
            <Flex justify="between">
              <Flex align="center" gap="2">
                <Text as="div" size="2" weight="bold">
                  Viewers can participate
                </Text>
                <AllowParticipationInfo />
              </Flex>
              <Switch
                checked={allowParticipation}
                onCheckedChange={(e) => setAllowParticipation(e)}
              />
            </Flex>
          </Flex>
        </Flex>

        <Flex gap="3" mt="6" justify="end">
          <Dialog.Close>
            <Button
              variant="soft"
              color="gray"
              onClick={() => {
                setRoomName("");
                setName("");
                setEnableChat(true);
                setAllowParticipation(true);
              }}
            >
              Cancel
            </Button>
          </Dialog.Close>
          <Button disabled={!(roomName && name) || loading} onClick={onGoLive}>
            {loading ? (
              <Flex gap="2" align="center">
                <Spinner />
                <Text>Creating...</Text>
              </Flex>
            ) : (
              "Create"
            )}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

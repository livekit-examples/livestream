"use client";

import { Button, Dialog, Flex, Text, TextField } from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "./spinner";

export function JoinDialog({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [roomName, setRoomName] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <Dialog.Root>
      <Dialog.Trigger>{children}</Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>Join existing stream</Dialog.Title>
        <Flex direction="column" gap="3" mt="4">
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
        </Flex>

        <Flex gap="3" mt="6" justify="end">
          <Dialog.Close>
            <Button
              variant="soft"
              color="gray"
              onClick={() => {
                setRoomName("");
              }}
            >
              Cancel
            </Button>
          </Dialog.Close>

          <Button
            disabled={!roomName || loading}
            onClick={() => {
              setLoading(true);
              router.push(`/watch/${roomName}`);
            }}
          >
            {loading ? (
              <Flex gap="2" align="center">
                <Spinner />
                <Text>Joining...</Text>
              </Flex>
            ) : (
              "Join"
            )}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

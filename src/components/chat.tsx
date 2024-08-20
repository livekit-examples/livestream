"use client";

import { RoomMetadata } from "@/lib/controller";
import {
  ReceivedChatMessage,
  useChat,
  useLocalParticipant,
  useRoomInfo,
} from "@livekit/components-react";
import { PaperPlaneIcon, PersonIcon } from "@radix-ui/react-icons";
import {
  Avatar,
  Box,
  Flex,
  IconButton,
  Text,
  TextField,
} from "@radix-ui/themes";
import { useMemo, useState } from "react";

function ChatMessage({ message }: { message: ReceivedChatMessage }) {
  const { localParticipant } = useLocalParticipant();

  return (
    <Flex gap="2" align="start" className="break-words w-[220px]">
      <Avatar
        size="1"
        fallback={message.from?.identity[0] ?? <PersonIcon />}
        radius="full"
      />
      <Flex direction="column">
        <Text
          weight="bold"
          size="1"
          className={
            localParticipant.identity === message.from?.identity
              ? "text-accent-11"
              : "text-gray-11"
          }
        >
          {message.from?.identity ?? "Unknown"}
        </Text>
        <Text size="1">{message.message}</Text>
      </Flex>
    </Flex>
  );
}

export function Chat() {
  const [draft, setDraft] = useState("");
  const { chatMessages, send } = useChat();
  const { metadata } = useRoomInfo();

  const { enable_chat: chatEnabled } = (
    metadata ? JSON.parse(metadata) : {}
  ) as RoomMetadata;

  // HACK: why do we get duplicate messages?
  const messages = useMemo(() => {
    const timestamps = chatMessages.map((msg) => msg.timestamp);
    const filtered = chatMessages.filter(
      (msg, i) => !timestamps.includes(msg.timestamp, i + 1)
    );

    return filtered;
  }, [chatMessages]);

  const onSend = async () => {
    if (draft.trim().length && send) {
      setDraft("");
      await send(draft);
    }
  };

  return (
    <Flex direction="column" className="h-full">
      <Box className="text-center p-2 border-b border-accent-5">
        <Text size="2" className="font-mono text-accent-11">
          Live Chat
        </Text>
      </Box>
      <Flex
        direction="column"
        justify="end"
        className="flex-1 h-full px-2 overflow-y-auto"
        gap="2"
      >
        {messages.map((msg) => (
          <ChatMessage message={msg} key={msg.timestamp} />
        ))}
      </Flex>
      <Box>
        <Flex gap="2" py="2" px="4" mt="4" className="border-t border-accent-5">
          <Box className="flex-1">
            <TextField.Input
              disabled={!chatEnabled}
              placeholder={
                chatEnabled ? "Say something..." : "Chat is disabled"
              }
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyUp={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
          </Box>
          <IconButton onClick={onSend} disabled={!draft.trim().length}>
            <PaperPlaneIcon />
          </IconButton>
        </Flex>
      </Box>
    </Flex>
  );
}

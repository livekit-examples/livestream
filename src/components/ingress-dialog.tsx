"use client";

import { CreateIngressResponse } from "@/lib/controller";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import {
  Button,
  Code,
  Dialog,
  Flex,
  RadioGroup,
  Switch,
  Text,
  TextField,
} from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AllowParticipationInfo } from "./allow-participation-info";
import { Spinner } from "./spinner";

export function IngressDialog({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("rtmp");
  const [enableChat, setEnableChat] = useState(true);
  const [allowParticipation, setAllowParticipation] = useState(true);
  const [ingressResponse, setIngressResponse] =
    useState<CreateIngressResponse>();

  const onCreateIngress = async () => {
    setLoading(true);

    const res = await fetch("/api/create_ingress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room_name: roomName,
        ingress_type: type,
        metadata: {
          creator_identity: name,
          enable_chat: enableChat,
          allow_participation: allowParticipation,
        },
      }),
    });

    setIngressResponse(await res.json());
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger>{children}</Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 450 }}>
        {ingressResponse ? (
          <>
            <Dialog.Title>Start streaming now</Dialog.Title>
            <Flex direction="column" gap="4" mt="4">
              <Text>
                Copy these values into your OBS settings under{" "}
                <Code>Stream</Code> → <Code>Service</Code> →{" "}
                <Code>{type === "whip" ? "WHIP" : "Custom"}</Code>. When
                you&rsquo;re ready, press &quot;Start Streaming&quot; and watch
                the bits flow!
              </Text>
              <label>
                <Text as="div" size="2" mb="1" weight="bold">
                  Server URL
                </Text>
                <TextField.Input
                  type="text"
                  value={ingressResponse.ingress.url}
                  readOnly
                />
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="bold">
                  Stream key
                </Text>
                <TextField.Input
                  type="text"
                  value={ingressResponse.ingress.streamKey}
                  readOnly
                />
              </label>
              <Flex gap="3" mt="6" justify="end">
                <Button
                  onClick={() =>
                    router.push(
                      `/watch?at=${ingressResponse.auth_token}&rt=${ingressResponse.connection_details.token}`
                    )
                  }
                >
                  Join as viewer <ArrowRightIcon className="animate-wiggle" />
                </Button>
              </Flex>
            </Flex>
          </>
        ) : (
          <>
            <Dialog.Title>Setup ingress endpoint</Dialog.Title>
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
              <label>
                <Text as="div" size="2" mb="1" weight="bold">
                  Ingress type
                </Text>
                <RadioGroup.Root>
                  <Flex gap="2" direction="column">
                    <Text as="label" size="2">
                      <Flex gap="2">
                        <RadioGroup.Item
                          value="rtmp"
                          checked={type === "rtmp"}
                          onClick={() => setType("rtmp")}
                        />{" "}
                        RTMP
                      </Flex>
                    </Text>
                    <Text as="label" size="2">
                      <Flex gap="2">
                        <RadioGroup.Item
                          value="whip"
                          checked={type === "whip"}
                          onClick={() => setType("whip")}
                        />{" "}
                        WHIP
                      </Flex>
                    </Text>
                  </Flex>
                </RadioGroup.Root>
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
                    setType("rtmp");
                    setEnableChat(true);
                    setAllowParticipation(true);
                  }}
                >
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                disabled={!(roomName && name && type) || loading}
                onClick={onCreateIngress}
              >
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
          </>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}

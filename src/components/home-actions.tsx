"use client";

import { BroadcastDialog } from "@/components/broadcast-dialog";
import { IngressDialog } from "@/components/ingress-dialog";
import { JoinDialog } from "@/components/join-dialog";
import { Button, Flex, Text } from "@radix-ui/themes";

export function HomeActions() {
  return (
    <Flex direction="column" gap="4" justify="center" align="center">
      <Flex gap="2">
        <BroadcastDialog>
          <Button size="3">Stream from browser</Button>
        </BroadcastDialog>
        <IngressDialog>
          <Button size="3">Stream from OBS</Button>
        </IngressDialog>
      </Flex>
      <Text size="1">- OR -</Text>
      <JoinDialog>
        <Button variant="outline" size="3" className="w-full">
          Join existing stream
        </Button>
      </JoinDialog>
    </Flex>
  );
}

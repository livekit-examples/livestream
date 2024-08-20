"use client";

import { InfoCircledIcon } from "@radix-ui/react-icons";
import {
  AccessibleIcon,
  IconButton,
  Popover,
  Strong,
  Text,
} from "@radix-ui/themes";

export function AllowParticipationInfo() {
  return (
    <Popover.Root>
      <Popover.Trigger>
        <IconButton size="1" variant="ghost" color="gray">
          <AccessibleIcon label="Learn more about panel background options">
            <InfoCircledIcon />
          </AccessibleIcon>
        </IconButton>
      </Popover.Trigger>

      <Popover.Content
        size="1"
        style={{ maxWidth: 360 }}
        side="top"
        align="center"
      >
        <Text as="p" size="1">
          If enabled, viewers can <Strong>raise their hand</Strong>. When
          accepted by the host, they can share their audio and video. The host
          can also <Strong>invite</Strong> viewers to share their audio and
          video.
        </Text>
      </Popover.Content>
    </Popover.Root>
  );
}

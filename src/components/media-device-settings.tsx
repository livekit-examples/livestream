"use client";

import { cn } from "@/lib/utils";
import {
  useLocalParticipant,
  useMediaDeviceSelect,
  useRoomContext,
} from "@livekit/components-react";
import { CaretDownIcon } from "@radix-ui/react-icons";
import { Button, DropdownMenu, Flex } from "@radix-ui/themes";
import { ConnectionState } from "livekit-client";
import { useEffect, useState } from "react";

export function MediaDeviceSettings() {
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);

  const { state: roomState } = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (roomState === ConnectionState.Connected) {
      void localParticipant.setMicrophoneEnabled(micEnabled);
      void localParticipant.setCameraEnabled(camEnabled);
    }
  }, [micEnabled, camEnabled, localParticipant, roomState]);

  const {
    devices: microphoneDevices,
    activeDeviceId: activeMicrophoneDeviceId,
    setActiveMediaDevice: setActiveMicrophoneDevice,
  } = useMediaDeviceSelect({
    kind: "audioinput",
  });

  const {
    devices: cameraDevices,
    activeDeviceId: activeCameraDeviceId,
    setActiveMediaDevice: setActiveCameraDevice,
  } = useMediaDeviceSelect({
    kind: "videoinput",
  });

  return (
    <>
      <Flex>
        <Button
          size="1"
          variant={micEnabled ? "soft" : "surface"}
          onClick={() => setMicEnabled(!micEnabled)}
        >
          Mic {micEnabled ? "On" : "Off"}
        </Button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger disabled={!micEnabled}>
            <Button variant="soft" size="1">
              <CaretDownIcon />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content size="1">
            {microphoneDevices.map((d) => (
              <DropdownMenu.Item
                key={d.deviceId}
                onClick={() => setActiveMicrophoneDevice(d.deviceId)}
                className={cn(
                  d.deviceId === activeMicrophoneDeviceId && "text-accent-11"
                )}
              >
                {d.label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Flex>
      <Flex>
        <Button
          size="1"
          variant={camEnabled ? "soft" : "surface"}
          onClick={() => setCamEnabled(!camEnabled)}
        >
          Cam {camEnabled ? "On" : "Off"}
        </Button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger disabled={!camEnabled}>
            <Button variant="soft" size="1">
              <CaretDownIcon />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content size="1">
            {cameraDevices.map((d) => (
              <DropdownMenu.Item
                key={d.deviceId}
                onClick={() => setActiveCameraDevice(d.deviceId)}
                className={cn(
                  d.deviceId === activeCameraDeviceId && "text-accent-11"
                )}
              >
                {d.label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Flex>
    </>
  );
}

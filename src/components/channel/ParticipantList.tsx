import { ParticipantLoop, ParticipantName } from "@livekit/components-react";

export default function ParticipantList() {
  return (
    <ul>
      <ParticipantLoop>
        <li>
          <ParticipantName />
        </li>
      </ParticipantLoop>
    </ul>
  );
}

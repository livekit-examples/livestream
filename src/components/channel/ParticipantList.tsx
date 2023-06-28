import {
  ParticipantLoop,
  ParticipantName,
  useParticipants,
} from "@livekit/components-react";

export default function ParticipantList() {
  const participants = useParticipants();

  return (
    <ul>
      <ParticipantLoop participants={participants}>
        <li>
          <ParticipantName />
        </li>
      </ParticipantLoop>
    </ul>
  );
}

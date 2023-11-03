import { DialogDescription, DialogTitle } from "@radix-ui/react-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "./ui/dialog";

import { useParticipants } from "@livekit/components-react";
import { useState } from "react";
import { Icons } from "./ui/icons";

export default function Presence({
  participantIdentity,
}: {
  participantIdentity: string;
}) {
  const [open, setOpen] = useState(false);
  const participants = useParticipants();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <div className="flex items-center gap-2 rounded-lg px-2 py-1 text-violet-600 hover:bg-violet-100 hover:transition-all focus:outline-none focus:ring active:bg-violet-300 dark:text-violet-400 dark:hover:bg-zinc-900">
          <Icons.user className="h-5 w-5" />
          <div className="font-bold">{participants.length}</div>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <div className="border-b pb-4 text-lg font-bold">
              {participants.length}{" "}
              {participants.length > 1 ? "people" : "person"} here
            </div>
          </DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {participants.map((participant) => (
            <li key={participant.identity}>
              <div className="flex items-center gap-3">
                <div className={"h-6 w-6 rounded-full bg-slate-600"}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="rounded-full"
                    src={`https://api.dicebear.com/5.x/open-peeps/svg?seed=${participant.identity}&size=64&face=smile,cute`}
                    alt={participant.identity}
                  />
                </div>
                <div className="text-sm">
                  {participant.identity}
                  {participant.identity === participantIdentity && " (You)"}
                  {participant.videoTracks.size > 0 && " (Host)"}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

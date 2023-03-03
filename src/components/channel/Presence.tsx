import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "../ui/Dialog";
import { DialogDescription, DialogTitle } from "@radix-ui/react-dialog";

import { Icons } from "@/components/ui";
import { cn } from "@/styles/utils";
import { useParticipants } from "@livekit/components-react";
import { useState } from "react";

export default function Presence() {
  const [open, setOpen] = useState(false);
  const participants = useParticipants();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <div className="flex items-center gap-2 rounded-lg px-2 py-1 text-blue-600 hover:bg-blue-100 hover:transition-all focus:outline-none focus:ring active:bg-blue-300 dark:text-blue-400 dark:hover:bg-zinc-900">
          <Icons.user className="h-5 w-5" />
          <div className="font-bold">{participants.length}</div>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <div className="border-b pb-4 text-lg font-bold dark:border-zinc-700">
              {participants.length}{" "}
              {participants.length > 1 ? "people" : "person"} here
            </div>
          </DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <ul className="space-y-1">
          {participants.map((participant) => (
            <li key={participant.identity}>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-4 w-4 rounded-full bg-blue-300",
                    participant.videoTracks.size > 0
                      ? "bg-teal-300"
                      : "bg-blue-300"
                  )}
                ></div>
                <div className="text-sm">
                  {participant.identity}{" "}
                  {participant.videoTracks.size > 0 && "(Host)"}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

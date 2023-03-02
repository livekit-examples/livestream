import { Button, Icons } from "@/components/ui";
import { api, type RouterInputs } from "@/lib/api";
import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";

type CreateIngressInput = RouterInputs["ingress"]["create"];

export default function CreateIngressForm() {
  const createIngress = api.ingress.create.useMutation();

  const [formData, setFormData] = useState<CreateIngressInput>({
    streamerName: "",
    roomSlug: "",
  });

  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      createIngress.mutate(formData);
    },
    [createIngress, formData]
  );

  return (
    <>
      {!createIngress.data && (
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <h1 className="text-xl font-medium">Create an RTMP endpoint</h1>
          <form className="grid gap-6" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label
                htmlFor="streamerName"
                className="text-sm font-medium uppercase"
              >
                Streamer Name
              </label>
              <input
                id="streamerName"
                type="text"
                placeholder="First Last"
                className="my-0 mb-2 block h-9 w-full rounded-md border border-zinc-300 py-2 px-3 text-sm placeholder:text-zinc-400 hover:border-zinc-400 focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-1 dark:border-zinc-600 dark:bg-zinc-800"
                value={formData.streamerName}
                onChange={(evt) =>
                  setFormData({ ...formData, streamerName: evt.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="roomSlug"
                className="text-sm font-medium uppercase"
              >
                Room Slug
              </label>
              <input
                id="roomSlug"
                type="text"
                placeholder="channel-name"
                className="my-0 mb-2 block h-9 w-full rounded-md border border-zinc-300 py-2 px-3 text-sm placeholder:text-zinc-400 hover:border-zinc-400 focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-1 dark:border-zinc-600 dark:bg-zinc-800"
                value={formData.roomSlug}
                onChange={(evt) =>
                  setFormData({ ...formData, roomSlug: evt.target.value })
                }
              />
            </div>
            <Button
              disabled={createIngress.isLoading}
              className="bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 dark:hover:text-black"
            >
              Create
            </Button>
          </form>
        </div>
      )}
      {createIngress.data && (
        <div className="mx-auto flex w-full flex-col justify-center space-y-4 rounded border border-lime-300 bg-lime-100 p-4 dark:bg-lime-200 sm:w-[350px]">
          <h2 className="text-md font-medium dark:text-black">
            Success! Use the following config:
          </h2>
          <div>
            <div className="pb-1 text-xs font-medium uppercase dark:text-black">
              Server URL:
            </div>
            <div className="rounded bg-zinc-100 p-1 font-mono text-xs dark:text-black">
              {createIngress.data?.url}
            </div>
          </div>
          <div>
            <div className="pb-1 text-xs font-medium uppercase dark:text-black">
              Stream Key:
            </div>
            <div className="rounded bg-zinc-100 p-1 font-mono text-xs dark:text-black">
              {createIngress.data?.streamKey}
            </div>
          </div>
          <div>
            <Link href={`/channel/${formData.roomSlug}`}>
              <Button className="flex w-full items-center gap-2">
                Go to channel <Icons.arrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

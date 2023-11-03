"use client";

import { createIngress } from "@/app/actions";
import { zodResolver } from "@hookform/resolvers/zod";
import { IngressInput, type IngressInfo } from "livekit-server-sdk";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "./ui/form";
import { Icons } from "./ui/icons";
import { Input } from "./ui/input";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

const formSchema = z.object({
  roomSlug: z
    .string()
    .regex(/^([a-z][a-z0-9]*)(-[a-z0-9]+)*$/)
    .min(3),
  ingressType: z.union([
    z.literal(String(IngressInput.RTMP_INPUT)),
    z.literal(String(IngressInput.WHIP_INPUT)),
  ]),
});

export default function CreateIngressForm({
  slug,
}: {
  slug?: string | undefined;
}) {
  const [ingress, setIngress] = useState<IngressInfo | undefined>();
  const [roomSlug, setRoomSlug] = useState<string | undefined>(slug);
  const [urlCopied, setUrlCopied] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomSlug: slug ?? "",
      ingressType: String(IngressInput.RTMP_INPUT),
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const ingressInfo = await createIngress(
      values.roomSlug,
      parseInt(values.ingressType)
    );

    setIngress(ingressInfo);
    setRoomSlug(values.roomSlug);
  };

  const onCopyUrl = () => {
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 1000);
  };

  const onCopyKey = () => {
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 1000);
  };

  return (
    <>
      {!ingress && (
        <div className="flex w-full flex-col justify-center space-y-6 sm:w-[420px] border p-8">
          <h1 className="text-xl font-medium">Create an ingress endpoint</h1>
          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void form.handleSubmit(onSubmit)(e);
              }}
              className="flex flex-col gap-4"
            >
              <FormField
                control={form.control}
                name="roomSlug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Channel ID</FormLabel>
                    <FormControl>
                      <Input placeholder="john-doe" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ingressType"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Ingress Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={String(field.value)}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem
                              value={String(IngressInput.RTMP_INPUT)}
                            />
                          </FormControl>
                          <FormLabel>RTMP</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem
                              value={String(IngressInput.WHIP_INPUT)}
                            />
                          </FormControl>
                          <FormLabel>WHIP</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" className="mt-2">
                Submit
              </Button>
            </form>
          </Form>
        </div>
      )}
      {ingress && (
        <div className="mx-auto flex w-full flex-col justify-center space-y-4 border border-violet-500 p-8 sm:w-[420px]">
          <h2 className="text-md font-medium mb-2">
            Success! Use the following config:
          </h2>
          <div>
            <div className="flex justify-between">
              <div className="pb-1 text-xs font-medium uppercase">
                Server URL:
              </div>
              <div
                className="cursor-pointer text-xs font-bold"
                onClick={() => {
                  onCopyUrl();
                  void navigator.clipboard.writeText(ingress?.url ?? "");
                }}
              >
                {urlCopied ? "Copied!" : "Copy"}
              </div>
            </div>
            <div className="rounded p-1 font-mono text-xs dark:bg-slate-800 bg-violet-50">
              {ingress?.url}
            </div>
          </div>
          <div>
            <div className="flex justify-between">
              <div className="pb-1 text-xs font-medium uppercase">
                Stream Key:
              </div>
              <div
                className="cursor-pointer text-xs font-bold"
                onClick={() => {
                  onCopyKey();
                  void navigator.clipboard.writeText(ingress?.streamKey ?? "");
                }}
              >
                {keyCopied ? "Copied!" : "Copy"}
              </div>
            </div>
            <div className="rounded p-1 font-mono text-xs dark:bg-slate-800 bg-violet-50">
              {ingress?.streamKey}
            </div>
          </div>
          <div>
            <Link href={`/channel/${roomSlug}`}>
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

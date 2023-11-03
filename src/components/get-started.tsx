"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Icons } from "./ui/icons";
import { Input } from "./ui/input";

const slugSchema = z
  .string()
  .regex(/^([a-z][a-z0-9]*)(-[a-z0-9]+)*$/)
  .min(3);

export default function HomeForm() {
  const [slug, setSlug] = useState("");
  const [validSlug, setValidSlug] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      slugSchema.parse(slug);
      setValidSlug(true);
    } catch {
      setValidSlug(false);
    }
  }, [slug]);

  return (
    <div className="flex items-center gap-2">
      <Input
        className="w-[200px]"
        type="text"
        placeholder="example-stream"
        onChange={(e) => {
          setSlug(e.target.value);
        }}
        value={slug}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" disabled={!validSlug}>
            Join as host
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onClick={() => router.push(`/setup?channel=${slug}`)}
            className="flex items-center gap-2"
          >
            <Icons.uploadCloud className="h-4 w-4" />
            Broadcast via LKC Ingress
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/channel/${slug}/host`)}
            className="flex items-center gap-2"
          >
            <Icons.webcam className="h-4 w-4" />
            Broadcast from current device
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="secondary"
        disabled={!validSlug}
        onClick={() => router.push(`/channel/${slug}`)}
      >
        Join as viewer
      </Button>
    </div>
  );
}

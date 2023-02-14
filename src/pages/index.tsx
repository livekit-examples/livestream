import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";

export default function IndexPage() {
  return (
    <section className="container mx-auto grid items-center gap-6 px-4 pt-6 pb-8 md:py-10">
      <div className="flex max-w-[980px] flex-col items-start gap-2">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tighter sm:text-3xl md:text-5xl lg:text-6xl">
          Livestream with LiveKit
        </h1>
        <p className="max-w-[700px] text-lg text-slate-700 dark:text-slate-400 sm:text-xl">
          This is a{" "}
          <Link
            href="https://create.t3.gg/"
            target="_blank"
            rel="noferrer"
            className="underline"
          >
            T3 Stack
          </Link>{" "}
          project built with a collection of technologies including:
        </p>
        <ul className="ml-6 list-disc text-lg text-slate-700 dark:text-slate-400 sm:text-xl">
          <li>
            <Link
              href="https://nextjs.org/"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Next.js
            </Link>
          </li>
          <li>
            <Link
              href="https://tailwindcss.com/"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Tailwind
            </Link>
          </li>
          <li>
            <Link
              href="https://trpc.io/"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              tRPC
            </Link>
          </li>
          <li>LiveKit (Server & Client SDK)</li>
          <li>
            <Link
              href="https://github.com/shadcn/ui"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              shadcn/ui
            </Link>
          </li>
        </ul>
      </div>
      <div className="flex gap-4">
        <Link
          href="https://docs.livekit.io"
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ size: "lg" })}
        >
          LiveKit Documentation
        </Link>
        <Link
          target="_blank"
          rel="noreferrer"
          href="https://github.com/livekit"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          LiveKit GitHub
        </Link>
      </div>
    </section>
  );
}

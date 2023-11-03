import GetStartedForm from "@/components/get-started";
import { Icons } from "@/components/ui/icons";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "LiveKit Cast",
};

export default function IndexPage() {
  return (
    <section className="items-start px-6 container mx-auto flex max-w-[680px] flex-1 flex-col pt-6 pb-8">
      <div className="mx-auto flex w-full flex-col items-start gap-4">
        <div className="flex items-center gap-2">
          <Icons.livekit className="h-12 text-foreground" />
          <h1 className="text-[48pt] leading-tight tracking-tighter text-violet-400">
            Cast
          </h1>
        </div>
        <div className="flex flex-col gap-6 text-foreground">
          <p className="text-2xl">
            Open source livestreaming app built on{" "}
            <a
              href="https://github.com/livekit/components-js?ref=cast"
              className="text-violet-500 dark:text-violet-400"
            >
              LiveKit Components
            </a>
            ,{" "}
            <a
              href="https://livekit.io/cloud?ref=cast"
              className="text-violet-500 dark:text-violet-400"
            >
              LiveKit Cloud
            </a>{" "}
            and Next.js 14 (including Server Actions).
          </p>
          <p>To get started, enter a channel ID below and select an option:</p>
          <GetStartedForm />
          <p>
            Want to deploy this sample app yourself? Our friends at Vercel make
            it super easy:
            <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flivekit-examples%2Flivestream&env=LIVEKIT_API_KEY,LIVEKIT_API_SECRET,LIVEKIT_API_URL,NEXT_PUBLIC_LIVEKIT_WS_URL&envDescription=Sign%20up%20for%20an%20account%20at%20https%3A%2F%2Fcloud.livekit.io%20and%20create%20an%20API%20key%20in%20the%20Project%20Settings%20UI">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="mt-4"
                alt="deploy with vercel"
                src="https://vercel.com/button"
              />
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

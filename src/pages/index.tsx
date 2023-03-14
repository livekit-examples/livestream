import Image from "next/image";
import Link from "next/link";

export default function IndexPage() {
  return (
    <section className="items-startpx-4 container mx-auto flex max-w-[680px] flex-1 flex-col pt-6 pb-8 md:py-10">
      <div className="mx-auto flex w-full flex-col items-start gap-6">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tighter sm:text-3xl md:text-5xl lg:text-6xl">
          Hello, broadcaster!
        </h1>
        <div className="flex flex-col gap-6 text-lg text-zinc-700 dark:text-zinc-400 sm:text-xl">
          <p>
            This{" "}
            <Link
              href="https://create.t3.gg/"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              T3 app
            </Link>{" "}
            is a great starting point for building your own livestreaming
            service. It includes a basic setup page to create an RTMP endpoint,
            as well as a basic watch page that allows you to view the broadcast
            as a guest and to chat with others in real-time. All A/V and
            real-time data is handled by WebRTC via{" "}
            <Link
              href="https://livekit.io/"
              target="_blank"
              className="underline"
            >
              LiveKit
            </Link>
            .
          </p>
          <p>
            To get started as a broadcaster, navigate to the setup page and fill
            out the simple form to create an RTMP endpoint and stream key. If
            you use{" "}
            <Link
              href="https://obsproject.com/"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Open Broadcaster Service
            </Link>{" "}
            (OBS) Studio, you can plug these values into the stream settings
            window:
          </p>
          <Image
            width={1200}
            height={600}
            alt="Screenshot 2023-03-14 at 11 31 16 AM"
            src="https://user-images.githubusercontent.com/304392/225103865-c0c3accb-600f-411d-814e-8f6384784b62.png"
          />
          <p>
            When you&rsquo;re ready, press &ldquo;Start Streaming&rdquo; from
            the main window and watch the bits start to flow in your channel!
          </p>
        </div>
      </div>
    </section>
  );
}

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
            This NextJS app (bootstrapped with{" "}
            <Link
              href="https://create.t3.gg/"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              create-t3-app
            </Link>
            ) is a great starting point for building your own livestreaming
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
            To get started as a broadcaster, navigate to the{" "}
            <Link href="/setup" className="underline">
              setup page
            </Link>{" "}
            and fill out the simple form to create an RTMP endpoint and stream
            key. If you use{" "}
            <Link
              href="https://obsproject.com/"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              OBS Studio
            </Link>
            , you can plug these values into the stream settings window:
          </p>
          <Image
            width={1200}
            height={600}
            alt="OBS Studio settings window"
            src="https://user-images.githubusercontent.com/304392/225103865-c0c3accb-600f-411d-814e-8f6384784b62.png"
          />
          <p>
            When you&rsquo;re ready, press &ldquo;Start Streaming&rdquo; from
            the main window and watch the bits start to flow in your channel!
          </p>
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

import CreateIngressForm from "@/components/create-ingress-form";
import { type Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Create an ingress endpoint",
};

interface PageProps {
  searchParams: {
    channel: string | undefined;
  };
}

export default function SetupPage({ searchParams: { channel } }: PageProps) {
  return (
    <section className="container-sm mx-auto flex flex-1 flex-col items-center space-y-10 px-6 py-6 md:py-10">
      <CreateIngressForm slug={channel} />
      <div className="w-full border-t" />
      <div className="max-w-[728px]">
        <h1 className="text-xl font-medium mb-4">
          Streaming with OBS + LiveKit Ingress
        </h1>
        <p>
          After setting up your ingress endpoint, you should receive two values:
          a RTMP or WHIP server URL and a stream key. Download and install{" "}
          <Link
            href="https://obsproject.com/"
            target="_blank"
            rel="noreferrer"
            className="text-violet-500 dark:text-violet-300 underline"
          >
            OBS Studio
          </Link>{" "}
          and configure your stream settings as follows:
        </p>
        <Image
          width={1200}
          height={600}
          alt="OBS Studio settings window"
          src="https://user-images.githubusercontent.com/304392/225103865-c0c3accb-600f-411d-814e-8f6384784b62.png"
        />
        <p>
          When you&rsquo;re done with setting up your stream and ready to
          broadcast, click &ldquo;Start Streaming&rdquo;. Now you&rsquo;re live!
        </p>
      </div>
    </section>
  );
}

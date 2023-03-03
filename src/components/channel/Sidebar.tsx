import { generateName } from "@/lib/faker";

export default function Sidebar() {
  return (
    <>
      <div className="text-lg font-bold">Live now</div>
      <ul className="space-y-4">
        {new Array(10).fill("").map((_, i) => (
          <Channel key={i} />
        ))}
      </ul>
    </>
  );
}

const Channel = () => {
  const channelName = generateName();
  const channelViewers = Intl.NumberFormat("en", {
    notation: "compact",
  }).format(Math.floor(Math.random() * 3600));

  return (
    <li className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="h-8 w-8 rounded-full bg-blue-300"
          src={`https://api.dicebear.com/5.x/open-peeps/svg?seed=${channelName}&size=32&face=smile,cute`}
          alt={channelName}
        />
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold">{channelName}</div>
          </div>
          <div className="text-sm opacity-80">LiveKit</div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <div className="h-2 w-2 rounded-full bg-red-500" />
        <div className="text-sm">{channelViewers}</div>
      </div>
    </li>
  );
};

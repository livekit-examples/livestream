type Props = {
  viewerName: string;
};

export default function WatchingAsBar({ viewerName }: Props) {
  return (
    <div className="bg-yellow-300 py-2 text-center text-sm text-black dark:bg-yellow-500">
      Watching as <span className="font-bold">{viewerName}</span>
    </div>
  );
}

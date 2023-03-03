type Props = {
  viewerName: string;
};

export default function WatchingAsBar({ viewerName }: Props) {
  return (
    <div className="border-b py-2 text-center text-xs text-blue-500 dark:border-b-0 dark:bg-blue-900 dark:text-blue-300">
      Watching as <span className="font-bold">{viewerName}</span>
    </div>
  );
}

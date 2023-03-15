import { ThemeToggle } from "@/components/ThemeToggle";
import { Icons } from "@/components/ui";
import { buttonVariants } from "@/components/ui/Button";
import Link from "next/link";

export function NavBar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-b-zinc-200 bg-white px-4 dark:border-b-zinc-700 dark:bg-zinc-900">
      <div className="mx-auto flex h-12 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-6 md:gap-10">
          <Link href="/" className="items-center space-x-2 md:flex">
            <Icons.zap className="h-6 w-6" />
          </Link>
          <nav className="hidden gap-6 md:flex">
            <Link
              href="/setup"
              className="flex items-center text-lg font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-100 sm:text-sm"
            >
              Setup
            </Link>
            <Link
              href="/channel/donald-huh"
              className="flex items-center text-lg font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-100 sm:text-sm"
            >
              Watch
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            <Link
              href="https://github.com/livekit-examples/livestream"
              target="_blank"
              rel="noreferrer"
            >
              <div
                className={buttonVariants({
                  size: "sm",
                  variant: "ghost",
                  className: "text-zinc-700 dark:text-zinc-400",
                })}
              >
                <Icons.gitHub className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </div>
            </Link>
            <Link
              href="https://twitter.com/livekitted"
              target="_blank"
              rel="noreferrer"
            >
              <div
                className={buttonVariants({
                  size: "sm",
                  variant: "ghost",
                  className: "text-zinc-700 dark:text-zinc-400",
                })}
              >
                <Icons.twitter className="h-5 w-5 fill-current" />
                <span className="sr-only">Twitter</span>
              </div>
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
}

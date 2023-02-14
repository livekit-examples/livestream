# LiveKit Livestreaming Demo

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flivekit-examples%2Flivestream&env=LIVEKIT_API_KEY,LIVEKIT_API_SECRET,LIVEKIT_API_URL,NEXT_PUBLIC_LIVEKIT_WS_URL&envDescription=Sign%20up%20for%20an%20account%20at%20https%3A%2F%2Fcloud.livekit.io%20and%20create%20an%20API%20key%20in%20the%20Project%20Settings%20UI)

<img width="1498" alt="Screenshot 2023-02-14 at 8 13 19 AM" src="https://user-images.githubusercontent.com/304392/218794329-94641d24-461b-4c3d-b33e-0d2b3ef8fcc1.png" />

This is a demo app for livestreaming via RTMP using LiveKit. One user is a broadcaster who gets an RTMP URL for streaming (eg, via OBS). Other users can view their stream and chat.

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`. It leverages additional technologies:

- [Next.js](https://nextjs.org)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)
- [shadcn/ui](https://github.com/shadcn/ui)

## Running locally

Clone the repo and install dependencies:

```bash
git clone git@github.com:livekit-examples/livestream.git
cd livestream
npm install
```

Create a new LiveKit project at <https://cloud.livekit.io>. Then create a new key in your [project settings](https://cloud.livekit.io/projects/p_/settings/keys).

Create a new `.env.development` file and add your new API key and secret as well as your project's WebSocket URL (found at the top of <https://cloud.livekit.io>):

```
LIVEKIT_API_KEY=<your api key>
LIVEKIT_API_SECRET=<your api secret>
LIVEKIT_API_URL=https://<your-project>.livekit.cloud
NEXT_PUBLIC_LIVEKIT_WS_URL=wss://<your-project>.livekit.cloud
```

Then run the development server:

```bash
npm run dev
```

You can test it by opening <http://localhost:3000> in a browser.

## Deploying for production

This project is a Next.js app. Refer to the [Next.js deployment documentation](https://nextjs.org/docs/deployment) for production deployment.

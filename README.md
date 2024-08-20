# Livestream with LiveKit

> [!TIP]
> Try a live demo here 👉 [livestream.livekit.io](https://livestream.livekit.io)

Today most livestreams experience a 5–30 second lag, which is evident in the delay it takes for streamers to respond to chats. Those streams use HLS, which leverages existing CDNs by uploading 5–30 second video chunks, which clients download one chunk at a time. HLS is hugely scalable, but it comes with latency.

LiveKit is a sort of WebRTC CDN, achieving sub-100ms latency for audiences of 1000 or 100,000 by streaming video over backbone Internet connections and only going over the public Internet for the last mile (that is, delivery to connected clients). This enables true real-time, large-scale events, where anyone and everyone can participate.

Built with [Next.js](https://nextjs.org/), [LiveKit Cloud](https://livekit.io/cloud), and [Radix UI](https://www.radix-ui.com/), this app is a full-stack web application that serves as a browser frontend application and as the backend API server for the clients. As a streamer, you can pick from broadcasting from either the browser via camera and microphone or from [OBS Studio](https://obsproject.com/) using an [LiveKit Ingress](https://livekit.io/product/ingress) endpoint. The application also features the ability to summon viewers from the audience onto the stage similar to X Spaces and Clubhouse.

## Getting Started

Clone the repo and install dependencies:

```
git clone git@github.com:livekit-examples/livestream.git
cd nextjs-livestream
npm install
```

Create a new LiveKit project at [https://cloud.livekit.io](). Then create a new key in your [project settings](). With the provided credentials, create a new .env.development file and fill out the values below:

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
LIVEKIT_WS_URL=<websocket URL starting with wss://>
LIVEKIT_API_KEY=<api key>
LIVEKIT_API_SECRET=<api secret>
```

Then run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

You can test it by opening [http://localhost:3000](http://localhost:3000) in a browser.

## Deploy on Vercel

This demo is a Next.js app. You can deploy to your Vercel account with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flivekit-examples%2Fnextjs-livestream&env=NEXT_PUBLIC_SITE_URL,LIVEKIT_WS_URL,LIVEKIT_API_KEY,LIVEKIT_API_SECRET)

Refer to the [the Next.js deployment documentation](https://nextjs.org/docs/deployment) for more about deploying to a production environment.

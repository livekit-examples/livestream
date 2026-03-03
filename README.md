# Bonsai Teleop

A web-based teleoperation interface for remotely controlling robots over [LiveKit](https://livekit.io/) data tracks. Operators connect to a robot's LiveKit room and send real-time control commands with sub-100ms latency.

Built with [Next.js](https://nextjs.org/), [LiveKit Cloud](https://livekit.io/cloud), and [Radix UI](https://www.radix-ui.com/).

## Getting Started

### Prerequisites

- Node.js >= 18.17.0

### Environment Variables

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env.local
```

The app requires three environment variables:

| Variable | Description |
|---|---|
| `LIVEKIT_API_KEY` | LiveKit project API key |
| `LIVEKIT_API_SECRET` | LiveKit project API secret |
| `LIVEKIT_WS_URL` | LiveKit WebSocket URL (e.g. `wss://<subdomain>.livekit.cloud`) |

To obtain credentials, contact **Gui De Moura Araujo**.

### Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter a robot name and operator name, and connect.

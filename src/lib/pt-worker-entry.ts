// Worker entry. Webpack/Next.js bundles this file as a Web Worker chunk
// when it's referenced via `new Worker(new URL('./pt-worker-entry.ts',
// import.meta.url))`. The import side-effect runs livekit-client's
// packet-trailer worker module in worker scope, which exposes the
// message handlers the SDK's `PacketTrailerManager` posts to.
//
// We need the wrapper because Webpack's `new URL(packageName, ...)`
// resolution is unreliable for worker URLs sourced from node_modules;
// a wrapper file in our own src/ uses standard relative-URL semantics.

import "livekit-client/packet-trailer-worker";

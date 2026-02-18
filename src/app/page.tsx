"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [robotName, setRobotName] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const router = useRouter();

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!robotName.trim() || !operatorName.trim()) return;
    router.push(
      `/teleop/${encodeURIComponent(robotName.trim())}?identity=${encodeURIComponent(operatorName.trim())}`
    );
  };

  const ready = robotName.trim() && operatorName.trim();

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-8"
      style={{ background: "#eef2f7" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          background: "#ffffff",
          boxShadow:
            "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)",
        }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{ width: 48, height: 48, background: "#3b82f6" }}
          >
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 1L2 5v6l6 4 6-4V5L8 1z"
                stroke="#fff"
                strokeWidth="1.5"
                strokeLinejoin="round"
                fill="none"
              />
              <circle cx="8" cy="8" r="2" fill="#fff" />
            </svg>
          </div>
        </div>

        <h1
          className="text-xl font-semibold text-center mb-1"
          style={{ color: "#1e293b" }}
        >
          Teleop Control
        </h1>
        <p
          className="text-center mb-6"
          style={{ color: "#94a3b8", fontSize: 13 }}
        >
          Connect to a robot&apos;s LiveKit room
        </p>

        <form onSubmit={handleConnect} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="robot-name"
              className="block text-xs font-medium mb-1.5"
              style={{ color: "#64748b" }}
            >
              Robot Name
            </label>
            <input
              id="robot-name"
              type="text"
              value={robotName}
              onChange={(e) => setRobotName(e.target.value)}
              placeholder="e.g. amiga-001"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                color: "#1e293b",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#93c5fd")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="operator-name"
              className="block text-xs font-medium mb-1.5"
              style={{ color: "#64748b" }}
            >
              Operator Name
            </label>
            <input
              id="operator-name"
              type="text"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              placeholder="e.g. operator@bonsai.ai"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                color: "#1e293b",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#93c5fd")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>

          <button
            type="submit"
            disabled={!ready}
            className="w-full py-2.5 text-white rounded-lg font-medium text-sm transition-all"
            style={{
              background: ready
                ? "linear-gradient(to bottom, #3b82f6, #2563eb)"
                : "#e2e8f0",
              color: ready ? "#ffffff" : "#94a3b8",
              boxShadow: ready
                ? "0 1px 2px rgba(37,99,235,0.3)"
                : "none",
              cursor: ready ? "pointer" : "not-allowed",
            }}
          >
            Connect
          </button>
        </form>
      </div>
    </main>
  );
}

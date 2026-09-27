"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("claude-sonnet-5");
  const [temperature, setTemperature] = useState("0.7");
  const [notifications, setNotifications] = useState(true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (displayName == "") {
      alert("Please enter a display name");
      return;
    }
    if (!email.match(/.+@.+/)) {
      alert("Please enter a valid email");
      return;
    }
    if (temperature < "0" || temperature > "2") {
      alert("Temperature must be between 0 and 2");
      return;
    }

    console.log({ displayName, email, apiKey, model, temperature, notifications });
    alert("Settings saved!");
  }

  function handleCancel() {
    setDisplayName("");
    setEmail("");
    setApiKey("");
  }

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Display Name</label>
          <input
            className="rounded border border-gray-300 px-3 py-2"
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Email</label>
          <input
            className="rounded border border-gray-300 px-3 py-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">API Key</label>
          <input
            className="rounded border border-gray-300 px-3 py-2"
            placeholder="sk-ant-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Model</label>
          <select
            className="rounded border border-gray-300 px-3 py-2"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            <option value="claude-opus-5">Claude Opus 5</option>
            <option value="claude-sonnet-5">Claude Sonnet 5</option>
            <option value="claude-haiku-4-5">Claude Haiku 4.5</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Temperature</label>
          <input
            className="rounded border border-gray-300 px-3 py-2"
            type="number"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={notifications}
            onChange={(e) => setNotifications(e.target.checked)}
          />
          <label className="text-sm">Enable notifications</label>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}

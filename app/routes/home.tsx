import { useState } from "react";
import type { Route } from "./+types/home";

export default function Home() {
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  return (
    <div>
      <button
        onClick={() => {
          const controller = new AbortController();

          fetch("/stream", {
            signal: controller.signal,
          });

          setAbortController(controller);
        }}
      >
        Stream
      </button>
      {abortController && (
        <button onClick={() => abortController.abort()}>Abort</button>
      )}
    </div>
  );
}

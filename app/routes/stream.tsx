import type { Route } from ".react-router/types/app/routes/+types/stream";
import { Chunk, Effect, Schedule, Scope, Stream } from "effect";
import { ByteLengthQueuingStrategy } from "node:stream/web";

const createEventStream = (signal: AbortSignal) => {
  const textEncoder = new TextEncoder();
  const streamAbortController = new AbortController();

  let readableStreamController: ReadableStreamDefaultController | undefined;
  let closed = false;

  const close = () => {
    if (closed) {
      return;
    }

    closed = true;

    readableStreamController?.close();

    streamAbortController.abort();
  };

  const stream = new ReadableStream({
    cancel: () => {
      close();
    },
    start: (ctrl) => {
      readableStreamController = ctrl;

      if (signal.aborted) {
        close();

        return;
      }

      signal.addEventListener(
        "abort",
        () => {
          close();
        },
        { signal: streamAbortController.signal }
      );
    },
  });

  const send = ({ data, event }: { data: string; event: string }) => {
    if (closed || !readableStreamController) {
      return;
    }

    const chunk = `event: ${event}\ndata:${data}\n\n`;

    readableStreamController.enqueue(textEncoder.encode(chunk));
  };

  return {
    get closed() {
      return closed;
    },
    complete: close,
    response: new Response(stream, {
      headers: {
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream",
      },
    }),
    send,
  };
};

export const loader = ({ request }: Route.LoaderArgs) => {
  return Effect.runPromise(
    Effect.gen(function* () {
      const stream = Stream.fromSchedule(Schedule.spaced("100 millis")).pipe(
        Stream.take(1000)
      );

      const value = yield* stream.pipe(
        Stream.tap(Effect.log),
        Stream.buffer({ capacity: "unbounded" }),
        Stream.toReadableStreamEffect()
      );

      return new Response(value, {
        headers: {
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Content-Type": "text/event-stream",
        },
      });
    }).pipe(Effect.scoped)
  );
};

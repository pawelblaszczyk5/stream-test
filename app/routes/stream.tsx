import type { Route } from ".react-router/types/app/routes/+types/stream";
import { faker } from "@faker-js/faker";
import { Effect, Schedule, Sink, Stream } from "effect";

export const loader = ({ request }: Route.LoaderArgs) => {
  return Effect.runPromise(
    Effect.gen(function* () {
      const stream = Stream.fromSchedule(Schedule.spaced("1 millis")).pipe(
        Stream.take(10_00),
        Stream.map((index) => ({
          id: crypto.randomUUID(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          middleName: faker.person.middleName(),
          bio: faker.person.bio(),
          sex: faker.person.sex(),
          index,
        }))
      );

      Stream.toPull;

      const value = yield* stream.pipe(
        Stream.tap(Effect.log),
        Stream.map(
          (person) => `event: person\ndata:${JSON.stringify(person)}\n\n`
        ),
        Stream.toReadableStreamEffect()
      );

      return new Response(value, {
        headers: {
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Content-Type": "text/event-stream",
        },
      });
    })
  );
};

if (import.meta.env.SSR) {
  Effect.gen(function* () {
    const memoryUsage = process.memoryUsage();

    yield* Effect.log(
      `Heap used: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`
    );

    yield* Effect.log(`RSS: ${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`);
  }).pipe(Effect.schedule(Schedule.spaced("5 seconds")), Effect.runPromise);
}

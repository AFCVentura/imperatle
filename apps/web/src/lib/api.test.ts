import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiStatusError, DailyNotFinishedError, getPracticePool, getPracticeSession, PerkLockedError, startPractice } from "./api";
import type { PracticeOptions } from "./types";

const options: PracticeOptions = { difficulty: "Any", attempts: 7, hints: true, map: "Progressive", eras: [], continents: [], adaptiveHints: true, guessOutlines: true };

const fetchMock = vi.fn();

function respond(status: number, body?: unknown) {
  fetchMock.mockResolvedValueOnce(new Response(body === undefined ? null : JSON.stringify(body), { status }));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("practice refusals", () => {
  it("tells a non-supporter (403) from a supporter whose daily game isn't over (409)", async () => {
    respond(403);
    await expect(getPracticePool(options)).rejects.toBeInstanceOf(PerkLockedError);

    respond(409, { code: "daily_not_finished" });
    await expect(getPracticePool(options)).rejects.toBeInstanceOf(DailyNotFinishedError);

    respond(409, { code: "daily_not_finished" });
    await expect(startPractice(options)).rejects.toBeInstanceOf(DailyNotFinishedError);

    respond(409, { code: "daily_not_finished" });
    await expect(getPracticeSession("abc")).rejects.toBeInstanceOf(DailyNotFinishedError);
  });

  it("keeps any other 409 a plain status error", async () => {
    respond(409, { code: "guess_conflict" });
    await expect(getPracticePool(options)).rejects.toBeInstanceOf(ApiStatusError);

    respond(409);
    await expect(getPracticePool(options)).rejects.toBeInstanceOf(ApiStatusError);
  });

  it("still reads the pool count once practice is open", async () => {
    respond(200, { count: 12 });
    expect(await getPracticePool(options)).toBe(12);
  });

  it("sends several eras and continents as repeated keys", async () => {
    respond(200, { count: 3 });
    await getPracticePool({ ...options, eras: [0, 2], continents: [1] });
    const query = new URL(String(fetchMock.mock.calls[0][0]), "http://test").searchParams;
    expect(query.getAll("eras")).toEqual(["0", "2"]);
    expect(query.getAll("continents")).toEqual(["1"]);
  });
});

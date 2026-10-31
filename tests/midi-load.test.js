import { describe, it, expect, vi, afterEach } from "vitest";
import { MidiPlayer } from "../packages/core/src/midi.js";

afterEach(() => vi.unstubAllGlobals());

describe("MidiPlayer.load — a redirect is not followed", () => {
  it("fetches the URL with redirect: 'error'", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    await new MidiPlayer().load("/media/song.mid").catch(() => {});

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/media/song.mid");
    expect(options).toEqual(expect.objectContaining({ redirect: "error" }));
  });

  it("a redirect rejects the fetch: the player emits 'error' and load() rejects", async () => {
    const failure = new TypeError("Failed to fetch");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(failure));
    const player = new MidiPlayer();
    const onError = vi.fn();
    player.on("error", onError);

    await expect(player.load("/media/redirects.mid")).rejects.toBe(failure);

    expect(onError).toHaveBeenCalledWith(failure);
  });
});

import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { scores, settings } from "@/lib/db/schema";
import { fetchSongs, buildSongMap, detectCurrentVersion } from "@/lib/song-db";
import { computeRating } from "@/lib/rating";
import { generateB50Image } from "@/lib/b50-image";
import { segaLogin, saveSetting } from "@/lib/maimai-sync";
import type { Score, Difficulty, Region } from "@/lib/types";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";
// Give the function up to 60s — login + jacket fetching can be slow
export const maxDuration = 60;

export async function GET(_req: NextRequest) {
  try {
    const [songs, dbScores, settingRows] = await Promise.all([
      fetchSongs(),
      db.select().from(scores).orderBy(desc(scores.playedAt)),
      db.select().from(settings),
    ]);

    const getSet = (k: string) => settingRows.find((r) => r.key === k)?.value ?? null;

    const songMap = buildSongMap(songs);
    const versionStr = getSet("maimai_version");
    const currentVersion = versionStr
      ? parseInt(versionStr, 10)
      : detectCurrentVersion(songs);

    const typedScores: Score[] = dbScores.map((s) => ({
      id: s.id,
      songTitle: s.songTitle,
      difficulty: s.difficulty as Difficulty,
      songType: (s.songType ?? "DX") as Score["songType"],
      achievement: parseFloat(s.achievement as string),
      dxScore: s.dxScore,
      fc: s.fc as Score["fc"],
      fs: s.fs as Score["fs"],
      playedAt: s.playedAt,
    }));

    const ratingData = computeRating(typedScores, songMap, currentVersion);

    if (ratingData.newCharts.length === 0 && ratingData.oldCharts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No scores synced yet. Please sync first." }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    const profile = {
      name:   getSet("profile_name"),
      avatar: getSet("profile_avatar"),
      rating: getSet("profile_rating"),
    };

    const region = (getSet("maimai_region") ?? "intl") as Region;

    // Resolve session token — same logic as syncFromMaimaiNet:
    //  1. Use stored clal if present
    //  2. Otherwise log in fresh with sega_id + sega_password and cache the result
    let token = getSet("maimai_clal") ?? "";
    if (!token) {
      const segaId  = getSet("maimai_sega_id");
      const segaPass = getSet("maimai_sega_password");
      if (!segaId || !segaPass) {
        return new Response(
          JSON.stringify({ error: "No session cookie or login credentials saved. Please sync at least once first." }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }
      token = await segaLogin(region, segaId, segaPass);
      await saveSetting("maimai_clal", token);
    }

    const pngBuffer = await generateB50Image({ ratingData, profile, token, region });

    return new Response(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        "Content-Type":  "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[b50-image] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

# moimoi

A personal score tracker for maimai DX: it collects a player's scores from SEGA's maimai DX NET and their own manual entries, and turns them into ratings, the B50 and practice guidance.

## Songs and charts

**Song**:
A piece of music in the game, published with one or two chart sets (DX and STD).
_Avoid_: track (a track is one song played within a credit)

**Chart**:
One playable sheet of a song: the song, its type (DX or STD) and its difficulty (BAS, ADV, EXP, MAS, REMAS or UTAGE).
_Avoid_: sheet, level, song (when the difficulty matters)

**Utage chart**:
A chart at the UTAGE difficulty: a novelty chart with no chart constant, so it never counts toward rating.
_Avoid_: event chart

**Chart identity**:
What makes two references point at the same chart: the song's normalised title, the type (DX when not stated) and the difficulty. Two different songs can share a title; that is a known collision, not a different identity.
_Avoid_: chart key, song key

**Chart constant**:
The precise difficulty number of a chart (e.g. 13.7) that rating is calculated from. It can be unknown; an unknown constant is never guessed for rating.
_Avoid_: internal level, chart level

**Displayed level**:
The level the game shows for a chart (e.g. "13+"), as published in the song data. Never derived from the chart constant.
_Avoid_: level (on its own)

**Estimated constant**:
A guess at a chart constant from its displayed level ("13+" is taken as 13.7), for charts whose constant is unknown. Used only to recommend charts, always shown as an estimate, and never used for rating.
_Avoid_: constant (on its own), fallback level

## Plays and bests

**Play**:
One attempt at a chart, with its achievement, DX score and FC/FS marks. Comes from SEGA's play history or from manual entry.
_Avoid_: score (for a single attempt), record

**Credit**:
One coin's worth of play: up to four tracks in a row. A credit ends at track 1, or when 20 minutes pass without a play.
_Avoid_: game, set

**Session**:
The credits of one visit to the arcade: credits no more than 20 minutes apart. Its new personal bests are the plays that set a chart's current best, and its rating gain is the rating now minus the rating with those charts at their earlier best.
_Avoid_: cluster, visit (in code)

**SEGA snapshot**:
The best result SEGA's site reports for a chart at the time of a sync, independent of the plays we have seen.
_Avoid_: SEGA score, synced PB

**Personal best**:
A chart's best result across every SEGA snapshot and play. Each part (achievement, DX score, FC mark, FS mark) is its own best and may come from a different play, as on SEGA's site; no part ever goes down.
_Avoid_: PB score, top score, best play

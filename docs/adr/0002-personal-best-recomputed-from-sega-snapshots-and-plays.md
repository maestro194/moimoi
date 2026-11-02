# A personal best is recomputed from SEGA snapshots and plays

Each sync stores SEGA's best for every chart (the SEGA snapshot) separately from the plays we have seen, and a chart's personal best is always recomputed from its SEGA snapshot plus every play, each part (achievement, DX score, FC, FS) taking its own best as on SEGA's site. We only ever see SEGA's last 50 plays, so the stored best alone cannot be rebuilt after a manual play is deleted; never lowering a best on delete would keep wrong manual entries forever, and re-scraping SEGA on delete fails when SEGA is down.

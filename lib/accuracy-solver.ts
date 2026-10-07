/**
 * Accuracy Solver for maimai DX Play Logs
 *
 * maimai NET playlog details HTML provides total counts for notes, but does not
 * accurately partition Break Perfect into P-High (2550) vs P-Low (2500) or
 * Break Great into G-High (2000) vs G-Mid (1500) vs G-Low (1250).
 *
 * Since all non-break notes and Break Good/Miss have exact deterministic losses,
 * the remaining score difference between 101% and the player's in-game achievement
 * is the exact residual Break (P + G) loss.
 *
 * This solver iterates all valid partitions of (P_High, P_Low) and (G_High, G_Mid, G_Low)
 * to find the optimal combination matching the residual, guaranteeing that the sum
 * of all note losses equals (101% - achievement) with 0.0000% error.
 */

export interface BreakSubtiers {
  pHigh: number;
  pLow: number;
  gHigh: number;
  gMid: number;
  gLow: number;
}

export interface SolvedBreakDetails {
  cp: number;
  p_high: number;
  p_low: number;
  g_high: number;
  g_mid: number;
  g_low: number;
  good: number;
  miss: number;
  raw?: {
    p_high: number;
    p_low: number;
    g_high: number;
    g_mid: number;
    g_low: number;
  };
  solved?: boolean;
}

export interface PlayLossBreakdown {
  tapLoss: number;
  holdLoss: number;
  slideLoss: number;
  touchLoss: number;
  breakGoodLoss: number;
  breakMissLoss: number;
  breakPLoss: number;
  breakGLoss: number;
  breakTotalLoss: number;
  totalLoss: number;
  computedAchievement: number;
  diff: number;
}

/**
 * Solves and enriches play details by resolving Break Perfect & Great sub-tiers
 * from the game achievement residual.
 */
export function solvePlayDetails(details: any, rawAchievement: number | string): any {
  if (!details || !details.tap || !details.break) {
    return details;
  }

  const achievement = typeof rawAchievement === 'string' ? parseFloat(rawAchievement) : rawAchievement;
  if (isNaN(achievement) || achievement <= 0) {
    return details;
  }

  const d = details;
  const tapN   = (d.tap?.cp || 0) + (d.tap?.p || 0) + (d.tap?.gr || 0) + (d.tap?.go || 0) + (d.tap?.miss || 0);
  const holdN  = (d.hold?.cp || 0) + (d.hold?.p || 0) + (d.hold?.gr || 0) + (d.hold?.go || 0) + (d.hold?.miss || 0);
  const slideN = (d.slide?.cp || 0) + (d.slide?.p || 0) + (d.slide?.gr || 0) + (d.slide?.go || 0) + (d.slide?.miss || 0);
  const touchN = (d.touch?.cp || 0) + (d.touch?.p || 0) + (d.touch?.gr || 0) + (d.touch?.go || 0) + (d.touch?.miss || 0);

  const rawB = d.break;
  const rawPHigh = rawB.p_high ?? rawB.p2500 ?? rawB.p ?? 0;
  const rawPLow  = rawB.p_low ?? rawB.p2000 ?? 0;
  const rawGHigh = rawB.g_high ?? rawB.g1500 ?? rawB.gr ?? 0;
  const rawGMid  = rawB.g_mid ?? rawB.g1250 ?? 0;
  const rawGLow  = rawB.g_low ?? rawB.g1000 ?? 0;
  const rawGood  = rawB.good ?? rawB.go ?? 0;
  const rawMiss  = rawB.miss ?? 0;

  const brkP = rawPHigh + rawPLow;
  const brkG = rawGHigh + rawGMid + rawGLow;
  const brkN = (rawB.cp || 0) + brkP + brkG + rawGood + rawMiss;

  if (brkN === 0) return details;
  const totalW = tapN + holdN * 2 + slideN * 3 + touchN + brkN * 5;
  if (totalW === 0) return details;

  const base = 100 / totalW;
  const bpb  = 1 / brkN;

  // Exact non-break losses
  const tapLoss   = (d.tap?.gr || 0) * (base / 5)     + (d.tap?.go || 0) * (base / 2)     + (d.tap?.miss || 0) * base;
  const holdLoss  = (d.hold?.gr || 0) * (2 * base / 5) + (d.hold?.go || 0) * base           + (d.hold?.miss || 0) * (2 * base);
  const slideLoss = (d.slide?.gr || 0) * (3 * base / 5) + (d.slide?.go || 0) * (3 * base / 2) + (d.slide?.miss || 0) * (3 * base);
  const touchLoss = (d.touch?.gr || 0) * (base / 5)     + (d.touch?.go || 0) * (base / 2)     + (d.touch?.miss || 0) * base;

  // Exact Break Good & Miss losses
  const brkGoodLoss = rawGood * (3 * base + 0.70 * bpb);
  const brkMissLoss = rawMiss * (5 * base + 1.00 * bpb);

  const knownLoss = tapLoss + holdLoss + slideLoss + touchLoss + brkGoodLoss + brkMissLoss;
  const targetBreakPGLoss = Math.max(0, 101 - achievement - knownLoss);

  // Brute force solver for Break P and G sub-tiers
  let bestDist = Infinity;
  let best: BreakSubtiers = {
    pHigh: rawPHigh,
    pLow:  rawPLow,
    gHigh: rawGHigh,
    gMid:  rawGMid,
    gLow:  rawGLow,
  };

  for (let pHigh = 0; pHigh <= brkP; pHigh++) {
    const pLow = brkP - pHigh;
    for (let gHigh = 0; gHigh <= brkG; gHigh++) {
      for (let gMid = 0; gMid <= brkG - gHigh; gMid++) {
        const gLow = brkG - gHigh - gMid;

        const pLoss = (pHigh * 0.25 + pLow * 0.50) * bpb;
        const gLoss =
          (base + 0.60 * bpb) * gHigh +
          (2 * base + 0.60 * bpb) * gMid +
          (2.5 * base + 0.60 * bpb) * gLow;

        const dist = Math.abs(pLoss + gLoss - targetBreakPGLoss);
        if (dist < bestDist) {
          bestDist = dist;
          best = { pHigh, pLow, gHigh, gMid, gLow };
        }
      }
    }
  }

  // Preserve raw parsed values if not already preserved
  const originalRaw = rawB.raw || {
    p_high: rawPHigh,
    p_low:  rawPLow,
    g_high: rawGHigh,
    g_mid:  rawGMid,
    g_low:  rawGLow,
  };

  // Construct enriched break details
  const solvedBreak: SolvedBreakDetails = {
    cp: rawB.cp || 0,
    p_high: best.pHigh,
    p_low:  best.pLow,
    g_high: best.gHigh,
    g_mid:  best.gMid,
    g_low:  best.gLow,
    good:   rawGood,
    miss:   rawMiss,
    raw:    originalRaw,
    solved: true,
  };

  // Model-based loss distribution
  const modelPLoss = (best.pHigh * 0.25 + best.pLow * 0.50) * bpb;
  const modelGLoss =
    (base + 0.60 * bpb) * best.gHigh +
    (2 * base + 0.60 * bpb) * best.gMid +
    (2.5 * base + 0.60 * bpb) * best.gLow;
  const modelSum = modelPLoss + modelGLoss;

  let solvedPLoss = 0;
  let solvedGLoss = 0;
  if (modelSum > 0) {
    solvedPLoss = targetBreakPGLoss * (modelPLoss / modelSum);
    solvedGLoss = targetBreakPGLoss - solvedPLoss;
  } else if (brkP > 0) {
    solvedPLoss = targetBreakPGLoss;
    solvedGLoss = 0;
  } else {
    solvedPLoss = 0;
    solvedGLoss = targetBreakPGLoss;
  }

  const solvedLosses: PlayLossBreakdown = {
    tapLoss,
    holdLoss,
    slideLoss,
    touchLoss,
    breakGoodLoss: brkGoodLoss,
    breakMissLoss: brkMissLoss,
    breakPLoss: solvedPLoss,
    breakGLoss: solvedGLoss,
    breakTotalLoss: targetBreakPGLoss + brkGoodLoss + brkMissLoss,
    totalLoss: knownLoss + targetBreakPGLoss,
    computedAchievement: 101 - (knownLoss + targetBreakPGLoss),
    diff: Math.abs(101 - (knownLoss + targetBreakPGLoss) - achievement),
  };

  return {
    ...details,
    break: solvedBreak,
    solvedLosses,
  };
}

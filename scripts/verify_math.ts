import * as fs from "fs";
import * as path from "path";
import {
  computeRrgMetrics,
  WEEKLY_RRG_CONFIG,
  DAILY_RRG_CONFIG,
} from "../worker/src/rrg_engine.js";

function verifyMath() {
  const refPath = path.resolve("scripts/ref_data.json");
  if (!fs.existsSync(refPath)) {
    console.error(`Reference file ${refPath} not found. Run generate_ref_data.py first.`);
    process.exit(1);
  }

  const refData = JSON.parse(fs.readFileSync(refPath, "utf-8"));
  console.log(`Loaded reference dataset with ${refData.dates.length} dates and ${refData.sectors.length} sectors.`);

  let globalMismatches = 0;
  let globalMaxDiffRatio = 0;
  let globalMaxDiffMom = 0;

  // 1. VERIFY WEEKLY COMPUTATIONS
  console.log("\n==========================================");
  console.log(" 1. VERIFYING WEEKLY COMPUTATIONS (UNSMOOTHED)");
  console.log("==========================================");

  const weeklyResult = computeRrgMetrics(refData.dates, refData.prices, {
    ...WEEKLY_RRG_CONFIG,
    benchmark: refData.benchmark,
    sectors: refData.sectors,
  });

  let weeklyRatioCount = 0;
  let weeklyMomCount = 0;

  for (const sector of refData.sectors) {
    const pyRatio: (number | null)[] = refData.weekly.expected_rs_ratio[sector];
    const pyMom: (number | null)[] = refData.weekly.expected_rs_momentum[sector];

    let sectorMaxRatioDiff = 0;
    let sectorMaxMomDiff = 0;

    for (let i = 0; i < refData.dates.length; i++) {
      const date = refData.dates[i];
      const pR = pyRatio[i];
      const pM = pyMom[i];

      const tsIdx = weeklyResult.dates.indexOf(date);
      if (tsIdx === -1) continue;

      const tR = weeklyResult.metrics[sector].rsRatio[tsIdx];
      const tM = weeklyResult.metrics[sector].rsMomentum[tsIdx];

      if (pR !== null && pR !== undefined && tR !== null) {
        const diff = Math.abs(pR - tR);
        if (diff > sectorMaxRatioDiff) sectorMaxRatioDiff = diff;
        if (diff > globalMaxDiffRatio) globalMaxDiffRatio = diff;
        weeklyRatioCount++;
      } else if ((pR === null) !== (tR === null)) {
        console.error(`[WEEKLY MISMATCH] ${sector} RS-Ratio @ ${date}: Py=${pR}, TS=${tR}`);
        globalMismatches++;
      }

      if (pM !== null && pM !== undefined && tM !== null) {
        const diff = Math.abs(pM - tM);
        if (diff > sectorMaxMomDiff) sectorMaxMomDiff = diff;
        if (diff > globalMaxDiffMom) globalMaxDiffMom = diff;
        weeklyMomCount++;
      } else if ((pM === null) !== (tM === null)) {
        console.error(`[WEEKLY MISMATCH] ${sector} RS-Mom @ ${date}: Py=${pM}, TS=${tM}`);
        globalMismatches++;
      }
    }

    console.log(
      `Weekly Sector ${sector.padEnd(12)} -> Max RS-Ratio diff: ${sectorMaxRatioDiff.toExponential(4)}, Max RS-Mom diff: ${sectorMaxMomDiff.toExponential(4)}`
    );
  }

  // 2. VERIFY DAILY COMPUTATIONS (20d RS EMA + 5d RS-Mom EMA)
  console.log("\n==========================================");
  console.log(" 2. VERIFYING DAILY COMPUTATIONS (20d RS EMA + 5d MOM EMA)");
  console.log("==========================================");

  const dailyResult = computeRrgMetrics(refData.dates, refData.prices, {
    ...DAILY_RRG_CONFIG,
    benchmark: refData.benchmark,
    sectors: refData.sectors,
  });

  let dailyRatioCount = 0;
  let dailyMomCount = 0;

  for (const sector of refData.sectors) {
    const pyRatio: (number | null)[] = refData.daily.expected_rs_ratio[sector];
    const pyMom: (number | null)[] = refData.daily.expected_rs_momentum[sector];

    let sectorMaxRatioDiff = 0;
    let sectorMaxMomDiff = 0;

    for (let i = 0; i < refData.dates.length; i++) {
      const date = refData.dates[i];
      const pR = pyRatio[i];
      const pM = pyMom[i];

      const tsIdx = dailyResult.dates.indexOf(date);
      if (tsIdx === -1) continue;

      const tR = dailyResult.metrics[sector].rsRatio[tsIdx];
      const tM = dailyResult.metrics[sector].rsMomentum[tsIdx];

      if (pR !== null && pR !== undefined && tR !== null) {
        const diff = Math.abs(pR - tR);
        if (diff > sectorMaxRatioDiff) sectorMaxRatioDiff = diff;
        if (diff > globalMaxDiffRatio) globalMaxDiffRatio = diff;
        dailyRatioCount++;
      } else if ((pR === null) !== (tR === null)) {
        console.error(`[DAILY MISMATCH] ${sector} RS-Ratio @ ${date}: Py=${pR}, TS=${tR}`);
        globalMismatches++;
      }

      if (pM !== null && pM !== undefined && tM !== null) {
        const diff = Math.abs(pM - tM);
        if (diff > sectorMaxMomDiff) sectorMaxMomDiff = diff;
        if (diff > globalMaxDiffMom) globalMaxDiffMom = diff;
        dailyMomCount++;
      } else if ((pM === null) !== (tM === null)) {
        console.error(`[DAILY MISMATCH] ${sector} RS-Mom @ ${date}: Py=${pM}, TS=${tM}`);
        globalMismatches++;
      }
    }

    console.log(
      `Daily Sector ${sector.padEnd(12)} -> Max RS-Ratio diff: ${sectorMaxRatioDiff.toExponential(4)}, Max RS-Mom diff: ${sectorMaxMomDiff.toExponential(4)}`
    );
  }

  console.log("\n--- SUMMARY RESULTS ---");
  console.log(`Weekly Data Points Verified: RS-Ratio=${weeklyRatioCount}, RS-Mom=${weeklyMomCount}`);
  console.log(`Daily Data Points Verified:  RS-Ratio=${dailyRatioCount}, RS-Mom=${dailyMomCount}`);
  console.log(`Max RS-Ratio Absolute Error: ${globalMaxDiffRatio.toExponential(6)}`);
  console.log(`Max RS-Momentum Absolute Error: ${globalMaxDiffMom.toExponential(6)}`);
  console.log(`Null/NaN structure mismatches: ${globalMismatches}`);

  const TOLERANCE = 1e-6;
  if (globalMismatches === 0 && globalMaxDiffRatio < TOLERANCE && globalMaxDiffMom < TOLERANCE) {
    console.log("\nPHASE 1.3 MATHEMATICAL VERIFICATION: SUCCESS (MATCHES TO 6+ DECIMAL PLACES FOR BOTH WEEKLY AND DAILY)");
    process.exit(0);
  } else {
    console.error("\nPHASE 1.3 MATHEMATICAL VERIFICATION: FAILED");
    process.exit(1);
  }
}

verifyMath();

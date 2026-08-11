import * as fs from "fs";
import * as path from "path";
import { computeRrgMetrics, DEFAULT_CONFIG } from "../worker/src/rrg_engine.js";

function verifyMath() {
  const refPath = path.resolve("scripts/ref_data.json");
  if (!fs.existsSync(refPath)) {
    console.error(`Reference file ${refPath} not found. Run generate_ref_data.py first.`);
    process.exit(1);
  }

  const refData = JSON.parse(fs.readFileSync(refPath, "utf-8"));
  console.log(`Loaded reference dataset with ${refData.dates.length} dates and ${refData.sectors.length} sectors.`);

  const tsResult = computeRrgMetrics(refData.dates, refData.prices, {
    ...DEFAULT_CONFIG,
    benchmark: refData.benchmark,
    sectors: refData.sectors,
  });

  let maxDiffRatio = 0;
  let maxDiffMom = 0;
  let totalComparedRatio = 0;
  let totalComparedMom = 0;
  let mismatches = 0;

  console.log("\n--- COMPARING PYTHON VS TYPESCRIPT COMPUTATIONS ---");

  for (const sector of refData.sectors) {
    const pyRatio: (number | null)[] = refData.expected_rs_ratio[sector];
    const pyMom: (number | null)[] = refData.expected_rs_momentum[sector];

    const tsRatio = tsResult.metrics[sector].rsRatio;
    const tsMom = tsResult.metrics[sector].rsMomentum;

    let sectorMaxRatioDiff = 0;
    let sectorMaxMomDiff = 0;

    for (let i = 0; i < refData.dates.length; i++) {
      const date = refData.dates[i];
      const pR = pyRatio[i];
      const tR = tsRatio[i];

      // Compare RS-Ratio
      if (pR === null || pR === undefined) {
        if (tR !== null) {
          console.error(`[MISMATCH] ${sector} RS-Ratio @ ${date}: Py is null, TS is ${tR}`);
          mismatches++;
        }
      } else {
        if (tR === null) {
          console.error(`[MISMATCH] ${sector} RS-Ratio @ ${date}: Py is ${pR}, TS is null`);
          mismatches++;
        } else {
          const diff = Math.abs(pR - tR);
          if (diff > sectorMaxRatioDiff) sectorMaxRatioDiff = diff;
          if (diff > maxDiffRatio) maxDiffRatio = diff;
          totalComparedRatio++;
        }
      }

      // Compare RS-Momentum
      if (pyMom[i] === null || pyMom[i] === undefined) {
        if (tsMom[i] !== null) {
          console.error(`[MISMATCH] ${sector} RS-Mom @ ${date}: Py is null, TS is ${tsMom[i]}`);
          mismatches++;
        }
      } else {
        if (tsMom[i] === null) {
          console.error(`[MISMATCH] ${sector} RS-Mom @ ${date}: Py is ${pyMom[i]}, TS is null`);
          mismatches++;
        } else {
          const diff = Math.abs(pyMom[i]! - tsMom[i]!);
          if (diff > sectorMaxMomDiff) sectorMaxMomDiff = diff;
          if (diff > maxDiffMom) maxDiffMom = diff;
          totalComparedMom++;
        }
      }
    }

    console.log(
      `Sector ${sector.padEnd(12)} -> Max RS-Ratio diff: ${sectorMaxRatioDiff.toExponential(4)}, Max RS-Mom diff: ${sectorMaxMomDiff.toExponential(4)}`
    );
  }

  console.log("\n--- SUMMARY RESULTS ---");
  console.log(`Total RS-Ratio data points verified: ${totalComparedRatio}`);
  console.log(`Total RS-Momentum data points verified: ${totalComparedMom}`);
  console.log(`Max RS-Ratio Absolute Error: ${maxDiffRatio.toExponential(6)}`);
  console.log(`Max RS-Momentum Absolute Error: ${maxDiffMom.toExponential(6)}`);
  console.log(`Null/NaN structure mismatches: ${mismatches}`);

  const TOLERANCE = 1e-6;
  if (mismatches === 0 && maxDiffRatio < TOLERANCE && maxDiffMom < TOLERANCE) {
    console.log("\nPHASE 1.3 MATHEMATICAL VERIFICATION: SUCCESS (MATCHES TO 6+ DECIMAL PLACES)");
    process.exit(0);
  } else {
    console.error("\nPHASE 1.3 MATHEMATICAL VERIFICATION: FAILED");
    process.exit(1);
  }
}

verifyMath();

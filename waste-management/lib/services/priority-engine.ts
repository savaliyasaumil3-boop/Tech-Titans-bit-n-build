import type { DbBin, DbPrediction, PriorityBin, PriorityCategory, RecommendedAction } from "../db-types";

// ─── Priority Scoring Engine ──────────────────────────────────────────────────
// Score 0-100 based on:
//  40% fill level
//  30% time to overflow
//  20% overflow probability
//  10% waste type urgency

const WASTE_TYPE_WEIGHTS: Record<string, number> = {
  "Organic": 1.15,   // Organic waste creates health hazards faster
  "E-Waste": 1.10,   // High environmental risk
  "Metal": 0.95,
  "Plastic": 1.0,
  "Paper": 0.9,
  "Glass": 0.85,
  "Other": 1.0,
};

export function calculatePriorityScore(
  fillPercentage: number,
  predictedFullHours: number,
  overflowProbability: number,
  wasteType: string
): number {
  // Fill component (0-40)
  const fillScore = (fillPercentage / 100) * 40;

  // Time component (0-30): bins about to overflow score high
  let timeScore: number;
  if (predictedFullHours <= 2) timeScore = 30;
  else if (predictedFullHours <= 6) timeScore = 24;
  else if (predictedFullHours <= 12) timeScore = 16;
  else if (predictedFullHours <= 24) timeScore = 8;
  else timeScore = Math.max(0, 4 - predictedFullHours / 10);

  // Overflow probability component (0-20)
  const probScore = overflowProbability * 20;

  // Waste type urgency (0-10)
  const wasteMultiplier = WASTE_TYPE_WEIGHTS[wasteType] ?? 1.0;
  const wasteScore = 5 * wasteMultiplier;

  const raw = fillScore + timeScore + probScore + wasteScore;
  return Math.min(100, Math.round(raw));
}

export function getPriorityCategory(score: number): PriorityCategory {
  if (score >= 80) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

export function getRecommendedAction(
  fillPercentage: number,
  predictedFullHours: number
): RecommendedAction {
  if (fillPercentage >= 90 || predictedFullHours <= 2) {
    return { action: "Collect immediately", urgency: "immediate", color: "text-red-600" };
  }
  if (fillPercentage >= 75 || predictedFullHours <= 6) {
    return { action: "Schedule collection within 6 hours", urgency: "soon", color: "text-amber-600" };
  }
  if (fillPercentage >= 50 || predictedFullHours <= 24) {
    return { action: "Monitor — schedule within 24 hours", urgency: "monitor", color: "text-yellow-600" };
  }
  return { action: "No immediate action required", urgency: "none", color: "text-green-600" };
}

export function buildPriorityBins(
  bins: DbBin[],
  predictions: DbPrediction[]
): PriorityBin[] {
  const predMap = new Map<string, DbPrediction>();
  for (const p of predictions) {
    if (!predMap.has(p.bin_id)) {
      predMap.set(p.bin_id, p);
    }
  }


  return bins.map((bin) => {
    const pred = predMap.get(bin.id);
    const overflowProb = pred?.overflow_probability ?? estimateOverflowProbability(bin.fill_percentage);
    const predictedHours = pred?.predicted_full_hours ?? bin.predicted_full_hours;

    const score = calculatePriorityScore(
      bin.fill_percentage,
      predictedHours,
      overflowProb,
      bin.waste_type
    );

    return {
      bin_id: bin.id,
      location_name: bin.location_name,
      priority_score: score,
      fill_percentage: bin.fill_percentage,
      predicted_full_hours: predictedHours,
      overflow_probability: overflowProb,
      status: bin.status,
      waste_type: bin.waste_type,
      category: getPriorityCategory(score),
      latitude: bin.latitude,
      longitude: bin.longitude,
    };
  }).sort((a, b) => b.priority_score - a.priority_score);
}

// ─── Fallback overflow probability when ML service is unavailable ─────────────
export function estimateOverflowProbability(fillPercentage: number): number {
  if (fillPercentage >= 95) return 0.95;
  if (fillPercentage >= 90) return 0.80 + (fillPercentage - 90) * 0.015;
  if (fillPercentage >= 75) return 0.35 + (fillPercentage - 75) * 0.030;
  if (fillPercentage >= 50) return 0.05 + (fillPercentage - 50) * 0.012;
  return fillPercentage * 0.001;
}

// ─── Fallback fill prediction when ML service is unavailable ─────────────────
export function fallbackPredictFullHours(
  fillPercentage: number,
  capacityKg: number,
  avgDailyGenerationKg = 15
): number {
  const remainingCapacityKg = capacityKg * (1 - fillPercentage / 100);
  const hourlyRate = avgDailyGenerationKg / 24;
  if (hourlyRate <= 0) return 48;
  return Math.round((remainingCapacityKg / hourlyRate) * 10) / 10;
}

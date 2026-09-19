import math
from typing import Dict, Any

WASTE_TYPE_WEIGHTS: Dict[str, float] = {
    "Organic": 1.15,   # Hazard/odor accelerates urgency
    "E-Waste": 1.10,   # High environmental risk
    "Metal": 0.95,
    "Plastic": 1.0,
    "Paper": 0.9,
    "Glass": 0.85,
    "Other": 1.0,
}

def estimate_overflow_probability(fill_percentage: float) -> float:
    """Estimates the probability of overflow within the next 6 hours."""
    if fill_percentage >= 95:
        return 0.95
    if fill_percentage >= 90:
        return round(0.80 + (fill_percentage - 90) * 0.015, 2)
    if fill_percentage >= 75:
        return round(0.35 + (fill_percentage - 75) * 0.030, 2)
    if fill_percentage >= 50:
        return round(0.05 + (fill_percentage - 50) * 0.012, 2)
    return round(fill_percentage * 0.001, 3)

def predict_fill_hours(fill_percentage: float, capacity_kg: float, avg_daily_generation_kg: float = 15.0) -> float:
    """Predicts hours until a bin reaches 100% capacity."""
    remaining_capacity_kg = capacity_kg * (1 - fill_percentage / 100)
    hourly_rate = avg_daily_generation_kg / 24.0
    if hourly_rate <= 0 or remaining_capacity_kg <= 0:
        return 0.5
    hours = remaining_capacity_kg / hourly_rate
    return round(max(0.5, hours), 1)

def calculate_priority_score(
    fill_percentage: float,
    predicted_full_hours: float,
    overflow_probability: float,
    waste_type: str
) -> int:
    """
    Priority Scoring Engine (0-100 scale):
      40% fill percentage
      30% time to overflow (lower hours = higher score)
      20% overflow probability
      10% waste type urgency
    """
    # 1. Fill component (0-40)
    fill_score = (fill_percentage / 100.0) * 40.0

    # 2. Time component (0-30)
    if predicted_full_hours <= 2:
        time_score = 30.0
    elif predicted_full_hours <= 6:
        time_score = 24.0
    elif predicted_full_hours <= 12:
        time_score = 16.0
    elif predicted_full_hours <= 24:
        time_score = 8.0
    else:
        time_score = max(0.0, 4.0 - predicted_full_hours / 10.0)

    # 3. Overflow probability component (0-20)
    prob_score = overflow_probability * 20.0

    # 4. Waste type urgency (0-10)
    multiplier = WASTE_TYPE_WEIGHTS.get(waste_type, 1.0)
    waste_score = 5.0 * multiplier

    raw = fill_score + time_score + prob_score + waste_score
    return min(100, max(0, round(raw)))

def get_priority_category(score: int) -> str:
    if score >= 80:
        return "critical"
    if score >= 50:
        return "high"
    if score >= 25:
        return "medium"
    return "low"

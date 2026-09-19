import math
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

WASTE_TYPE_WEIGHTS: Dict[str, float] = {
    "Organic": 1.15,   # Hazard/odor accelerates urgency
    "E-Waste": 1.10,   # High environmental risk
    "Metal": 0.95,
    "Plastic": 1.0,
    "Paper": 0.9,
    "Glass": 0.85,
    "Other": 1.0,
}

# Configurable Default Priority Weights (Must sum to 100)
DEFAULT_PRIORITY_WEIGHTS = {
    "w_fill": 40.0,       # 40% fill percentage weight
    "w_forecast": 30.0,   # 30% forecast urgency weight
    "w_risk": 15.0,       # 15% overflow risk score weight
    "w_waste_type": 10.0, # 10% waste category multiplier
    "w_service_age": 5.0  # 5% anti-starvation age boost
}

def estimate_overflow_risk_score(fill_percentage: float) -> float:
    """Estimates the uncalibrated overflow risk score (0-1.0 scale)."""
    if fill_percentage >= 100:
        return 1.0
    if fill_percentage >= 90:
        return round(0.80 + (fill_percentage - 90) * 0.02, 2)
    if fill_percentage >= 75:
        return round(0.35 + (fill_percentage - 75) * 0.03, 2)
    if fill_percentage >= 50:
        return round(0.05 + (fill_percentage - 50) * 0.012, 2)
    return round(fill_percentage * 0.001, 3)

# Backwards compatibility alias
estimate_overflow_probability = estimate_overflow_risk_score


def predict_fill_hours(fill_percentage: float, capacity_kg: float, avg_daily_generation_kg: float = 15.0) -> float:
    """Predicts hours until a bin reaches 100% capacity using baseline rate."""
    if fill_percentage >= 100:
        return 0.0
    remaining_capacity_kg = capacity_kg * (1 - fill_percentage / 100.0)
    hourly_rate = avg_daily_generation_kg / 24.0
    if hourly_rate <= 0:
        return 999.0 # Beyond planning horizon
    if remaining_capacity_kg <= 0:
        return 0.0
    hours = remaining_capacity_kg / hourly_rate
    return round(max(0.0, hours), 1)

def predict_fill_hours_from_history(
    fill_percentage: float,
    capacity_kg: float,
    observations: Optional[List[Dict[str, Any]]] = None,
    default_avg_daily_kg: float = 15.0
) -> Dict[str, Any]:
    """
    Predicts fill hours based on historical observation records if available,
    otherwise uses cold-start baseline rate estimator.
    """
    if fill_percentage >= 100:
        return {
            "predicted_full_hours": 0.0,
            "method": "full_capacity_reached",
            "daily_rate_kg": 0.0,
            "status": "full"
        }

    remaining_capacity_kg = capacity_kg * (1 - fill_percentage / 100.0)

    if observations and len(observations) >= 3:
        # Sort chronologically by observed_at
        valid_obs = [o for o in observations if o.get("fill_percentage") is not None]
        if len(valid_obs) >= 2:
            try:
                valid_obs.sort(key=lambda x: str(x.get("observed_at", "")))
                t_first = datetime.fromisoformat(str(valid_obs[0]["observed_at"]).replace("Z", "+00:00"))
                t_last = datetime.fromisoformat(str(valid_obs[-1]["observed_at"]).replace("Z", "+00:00"))
                delta_days = (t_last - t_first).total_seconds() / 86400.0
                delta_fill = valid_obs[-1]["fill_percentage"] - valid_obs[0]["fill_percentage"]
                
                if delta_days > 0.01 and delta_fill > 0:
                    daily_fill_rate = delta_fill / delta_days
                    daily_kg_rate = (daily_fill_rate / 100.0) * capacity_kg
                    hourly_fill_rate = daily_fill_rate / 24.0
                    
                    remaining_fill = 100.0 - fill_percentage
                    hours_rem = remaining_fill / hourly_fill_rate if hourly_fill_rate > 0 else 999.0
                    
                    return {
                        "predicted_full_hours": round(max(0.0, hours_rem), 1),
                        "method": "observation_time_series_trend",
                        "daily_rate_kg": round(daily_kg_rate, 2),
                        "sample_count": len(valid_obs),
                        "status": "forecasted"
                    }
                elif delta_fill <= 0:
                    return {
                        "predicted_full_hours": 999.0,
                        "method": "zero_growth_observation",
                        "daily_rate_kg": 0.0,
                        "status": "beyond_horizon"
                    }
            except Exception:
                pass

    # Cold-start baseline estimator fallback
    hourly_rate = default_avg_daily_kg / 24.0
    hours = remaining_capacity_kg / hourly_rate if hourly_rate > 0 else 999.0
    return {
        "predicted_full_hours": round(max(0.0, hours), 1),
        "method": "cold_start_rate_baseline",
        "daily_rate_kg": default_avg_daily_kg,
        "status": "estimated"
    }

def calculate_priority_score(
    fill_percentage: float,
    predicted_full_hours: float,
    overflow_risk_score: float,
    waste_type: str,
    last_collected_hours_ago: float = 0.0,
    custom_weights: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Explainable Priority & Anti-Starvation Scoring Engine (0-100 scale):
    Combines normalized weights with service-age boost and location sensitivity.
    """
    weights = custom_weights or DEFAULT_PRIORITY_WEIGHTS
    w_fill = weights.get("w_fill", 40.0)
    w_forecast = weights.get("w_forecast", 30.0)
    w_risk = weights.get("w_risk", 15.0)
    w_waste = weights.get("w_waste_type", 10.0)
    w_age = weights.get("w_service_age", 5.0)

    # 1. Fill component (0 - w_fill)
    fill_component = (min(100.0, fill_percentage) / 100.0) * w_fill

    # 2. Forecast Urgency component (0 - w_forecast)
    if predicted_full_hours <= 0:
        forecast_component = w_forecast
    elif predicted_full_hours <= 4:
        forecast_component = w_forecast * 0.90
    elif predicted_full_hours <= 12:
        forecast_component = w_forecast * 0.60
    elif predicted_full_hours <= 24:
        forecast_component = w_forecast * 0.30
    else:
        forecast_component = max(0.0, w_forecast * (1.0 - predicted_full_hours / 72.0))

    # 3. Overflow Risk Component (0 - w_risk)
    risk_component = min(1.0, max(0.0, overflow_risk_score)) * w_risk

    # 4. Waste Type Urgency Component (0 - w_waste)
    multiplier = WASTE_TYPE_WEIGHTS.get(waste_type, 1.0)
    waste_component = min(w_waste, (w_waste * 0.7) * multiplier)

    # 5. Service Age Anti-Starvation Boost (0 - w_age + bonus for > 72h)
    age_ratio = min(1.0, last_collected_hours_ago / 72.0)
    age_component = age_ratio * w_age
    if last_collected_hours_ago > 72.0:
        # Anti-starvation boost: add extra 5 points for long-neglected bins
        age_component += min(10.0, (last_collected_hours_ago - 72.0) / 24.0 * 2.0)

    total_score = min(100, max(0, round(fill_component + forecast_component + risk_component + waste_component + age_component)))

    return {
        "priority_score": total_score,
        "breakdown": {
            "fill_component": round(fill_component, 1),
            "forecast_component": round(forecast_component, 1),
            "risk_component": round(risk_component, 1),
            "waste_component": round(waste_component, 1),
            "age_component": round(age_component, 1)
        }
    }

def get_priority_category(score: int) -> str:
    if score >= 80:
        return "critical"
    if score >= 50:
        return "high"
    if score >= 25:
        return "medium"
    return "low"


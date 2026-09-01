from typing import Dict, Any


class ConfidenceManager:
    """
    Configurable Confidence Tier Engine for BhoomiSync AI Predictions.
    Classifies raw prediction probabilities into actionable operational tiers.
    """

    def __init__(
        self,
        high_threshold: float = 0.90,
        medium_threshold: float = 0.70,
    ):
        self.high_threshold = high_threshold
        self.medium_threshold = medium_threshold

    def evaluate_confidence(self, score: float) -> Dict[str, Any]:
        """
        Classifies confidence score into tier with UI styling and verification recommendation.
        """
        clamped = max(0.0, min(1.0, float(score)))

        if clamped >= self.high_threshold:
            tier = "HIGH"
            badge_color = "#10b981"  # Emerald
            action = "AUTO_ACCEPTED_CANDIDATE"
            description = "High statistical confidence. Candidate ready for surveyor confirmation."
        elif clamped >= self.medium_threshold:
            tier = "MEDIUM"
            badge_color = "#f59e0b"  # Amber
            action = "FLAGGED_FOR_MANUAL_INSPECTION"
            description = "Moderate confidence. Visual inspection by surveyor recommended."
        else:
            tier = "LOW"
            badge_color = "#ef4444"  # Red
            action = "REQUIRES_SURVEYOR_GROUND_TRUTHING"
            description = "Low confidence. High multi-sensor ambiguity; ground-truthing required."

        return {
            "score": round(clamped, 4),
            "percentage": round(clamped * 100.0, 2),
            "tier": tier,
            "badge_color": badge_color,
            "recommended_action": action,
            "description": description,
            "thresholds_used": {
                "high": self.high_threshold,
                "medium": self.medium_threshold,
            },
        }

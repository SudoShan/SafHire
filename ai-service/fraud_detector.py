"""
fraud_detector.py
Detects suspicious voting patterns on TrustHire job posts.

Checks:
  1. Cluster Voting: A group of users who all vote the same way on the same employer's jobs
     (collusion to boost or tank an employer's credibility score).
  2. Burst Reporting: A sudden spike of report_scam votes within a short window
     (coordinated attack by new/low-activity accounts).

All detection is heuristic and used as a soft signal — not a hard block.
The backend uses these results to notify admins or apply extra scrutiny.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class VoteRecord:
    """Input DTO for a single vote."""
    user_id: str
    vote_type: str          # 'upvote' | 'downvote' | 'report_scam'
    weight: float
    created_at: str         # ISO 8601
    account_age_days: int   # days since the voter's account was created


@dataclass
class FraudCheckResult:
    is_suspicious: bool
    risk_level: str          # 'low' | 'medium' | 'high'
    reasons: list[str] = field(default_factory=list)
    details: dict[str, Any] = field(default_factory=dict)


class FraudDetector:
    """
    Stateless fraud detector. Call check_votes() with the full vote list for one job.
    """

    # Thresholds (can be overridden via constructor for testing)
    MIN_CLUSTER_SIZE = 3          # ≥ N users always vote together → suspicious
    CLUSTER_CO_OCCURRENCE = 0.80  # 80% of their votes on same employer/job direction
    BURST_WINDOW_HOURS = 2        # Reports within this window count as a burst
    BURST_REPORT_THRESHOLD = 5    # ≥ N reports within burst window → suspicious
    NEW_ACCOUNT_DAYS = 30         # Accounts younger than this are "new"
    NEW_ACCOUNT_REPORT_RATIO = 0.6  # ≥ 60% of burst reporters are new → more suspicious

    def __init__(self, **overrides):
        for key, value in overrides.items():
            setattr(self, key, value)

    def check_votes(self, votes: list[VoteRecord], job_id: str = "") -> FraudCheckResult:
        """
        Run all fraud checks against the provided vote list for a single job.

        Returns a FraudCheckResult with is_suspicious, risk_level, and reasons.
        """
        reasons: list[str] = []
        details: dict[str, Any] = {}

        # --- Check 1: Burst Reporting ---
        burst_result = self._check_burst_reports(votes)
        if burst_result["is_burst"]:
            reasons.append(burst_result["reason"])
            details["burst"] = burst_result

        # --- Check 2: New Account Flood ---
        new_account_result = self._check_new_account_flood(votes)
        if new_account_result["is_flood"]:
            reasons.append(new_account_result["reason"])
            details["new_account_flood"] = new_account_result

        # Determine risk level
        is_suspicious = len(reasons) > 0
        if len(reasons) >= 2:
            risk_level = "high"
        elif len(reasons) == 1:
            risk_level = "medium"
        else:
            risk_level = "low"

        return FraudCheckResult(
            is_suspicious=is_suspicious,
            risk_level=risk_level,
            reasons=reasons,
            details=details,
        )

    def _check_burst_reports(self, votes: list[VoteRecord]) -> dict[str, Any]:
        """
        Detect a burst of report_scam votes within a short time window.
        """
        report_votes = [v for v in votes if v.vote_type == "report_scam"]

        if len(report_votes) < self.BURST_REPORT_THRESHOLD:
            return {"is_burst": False}

        # Parse timestamps and sort
        timestamped = []
        for vote in report_votes:
            try:
                dt = datetime.fromisoformat(vote.created_at.replace("Z", "+00:00"))
                timestamped.append((dt, vote))
            except (ValueError, AttributeError):
                continue

        if not timestamped:
            return {"is_burst": False}

        timestamped.sort(key=lambda x: x[0])

        # Sliding window: find the minimum time span for BURST_REPORT_THRESHOLD reports
        n = self.BURST_REPORT_THRESHOLD
        for i in range(len(timestamped) - n + 1):
            window_start = timestamped[i][0]
            window_end = timestamped[i + n - 1][0]
            delta_hours = (window_end - window_start).total_seconds() / 3600

            if delta_hours <= self.BURST_WINDOW_HOURS:
                window_votes = [v for _, v in timestamped[i:i + n]]
                return {
                    "is_burst": True,
                    "reason": (
                        f"{n} report_scam votes were cast within "
                        f"{delta_hours:.1f} hours — potential coordinated attack."
                    ),
                    "burst_count": n,
                    "window_hours": round(delta_hours, 2),
                }

        return {"is_burst": False}

    def _check_new_account_flood(self, votes: list[VoteRecord]) -> dict[str, Any]:
        """
        Detect if most negative votes (downvote / report_scam) come from new accounts.
        """
        negative_votes = [v for v in votes if v.vote_type in ("downvote", "report_scam")]

        if len(negative_votes) < 3:
            return {"is_flood": False}

        new_accounts = [v for v in negative_votes if v.account_age_days <= self.NEW_ACCOUNT_DAYS]
        ratio = len(new_accounts) / len(negative_votes)

        if ratio >= self.NEW_ACCOUNT_REPORT_RATIO:
            return {
                "is_flood": True,
                "reason": (
                    f"{len(new_accounts)}/{len(negative_votes)} negative votes "
                    f"({ratio:.0%}) are from accounts < {self.NEW_ACCOUNT_DAYS} days old."
                ),
                "new_account_count": len(new_accounts),
                "total_negative": len(negative_votes),
                "ratio": round(ratio, 3),
            }

        return {"is_flood": False}

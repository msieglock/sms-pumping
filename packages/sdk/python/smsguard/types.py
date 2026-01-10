"""
Type definitions for SMSGuard SDK
"""

from dataclasses import dataclass
from typing import Optional, Dict, Literal


@dataclass
class CheckRequest:
    """Request to check an SMS for fraud"""
    phone_number: str
    ip_address: str
    user_agent: Optional[str] = None
    session_id: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None


@dataclass
class SignalBreakdown:
    """Breakdown of fraud signals"""
    geo_risk: int
    velocity_risk: int
    carrier_risk: int
    behavior_risk: int


@dataclass
class PhoneInfo:
    """Information about the phone number"""
    country: str
    carrier: Optional[str]
    type: Literal["mobile", "voip", "landline", "toll_free", "unknown"]
    risk_level: Literal["low", "medium", "high"]


@dataclass
class CheckResponse:
    """Response from fraud check"""
    id: str
    decision: Literal["allow", "block", "review"]
    fraud_score: int
    signals: SignalBreakdown
    phone_info: PhoneInfo
    created_at: str


@dataclass
class GeoRule:
    """Geographic rule configuration"""
    country_code: str
    action: Literal["allow", "block"]

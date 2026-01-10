"""
SMSGuard API Client
"""

import requests
from typing import Optional, Dict, List, Any
from .types import CheckRequest, CheckResponse, SignalBreakdown, PhoneInfo, GeoRule


class SMSGuardError(Exception):
    """SMSGuard API Error"""

    def __init__(self, message: str, code: str, status_code: int):
        super().__init__(message)
        self.code = code
        self.status_code = status_code


class Client:
    """SMSGuard API Client"""

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.smsguard.dev/v1",
        timeout: int = 10,
    ):
        """
        Initialize SMSGuard client.

        Args:
            api_key: Your SMSGuard API key (sk_live_... or sk_test_...)
            base_url: API base URL (optional)
            timeout: Request timeout in seconds (default: 10)
        """
        if not api_key:
            raise ValueError("API key is required")

        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._session = requests.Session()
        self._session.headers.update({
            "Content-Type": "application/json",
            "X-API-Key": api_key,
        })

    def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """Make API request"""
        try:
            response = self._session.request(
                method,
                f"{self.base_url}{endpoint}",
                json=data,
                timeout=self.timeout,
            )
            result = response.json()

            if not result.get("success"):
                error = result.get("error", {})
                raise SMSGuardError(
                    error.get("message", "API request failed"),
                    error.get("code", "unknown_error"),
                    response.status_code,
                )

            return result.get("data")

        except requests.Timeout:
            raise SMSGuardError("Request timeout", "timeout", 408)
        except requests.RequestException as e:
            raise SMSGuardError(str(e), "network_error", 0)

    def check(
        self,
        phone_number: str,
        ip_address: str,
        user_agent: Optional[str] = None,
        session_id: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None,
    ) -> CheckResponse:
        """
        Check an SMS request for fraud.

        Args:
            phone_number: Phone number in E.164 format (e.g., +15551234567)
            ip_address: IP address of the requester
            user_agent: Browser user agent (optional)
            session_id: Session identifier (optional)
            metadata: Additional metadata (optional)

        Returns:
            CheckResponse with fraud decision and signals

        Example:
            >>> client = Client('sk_live_...')
            >>> check = client.check(
            ...     phone_number='+15551234567',
            ...     ip_address='203.0.113.42',
            ...     user_agent='Mozilla/5.0...'
            ... )
            >>> if check.decision == 'allow':
            ...     # Send SMS
            ...     pass
        """
        response = self._request("POST", "/sms/check", {
            "phone_number": phone_number,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "session_id": session_id,
            "metadata": metadata,
        })

        return CheckResponse(
            id=response["id"],
            decision=response["decision"],
            fraud_score=response["fraud_score"],
            signals=SignalBreakdown(
                geo_risk=response["signals"]["geo_risk"],
                velocity_risk=response["signals"]["velocity_risk"],
                carrier_risk=response["signals"]["carrier_risk"],
                behavior_risk=response["signals"]["behavior_risk"],
            ),
            phone_info=PhoneInfo(
                country=response["phone_info"]["country"],
                carrier=response["phone_info"]["carrier"],
                type=response["phone_info"]["type"],
                risk_level=response["phone_info"]["risk_level"],
            ),
            created_at=response["created_at"],
        )

    def report(
        self,
        check_id: str,
        sent: bool = False,
        verified: bool = False,
    ) -> None:
        """
        Report SMS outcome for model training.

        Args:
            check_id: The check ID from a previous check() call
            sent: Whether the SMS was actually sent
            verified: Whether the verification code was entered correctly

        Example:
            >>> client.report(check.id, sent=True, verified=True)
        """
        self._request("POST", "/sms/report", {
            "check_id": check_id,
            "sms_sent": sent,
            "code_verified": verified,
        })

    def override(self, check_id: str, action: str) -> None:
        """
        Override a fraud decision.

        Args:
            check_id: The check ID to override
            action: Either 'allow' or 'deny'
        """
        if action not in ("allow", "deny"):
            raise ValueError("Action must be 'allow' or 'deny'")

        self._request("POST", "/sms/override", {
            "check_id": check_id,
            "action": action,
        })

    def get_geo_rules(self) -> List[GeoRule]:
        """Get current geographic rules"""
        response = self._request("GET", "/config/geo-rules")
        return [
            GeoRule(
                country_code=r["country_code"],
                action=r["action"],
            )
            for r in response
        ]

    def update_geo_rules(self, rules: List[GeoRule]) -> None:
        """Update geographic rules"""
        self._request("PUT", "/config/geo-rules", {
            "rules": [
                {"country_code": r.country_code, "action": r.action}
                for r in rules
            ],
        })

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self._session.close()

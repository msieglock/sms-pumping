"""
SMSGuard Python SDK
SMS Pumping Prevention Service
"""

from .client import Client, SMSGuardError
from .types import CheckRequest, CheckResponse, GeoRule

__version__ = "1.0.0"
__all__ = ["Client", "SMSGuardError", "CheckRequest", "CheckResponse", "GeoRule"]

# SMSGuard Python SDK

Official Python SDK for [SMSGuard](https://smsguard.dev) - SMS Pumping Prevention Service.

## Installation

```bash
pip install smsguard
```

## Quick Start

```python
import smsguard

# Initialize client
client = smsguard.Client('sk_live_...')

# Check SMS request before sending
check = client.check(
    phone_number='+15551234567',
    ip_address='203.0.113.42',
    user_agent='Mozilla/5.0...'
)

if check.decision == 'allow':
    # Safe to send SMS
    twilio_client.messages.create(...)

    # Report outcome for model training
    client.report(check.id, sent=True)
elif check.decision == 'block':
    # Fraudulent request - do not send
    print(f"Blocked: fraud score {check.fraud_score}")
else:
    # Review needed - handle based on your policy
    pass
```

## Features

- **Real-time fraud detection** - Get instant decisions on SMS requests
- **Signal breakdown** - Understand why requests are blocked
- **Geographic rules** - Block high-risk countries
- **Outcome reporting** - Improve detection by reporting results

## Documentation

Full documentation at [docs.smsguard.dev](https://docs.smsguard.dev)

## License

MIT

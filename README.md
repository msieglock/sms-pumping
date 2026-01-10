# SMSGuard - SMS Pumping Prevention Service

A comprehensive SMS fraud detection and prevention service that protects businesses from SMS pumping attacks.

## Features

- **Real-time Fraud Detection** - ML-powered detection using geographic, velocity, carrier, and behavioral signals
- **Prevention API** - RESTful API with Node.js and Python SDKs
- **Analytics Dashboard** - React-based dashboard with map visualization and review queue
- **AI Review Agent** - Claude-powered analysis for gray-area fraud cases
- **Stripe Billing** - Usage-based pricing with transparent savings calculation

## Architecture

```
smsguard/
├── packages/
│   ├── api/          # Cloudflare Workers API
│   ├── web/          # React Dashboard
│   ├── sdk/
│   │   ├── node/     # Node.js SDK
│   │   └── python/   # Python SDK
│   └── docs/         # Documentation
```

## Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account
- Stripe account (for billing)
- SendGrid account (for emails)
- Anthropic API key (for AI review)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/sms-pumping.git
cd sms-pumping

# Install dependencies
npm install

# Set up environment variables
cp packages/api/.dev.vars.example packages/api/.dev.vars

# Run locally
npm run dev:api    # API on port 8787
npm run dev:web    # Dashboard on port 3000
```

### Configuration

Create `packages/api/.dev.vars`:

```bash
STRIPE_SECRET_KEY=sk_test_...
SENDGRID_API_KEY=SG....
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=your-jwt-secret
```

## API Usage

### Node.js

```javascript
const SMSGuard = require('smsguard');
const guard = new SMSGuard('sk_live_...');

const check = await guard.check({
  phoneNumber: '+15551234567',
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});

if (check.decision === 'allow') {
  await twilio.messages.create({...});
  await guard.report(check.id, { sent: true });
}
```

### Python

```python
import smsguard

client = smsguard.Client('sk_live_...')

check = client.check(
    phone_number='+15551234567',
    ip_address=request.remote_addr,
    user_agent=request.headers.get('User-Agent')
)

if check.decision == 'allow':
    twilio_client.messages.create(...)
    client.report(check.id, sent=True)
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/sms/check` | POST | Check SMS request for fraud |
| `/v1/sms/report` | POST | Report SMS outcome |
| `/v1/sms/override` | POST | Override decision |
| `/v1/config/geo-rules` | GET/PUT | Manage country rules |
| `/v1/analytics/summary` | GET | Get analytics summary |
| `/v1/review-queue` | GET | Get pending reviews |
| `/v1/billing/summary` | GET | Get billing summary |

## Fraud Detection Signals

| Signal | Weight | Description |
|--------|--------|-------------|
| Geographic Risk | 25% | Country risk + geo-fence + IP mismatch |
| Velocity Patterns | 30% | Request rate + sequential detection |
| Carrier Intelligence | 25% | Number type + carrier reputation |
| Behavioral Analysis | 20% | Conversion rate + session analysis |

## Decision Thresholds

- **Score 0-30**: ALLOW - Low fraud probability
- **Score 31-70**: REVIEW - Gray area, route to AI agent
- **Score 71-100**: BLOCK - High fraud probability

## Pricing

- **Base Subscription**: $100/month
- **Savings Share**: 15% of documented fraud savings
- **Free Trial**: 14 days, no credit card required

## Deployment

### Cloudflare Workers

```bash
# Deploy API
cd packages/api
wrangler deploy

# Deploy dashboard
cd packages/web
npm run build
wrangler pages deploy dist
```

## Tech Stack

- **Frontend**: React, TypeScript, Material Design 3, Mapbox GL
- **Backend**: Cloudflare Workers, Hono, D1 (SQLite)
- **AI**: Anthropic Claude API
- **Payments**: Stripe
- **Email**: SendGrid

## License

MIT

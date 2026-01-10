import { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Chip,
  Divider,
  Alert,
} from '@mui/material';
import {
  Code as CodeIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const CodeBlock = ({ code, language = 'javascript' }: { code: string; language?: string }) => (
  <Box
    component="pre"
    sx={{
      bgcolor: 'background.default',
      p: 2,
      borderRadius: 1,
      overflow: 'auto',
      fontSize: '0.75rem',
      border: '1px solid',
      borderColor: 'divider',
      my: 2,
    }}
  >
    <code>{code}</code>
  </Box>
);

export default function Docs() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        API Documentation
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Complete guide to integrating SMSGuard into your application
      </Typography>

      <Card sx={{ mt: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="Quick Start" />
          <Tab label="API Reference" />
          <Tab label="SDKs" />
          <Tab label="Webhooks" />
        </Tabs>

        <CardContent>
          {/* Quick Start */}
          <TabPanel value={tab} index={0}>
            <Typography variant="h6" gutterBottom>
              Quick Start Guide
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Get up and running with SMSGuard in minutes
            </Typography>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                1. Get your API Key
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Go to Settings → API Keys to get your live API key. Use test keys during development.
              </Typography>

              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mt: 3 }}>
                2. Install the SDK
              </Typography>
              <CodeBlock code={`# Node.js
npm install @smsguard/node

# Python
pip install smsguard`} />

              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mt: 3 }}>
                3. Check Before Sending SMS
              </Typography>
              <CodeBlock code={`const SMSGuard = require('@smsguard/node');
const guard = new SMSGuard('sk_live_your_api_key');

// Before sending SMS verification
async function sendVerification(phoneNumber, req) {
  const check = await guard.check({
    phoneNumber: phoneNumber,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    sessionId: req.session?.id,
  });

  if (check.decision === 'block') {
    throw new Error('SMS blocked due to fraud risk');
  }

  if (check.decision === 'review') {
    // Optionally add additional verification
    console.log('Request flagged for review:', check.id);
  }

  // Safe to send SMS
  await twilio.messages.create({
    to: phoneNumber,
    body: 'Your verification code is: 123456'
  });

  // Report that SMS was sent
  await guard.report(check.id, { sent: true });
}`} />

              <Alert severity="success" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  That's it! SMSGuard will automatically analyze each request and return a decision.
                </Typography>
              </Alert>
            </Box>
          </TabPanel>

          {/* API Reference */}
          <TabPanel value={tab} index={1}>
            <Typography variant="h6" gutterBottom>
              API Reference
            </Typography>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Base URL
              </Typography>
              <CodeBlock code="https://smsguard-api.m-8b1.workers.dev/v1" />

              <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 3 }}>
                Authentication
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All API requests require an API key passed in the X-API-Key header.
              </Typography>
              <CodeBlock code={`curl -X POST https://smsguard-api.m-8b1.workers.dev/v1/sms/check \\
  -H "X-API-Key: sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"phone_number": "+15551234567", "ip_address": "1.2.3.4"}'`} />

              <Divider sx={{ my: 4 }} />

              <Typography variant="h6" gutterBottom>
                Endpoints
              </Typography>

              {/* Check Endpoint */}
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Chip label="POST" color="primary" size="small" />
                    <Typography variant="subtitle1" fontWeight={600}>
                      /v1/sms/check
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Check if an SMS request should be allowed, blocked, or reviewed.
                  </Typography>

                  <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 2 }}>
                    Request Body
                  </Typography>
                  <CodeBlock code={`{
  "phone_number": "+15551234567",  // Required
  "ip_address": "1.2.3.4",         // Required
  "user_agent": "Mozilla/5.0...",  // Optional
  "session_id": "sess_abc123",     // Optional
  "metadata": {                    // Optional
    "use_case": "verification",
    "account_id": "user_123"
  }
}`} />

                  <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 2 }}>
                    Response
                  </Typography>
                  <CodeBlock code={`{
  "success": true,
  "data": {
    "id": "chk_abc123def456",
    "decision": "allow",           // "allow", "block", or "review"
    "fraud_score": 15,             // 0-100
    "signals": {
      "geo_risk": 5,
      "velocity_risk": 10,
      "carrier_risk": 0,
      "behavior_risk": 0
    },
    "phone_info": {
      "country": "US",
      "carrier": "Verizon",
      "type": "mobile",
      "risk_level": "low"
    }
  }
}`} />
                </CardContent>
              </Card>

              {/* Report Endpoint */}
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Chip label="POST" color="primary" size="small" />
                    <Typography variant="subtitle1" fontWeight={600}>
                      /v1/sms/report
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Report the outcome of an SMS check (whether it was sent, verified, etc.)
                  </Typography>

                  <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 2 }}>
                    Request Body
                  </Typography>
                  <CodeBlock code={`{
  "check_id": "chk_abc123def456",
  "sent": true,                    // SMS was sent
  "verified": true                 // Code was verified (optional)
}`} />
                </CardContent>
              </Card>

              {/* Decision Thresholds */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Decision Thresholds
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Chip label="0-29" color="success" size="small" sx={{ minWidth: 60 }} />
                      <Typography variant="body2">ALLOW - Low risk, safe to send</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Chip label="30-70" color="warning" size="small" sx={{ minWidth: 60 }} />
                      <Typography variant="body2">REVIEW - Moderate risk, manual review recommended</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip label="71-100" color="error" size="small" sx={{ minWidth: 60 }} />
                      <Typography variant="body2">BLOCK - High risk, likely fraudulent</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </TabPanel>

          {/* SDKs */}
          <TabPanel value={tab} index={2}>
            <Typography variant="h6" gutterBottom>
              Official SDKs
            </Typography>

            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Node.js SDK
                    </Typography>
                    <CodeBlock code="npm install @smsguard/node" />
                    <CodeBlock code={`const SMSGuard = require('@smsguard/node');
const guard = new SMSGuard('sk_live_...');

const result = await guard.check({
  phoneNumber: '+15551234567',
  ipAddress: '1.2.3.4',
});

console.log(result.decision);`} />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Python SDK
                    </Typography>
                    <CodeBlock code="pip install smsguard" />
                    <CodeBlock code={`from smsguard import SMSGuard

guard = SMSGuard('sk_live_...')

result = guard.check(
    phone_number='+15551234567',
    ip_address='1.2.3.4',
)

print(result.decision)`} />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      REST API (cURL)
                    </Typography>
                    <CodeBlock code={`curl -X POST https://smsguard-api.m-8b1.workers.dev/v1/sms/check \\
  -H "X-API-Key: sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phone_number": "+15551234567",
    "ip_address": "1.2.3.4"
  }'`} />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Webhooks */}
          <TabPanel value={tab} index={3}>
            <Typography variant="h6" gutterBottom>
              Webhooks
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Receive real-time notifications about fraud events
            </Typography>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Available Events
              </Typography>
              <Grid container spacing={2}>
                {[
                  { event: 'sms.blocked', desc: 'When an SMS request is blocked' },
                  { event: 'sms.review_needed', desc: 'When a request needs manual review' },
                  { event: 'threshold.exceeded', desc: 'When velocity limits are exceeded' },
                  { event: 'daily.summary', desc: 'Daily summary of fraud prevention' },
                ].map((item) => (
                  <Grid item xs={12} md={6} key={item.event}>
                    <Card variant="outlined">
                      <CardContent sx={{ py: 1.5 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {item.event}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.desc}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 4 }} gutterBottom>
                Webhook Payload
              </Typography>
              <CodeBlock code={`{
  "event": "sms.blocked",
  "timestamp": "2024-01-10T19:00:00Z",
  "data": {
    "check_id": "chk_abc123",
    "phone_number": "+1555*****67",
    "fraud_score": 85,
    "decision": "block",
    "signals": {
      "geo_risk": 40,
      "velocity_risk": 30,
      "carrier_risk": 10,
      "behavior_risk": 5
    }
  }
}`} />
            </Box>
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
}

import ShieldIcon from '@mui/icons-material/Shield';
import SpeedIcon from '@mui/icons-material/Speed';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SavingsIcon from '@mui/icons-material/Savings';
import type { SvgIconComponent } from '@mui/icons-material';

export interface Feature {
  title: string;
  description: string;
  icon: SvgIconComponent;
  badge?: string;
}

export const features: Feature[] = [
  {
    title: 'Real-Time Fraud Detection',
    description: 'Block fraudulent SMS requests in milliseconds before they cost you money. Our AI analyzes 50+ signals per request.',
    icon: ShieldIcon,
    badge: 'Core',
  },
  {
    title: 'Sub-50ms Latency',
    description: 'Lightning-fast API responses that won\'t slow down your user experience. Built on edge infrastructure worldwide.',
    icon: SpeedIcon,
  },
  {
    title: 'AI-Powered Decisions',
    description: 'When fraud signals are ambiguous, our AI agent reviews the request and makes intelligent allow/deny decisions.',
    icon: AutoFixHighIcon,
    badge: 'AI',
  },
  {
    title: '5-Minute Integration',
    description: 'Add one API call before sending SMS. Works with Twilio, Vonage, MessageBird, Plivo, Sinch, and AWS SNS.',
    icon: IntegrationInstructionsIcon,
  },
  {
    title: 'Real-Time Analytics',
    description: 'Track blocked fraud, savings, and geographic patterns. Export data for compliance and reporting.',
    icon: AnalyticsIcon,
  },
  {
    title: 'Guaranteed Savings',
    description: 'Our 15% fee is based on what we save you. If we don\'t block fraud, you don\'t pay. It\'s that simple.',
    icon: SavingsIcon,
  },
];

export interface Capability {
  stat: string;
  title: string;
  description: string;
}

export const capabilities: Capability[] = [
  {
    stat: '<50ms',
    title: 'API Latency',
    description: 'Edge-deployed globally',
  },
  {
    stat: '99.9%',
    title: 'Uptime SLA',
    description: 'Enterprise reliability',
  },
  {
    stat: '6+',
    title: 'Providers',
    description: 'One-click integrations',
  },
  {
    stat: '$0.08',
    title: 'Avg Blocked',
    description: 'Per fraudulent SMS',
  },
];

export interface UseCase {
  title: string;
  persona: string;
  description: string;
  benefits: string[];
}

export const useCases: UseCase[] = [
  {
    title: 'For Developers',
    persona: 'Engineering Teams',
    description: 'Add SMS fraud protection with a single API call. No complex rules to configure, no thresholds to tune. Just call our API before sending SMS and we handle the rest.',
    benefits: ['Simple REST API', 'SDKs for all languages', 'Webhook notifications', 'Detailed logging'],
  },
  {
    title: 'For Finance & Ops',
    persona: 'Cost Management',
    description: 'Stop bleeding money to SMS pumping fraud. See exactly how much you\'re saving in real-time. Our fee is 15% of savings—if we don\'t save you money, you don\'t pay.',
    benefits: ['ROI dashboard', 'Cost projections', 'Invoice tracking', 'Monthly reports'],
  },
  {
    title: 'For Security Teams',
    persona: 'Risk Management',
    description: 'Get complete visibility into SMS fraud attempts. Configure geo-blocking, set velocity limits, and review AI decisions. Full audit trail for compliance.',
    benefits: ['Geo-blocking rules', 'Velocity controls', 'Audit logging', 'GDPR compliant'],
  },
  {
    title: 'For Product Teams',
    persona: 'User Experience',
    description: 'Protect your users without friction. Legitimate users get through instantly while fraudsters are blocked. No CAPTCHAs, no delays, no false positives on real users.',
    benefits: ['Zero user friction', 'Low false positives', 'A/B testing', 'Conversion tracking'],
  },
];

export interface HowItWorksStep {
  step: number;
  title: string;
  description: string;
  code?: string;
}

export const howItWorksSteps: HowItWorksStep[] = [
  {
    step: 1,
    title: 'Call Our API Before Sending SMS',
    description: 'Add one API call to your existing SMS flow. Takes 5 minutes to integrate.',
    code: `const response = await fetch('https://api.smsguard.dev/v1/sms/check', {
  method: 'POST',
  headers: {
    'X-API-Key': 'sk_live_xxx',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    phone_number: '+1234567890',
    ip_address: userIP,
    session_id: sessionId,
  }),
});`,
  },
  {
    step: 2,
    title: 'We Analyze 50+ Fraud Signals',
    description: 'Geographic risk, velocity patterns, carrier analysis, behavioral signals, and more.',
  },
  {
    step: 3,
    title: 'Get Instant Decision',
    description: 'We return allow, block, or review in under 50ms. Only send SMS when we say "allow".',
    code: `const { decision, fraud_score } = await response.json();

if (decision === 'allow') {
  // Send your SMS via Twilio, Vonage, etc.
  await sendSMS(phoneNumber, code);
} else {
  // Log the blocked attempt
  console.log('Blocked fraud attempt', fraud_score);
}`,
  },
  {
    step: 4,
    title: 'Watch Your Savings Grow',
    description: 'Track blocked fraud and savings in real-time on your dashboard.',
  },
];

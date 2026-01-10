export interface PricingTier {
  name: string;
  description: string;
  price: number | null;
  priceAnnual: number | null;
  cta: string;
  ctaVariant: 'contained' | 'outlined';
  highlighted: boolean;
  features: string[];
}

export const pricingTiers: PricingTier[] = [
  {
    name: 'Free Trial',
    description: 'Try SMSGuard risk-free for 14 days',
    price: 0,
    priceAnnual: 0,
    cta: 'Start Free Trial',
    ctaVariant: 'outlined',
    highlighted: false,
    features: [
      '14-day free trial',
      '1,000 SMS checks included',
      'Basic fraud detection',
      'Dashboard access',
      'Email support',
      'All 6 provider integrations',
    ],
  },
  {
    name: 'Pro',
    description: 'For businesses serious about stopping SMS fraud',
    price: 100,
    priceAnnual: 1000,
    cta: 'Start Saving Now',
    ctaVariant: 'contained',
    highlighted: true,
    features: [
      '$100/month base fee',
      '15% of fraud savings',
      'Unlimited SMS checks',
      'Advanced AI detection',
      'Real-time analytics',
      'API access & webhooks',
      'Priority support',
      'Custom geo-blocking rules',
      'Dedicated account manager',
    ],
  },
];

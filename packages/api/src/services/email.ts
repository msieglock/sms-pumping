import sgMail from '@sendgrid/mail';

// Initialize SendGrid client
export function initSendGrid(apiKey: string): void {
  sgMail.setApiKey(apiKey);
}

// Email templates
const TEMPLATES = {
  welcome: 'd-welcome-template-id',
  analysis_complete: 'd-analysis-template-id',
  fraud_alert: 'd-fraud-alert-template-id',
  monthly_summary: 'd-monthly-summary-template-id',
  invoice: 'd-invoice-template-id',
};

// Base email configuration
const FROM_EMAIL = 'noreply@smsguard.dev';
const FROM_NAME = 'SMSGuard';

// Send welcome email
export async function sendWelcomeEmail(
  to: string,
  name: string,
  orgName: string
): Promise<void> {
  await sgMail.send({
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: 'Welcome to SMSGuard - Let\'s Protect Your SMS',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">Welcome to SMSGuard!</h1>
        <p>Hi ${name},</p>
        <p>Thanks for signing up for SMSGuard. You're now ready to protect ${orgName} from SMS pumping fraud.</p>
        <h2>What's Next?</h2>
        <ol>
          <li><strong>Connect your SMS provider</strong> - We'll analyze your historical data</li>
          <li><strong>Review our recommendations</strong> - We'll show you potential fraud patterns</li>
          <li><strong>Integrate our API</strong> - Start protecting your SMS in minutes</li>
        </ol>
        <p>
          <a href="https://app.smsguard.dev/onboarding"
             style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Complete Setup
          </a>
        </p>
        <p style="color: #64748b; font-size: 14px;">
          Your 14-day free trial has started. No credit card required.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">
          SMSGuard - Protecting businesses from SMS pumping fraud.
        </p>
      </div>
    `,
  });
}

// Send historical analysis complete email
export async function sendAnalysisCompleteEmail(
  to: string,
  name: string,
  analysis: {
    totalSms: number;
    suspectedFraud: number;
    estimatedCost: number;
    monthlyProjection: number;
    topCountries: Array<{ country: string; percent: number }>;
  }
): Promise<void> {
  const topCountriesHtml = analysis.topCountries
    .map(c => `<li>${c.country}: ${c.percent}%</li>`)
    .join('');

  await sgMail.send({
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: `Analysis Complete: We Found $${analysis.estimatedCost.toFixed(2)} in Potential Fraud`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">Your SMS Analysis is Ready</h1>
        <p>Hi ${name},</p>
        <p>We've completed analyzing your SMS history. Here's what we found:</p>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0;">Key Findings</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0;">Total SMS (90 days)</td>
              <td style="text-align: right; font-weight: bold;">${analysis.totalSms.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">Suspected Fraud</td>
              <td style="text-align: right; font-weight: bold; color: #ef4444;">${analysis.suspectedFraud.toLocaleString()}</td>
            </tr>
            <tr style="background: #fef2f2;">
              <td style="padding: 8px;">Estimated Fraud Cost</td>
              <td style="text-align: right; font-weight: bold; color: #ef4444;">$${analysis.estimatedCost.toFixed(2)}</td>
            </tr>
            <tr style="background: #f0fdf4;">
              <td style="padding: 8px;">Projected Monthly Savings</td>
              <td style="text-align: right; font-weight: bold; color: #10b981;">$${analysis.monthlyProjection.toFixed(2)}/mo</td>
            </tr>
          </table>
        </div>

        <h3>Top Fraud Sources</h3>
        <ul>${topCountriesHtml}</ul>

        <p>
          <a href="https://app.smsguard.dev/dashboard"
             style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Full Report
          </a>
        </p>
      </div>
    `,
  });
}

// Send fraud alert email
export async function sendFraudAlertEmail(
  to: string,
  alert: {
    blockedCount: number;
    timeWindow: string;
    topCountry: string;
    threatLevel: 'medium' | 'high';
  }
): Promise<void> {
  const bgColor = alert.threatLevel === 'high' ? '#fef2f2' : '#fffbeb';
  const borderColor = alert.threatLevel === 'high' ? '#ef4444' : '#f59e0b';

  await sgMail.send({
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: `[${alert.threatLevel.toUpperCase()}] SMS Fraud Alert - ${alert.blockedCount} attempts blocked`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${bgColor}; border-left: 4px solid ${borderColor}; padding: 16px; margin-bottom: 20px;">
          <h2 style="margin: 0; color: ${borderColor};">
            ${alert.threatLevel === 'high' ? '🚨' : '⚠️'} Fraud Alert
          </h2>
        </div>

        <p>We've detected unusual SMS activity:</p>

        <ul>
          <li><strong>Blocked attempts:</strong> ${alert.blockedCount}</li>
          <li><strong>Time window:</strong> ${alert.timeWindow}</li>
          <li><strong>Primary source:</strong> ${alert.topCountry}</li>
        </ul>

        <p>
          <a href="https://app.smsguard.dev/dashboard"
             style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Details
          </a>
        </p>

        <p style="color: #64748b; font-size: 14px;">
          All fraudulent requests have been automatically blocked. No action is required.
        </p>
      </div>
    `,
  });
}

// Send monthly summary email
export async function sendMonthlySummaryEmail(
  to: string,
  name: string,
  summary: {
    month: string;
    totalChecks: number;
    allowed: number;
    blocked: number;
    savings: number;
    invoice: number;
  }
): Promise<void> {
  await sgMail.send({
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: `Your ${summary.month} SMSGuard Summary - Saved $${summary.savings.toFixed(2)}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">Monthly Summary: ${summary.month}</h1>
        <p>Hi ${name},</p>
        <p>Here's your SMS protection summary for ${summary.month}:</p>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0;">Total SMS Checks</td>
              <td style="text-align: right; font-weight: bold;">${summary.totalChecks.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">Allowed</td>
              <td style="text-align: right; color: #10b981;">${summary.allowed.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">Blocked (Fraud)</td>
              <td style="text-align: right; color: #ef4444;">${summary.blocked.toLocaleString()}</td>
            </tr>
            <tr style="background: #f0fdf4;">
              <td style="padding: 12px 8px;"><strong>Your Savings</strong></td>
              <td style="text-align: right; font-weight: bold; color: #10b981; font-size: 18px;">$${summary.savings.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <p style="color: #64748b;">
          Your invoice for this month: $${summary.invoice.toFixed(2)}
        </p>

        <p>
          <a href="https://app.smsguard.dev/billing"
             style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Invoice
          </a>
        </p>
      </div>
    `,
  });
}

// Send email wrapper with error handling
export async function sendEmail(
  apiKey: string,
  ...args: Parameters<typeof sgMail.send>
): Promise<boolean> {
  try {
    initSendGrid(apiKey);
    await sgMail.send(...args);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

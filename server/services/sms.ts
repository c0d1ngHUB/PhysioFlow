// Shared SMS utilities — single source of truth for phone formatting and SMS sending
// Used by both server/routes/sms.ts and server/services/smsScheduler.ts

const SMS77_URL = 'https://rest.sms77.de/api/sms';

function getSmsApiKey(): string {
  return process.env.SMS77_API_KEY?.trim() || '';
}

/**
 * Format phone number to E.164 format (Austrian default)
 */
export function formatPhone(raw: string): string {
  let phone = raw.replace(/[\s]/g, '');

  if (phone.startsWith('+')) {
    // Already international format
  } else if (phone.startsWith('0')) {
    // Austrian/local format — strip leading 0, prepend +43
    phone = '+43' + phone.slice(1);
  } else {
    // Unknown format, try Austrian as default
    phone = '+43' + phone;
  }

  // Basic E.164 validation
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new Error('Ungültiges Telefonnummernformat. Erwartet: +43... (AT), +49... (DE), etc.');
  }

  return phone;
}

export interface SendSmsOptions {
  to: string;          // E.164 formatted phone number
  text: string;
  from?: string;
}

export interface SendSmsResult {
  id: string;
  to: string;
  text: string;
  status: 'simulated' | 'sent';
  simulated?: boolean;
}

export function getSmsProviderStatus() {
  const apiKeyConfigured = Boolean(getSmsApiKey());
  return {
    provider: 'sms77',
    configured: apiKeyConfigured,
    mode: apiKeyConfigured ? 'live' : 'simulation',
  };
}

/**
 * Send SMS via SMS77 API (POST with Authorization header).
 * If no API key is configured, simulates sending.
 */
export async function sendSms(options: SendSmsOptions): Promise<SendSmsResult> {
  const { to, text, from = 'PhysioFlow' } = options;
  const apiKey = getSmsApiKey();

  if (!apiKey) {
    console.log(`📱 [SIMULATED SMS] To: ${to}, Message: ${text.substring(0, 50)}...`);
    return {
      id: 'sim_' + Date.now(),
      to,
      text,
      status: 'simulated',
      simulated: true,
    };
  }

  const response = await fetch(SMS77_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      text,
      from,
    }),
  });

  const result = await response.text();

  if (!response.ok) {
    throw new Error(`SMS77-Fehler: ${result}`);
  }

  return {
    id: result || `sms77_${Date.now()}`,
    to,
    text,
    status: 'sent',
  };
}

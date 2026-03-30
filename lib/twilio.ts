import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;

export const twilioClient = twilio(accountSid, authToken);

export async function makeReminderCall(toPhone: string, reminderId: string): Promise<string> {
  const baseUrl = process.env.BASE_URL!;

  const call = await twilioClient.calls.create({
    to: toPhone,
    from: process.env.TWILIO_PHONE_NUMBER!,
    url: `${baseUrl}/api/twilio/voice?reminderId=${reminderId}`,
    statusCallback: `${baseUrl}/api/twilio/status?reminderId=${reminderId}`,
    statusCallbackMethod: 'POST',
    statusCallbackEvent: ['completed', 'failed', 'no-answer', 'busy'],
  });

  return call.sid;
}

# WhatsApp Business Cloud API — ALATPay Streams

Primary merchant interface: onboard, manage buckets, accept loan offers, and ask questions entirely through WhatsApp.

## Environment variables

```env
WHATSAPP_PHONE_NUMBER_ID=       # From Meta App → WhatsApp → API Setup
WHATSAPP_ACCESS_TOKEN=          # System User permanent token (NOT temp)
WHATSAPP_VERIFY_TOKEN=          # Any secret string you choose for webhook verify
WHATSAPP_APP_SECRET=            # App secret from Meta Developer dashboard
YARNGPT_API_KEY=                # Streams Voice — Nigerian English, Pidgin, Yoruba, Igbo, Hausa
# OPENAI_API_KEY=               # Optional Whisper fallback (VOICE_WHISPER_FALLBACK=true)
REDIS_URL=redis://localhost:6379  # BullMQ background queue
```

When credentials are missing, outbound messages are logged only (safe for local dev).

## Meta Business setup checklist

1. **Create a Meta Business account** and register a WhatsApp Business app at [developers.facebook.com](https://developers.facebook.com).
2. **Add a test phone number** — free tier supports up to 5 approved test recipients.
3. **Configure webhook URL:** `https://<your-domain>/webhooks/whatsapp`
4. **Set verify token** — must match `WHATSAPP_VERIFY_TOKEN` in your env.
5. **Subscribe** to the `messages` webhook field.
6. **Generate a permanent access token** — use a System User token, not the 24-hour temp token from the API setup page.

### Demo phone setup (before demo day)

- [ ] Register Funke's demo number (`+2348012345678` or your real test number) as an approved recipient in Meta.
- [ ] Submit all three templates for approval (day 3 latest — ~24h turnaround).
- [ ] Test full loop: voice note → transcript → orchestrator → button reply.
- [ ] Test interactive buttons on a real WhatsApp client.
- [ ] Backup: dashboard chat panel uses the same orchestrator (`/dashboard`).

If template approval is delayed, demo still works for **user-initiated** flows (text, voice, buttons). Unsolicited nudges require approved templates after 24h of silence.

## Pre-approved templates

Submit these in Meta Business Manager → WhatsApp → Message templates:

| Name | Category | Body |
|------|----------|------|
| `loan_offer` | MARKETING | Hi {{1}}, your ALATPay volume this week is ₦{{2}}. You qualify for a ₦{{3}} advance. Reply OFFER to see the terms. |
| `tax_reminder` | UTILITY | Hi {{1}}, your VAT bucket has ₦{{2}}. Filing deadline is in {{3}} days. Reply REMIT to send to FIRS. |
| `daily_summary` | UTILITY | Good evening {{1}}. Today: ₦{{2}} in sales across {{3}} transactions. Buckets filled automatically. Reply SUMMARY for the full breakdown. |

Reference payloads: `src/integrations/whatsapp/templates.ts` (`templateToMetaPayload`).

## Architecture

```
Inbound POST /webhooks/whatsapp
  → verify X-Hub-Signature-256
  → return 200 immediately
  → BullMQ job (Redis)
      → find/create merchant by phone
      → find/create Conversation (WHATSAPP)
      → voice? download + YarnGPT → text
      → button reply? map to orchestrator text
      → handleMessage()
      → sendAssistantResponse() (text | buttons | list | template)
```

**Critical:** Meta retries aggressively. The webhook responds within 5 seconds; orchestrator work runs in the background queue.

## Message types

### Outbound
- Plain text — default orchestrator replies
- Interactive buttons — loan offers (Accept / Decline / More info)
- List messages — bucket setup flow
- Templates — unsolicited messages after 24h window (`loan_offer`, `tax_reminder`, `daily_summary`)

### Inbound
- Text
- Button / list replies (mapped to orchestrator context)
- Voice notes (YarnGPT / Streams Voice transcription)
- Images — phase 2 (not implemented)

## Voice notes

1. Webhook receives `audio` message with media ID
2. Authenticated GET to Meta media URL
3. YarnGPT transcription (English, Pidgin, Yoruba, Igbo, Hausa)
4. Transcript passed to orchestrator with Streams Voice context
5. Normal text/button response sent back

## Local testing with ngrok

```bash
npm run dev
ngrok http 3000
# Set webhook in Meta to https://<ngrok-id>.ngrok.io/webhooks/whatsapp
```

Send a message from an approved test number to your WhatsApp Business test line.

## API reference

Webhook: `GET/POST /webhooks/whatsapp`  
Dashboard chat: `POST /api/chat` with `{ merchantId, message, channel: "DASHBOARD" }`  
Returns `{ assistantMessage, response, toolsCalled, conversationId }` where `response` is the shared `AssistantResponse` shape used by WhatsApp and the dashboard UI.

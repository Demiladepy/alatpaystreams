import type { AssistantResponse } from '../../types/assistant';
import { whatsappClient } from './client';

export async function sendAssistantResponse(
  to: string,
  response: AssistantResponse,
): Promise<{ messageId: string }> {
  switch (response.type) {
    case 'text':
      return whatsappClient.sendText(to, response.body);
    case 'buttons':
      return whatsappClient.sendButtons(to, {
        body: response.body,
        buttons: response.buttons,
      });
    case 'list':
      return whatsappClient.sendList(to, {
        body: response.body,
        buttonText: response.buttonText,
        sections: response.sections,
      });
  }
}

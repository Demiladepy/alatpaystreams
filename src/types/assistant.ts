export interface ButtonOption {
  id: string;
  title: string;
}

export interface ListRow {
  id: string;
  title: string;
  description?: string;
}

export interface ListSection {
  title: string;
  rows: ListRow[];
}

export type AssistantResponse =
  | { type: 'text'; body: string }
  | { type: 'buttons'; body: string; buttons: ButtonOption[] }
  | {
      type: 'list';
      body: string;
      buttonText: string;
      sections: ListSection[];
    };

export interface HandleMessageResult {
  assistantMessage: string;
  response: AssistantResponse;
  toolsCalled: string[];
  conversationId: string;
}

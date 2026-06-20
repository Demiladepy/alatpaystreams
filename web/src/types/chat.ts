export type ButtonOption = {
  id: string;
  title: string;
};

export type ListRow = {
  id: string;
  title: string;
  description?: string;
};

export type ListSection = {
  title: string;
  rows: ListRow[];
};

export type AssistantResponse =
  | { type: "text"; body: string }
  | { type: "buttons"; body: string; buttons: ButtonOption[] }
  | {
      type: "list";
      body: string;
      buttonText: string;
      sections: ListSection[];
    };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  transcript?: string;
  response?: AssistantResponse;
};

export type ChatApiResult = {
  assistantMessage: string;
  response: AssistantResponse;
  toolsCalled: string[];
  conversationId: string;
  transcript?: string;
};

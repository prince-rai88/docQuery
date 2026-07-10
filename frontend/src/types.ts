export interface Document {
  id: number;
  title: string;
  file_url: string | null;
  status: "uploaded" | "processing" | "ready" | "failed";
  uploaded_at: string;
  processed_at: string | null;
  error_message: string | null;
  chunk_count: number;
  message_count: number;
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface DocumentStatus {
  id: number;
  status: "uploaded" | "processing" | "ready" | "failed";
  processed_at: string | null;
  error_message: string | null;
}

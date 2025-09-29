import type { DecorationSet } from "@tiptap/pm/view";
import { z } from "zod";

export interface SyncResponse {
  syncUpdatedToken: string;
  syncDeletedToken: string;
  ready: boolean;
}
export interface SyncUpdatedResponse {
  nextPageToken?: string;
  nextDeltaToken: string;
  records: EmailMessage[];
}

export const emailAddressSchema = z.object({
  name: z.string(),
  address: z.string(),
});

export interface EmailMessage {
  id: string;
  threadId: string;
  createdTime: string;
  lastModifiedTime: string;
  sentAt: string | Date;
  receivedAt: string;
  internetMessageId: string;
  subject: string;
  sysLabels: Array<
    | "junk"
    | "trash"
    | "sent"
    | "inbox"
    | "unread"
    | "flagged"
    | "important"
    | "draft"
  >;
  keywords: string[];
  sysClassifications: Array<
    "personal" | "social" | "promotions" | "updates" | "forums"
  >;
  sensitivity: "normal" | "private" | "personal" | "confidential";
  meetingMessageMethod?: "request" | "reply" | "cancel" | "counter" | "other";
  from: EmailAddress;
  to: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];
  replyTo: EmailAddress[];
  hasAttachments: boolean;
  body?: string;
  bodySnippet?: string;
  attachments: EmailAttachment[];
  inReplyTo?: string;
  references?: string;
  threadIndex?: string;
  internetHeaders: EmailHeader[];
  nativeProperties: Record<string, string>;
  folderId?: string;
  omitted: Array<
    "threadId" | "body" | "attachments" | "recipients" | "internetHeaders"
  >;
}

export interface EmailAddress {
  name?: string;
  address: string;
  raw?: string;
}

export interface EmailAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  inline: boolean;
  contentId?: string;
  content?: string;
  contentLocation?: string;
}

export interface EmailHeader {
  name: string;
  value: string;
}

export type OutgoingEmailAttachment = {
  name: string;
  content: string;
  mimeType?: string;
  inline?: boolean;
  contentId?: string;
};

export type AttachmentInput = {
  inline?: boolean;
  name: string;
  mimeType?: string;
  contentId?: string;
  content: string; // base64
};

export type MinimalAttachment = {
  id: string;
  name: string;
  mimeType: string | null;
  inline: boolean | null;
  size: number | null;
  content: string | null; // base64
  contentLocation: string | null;
};

export type DateLike = string | number | Date;

export type TimeRange = { start: Date; end: Date; label: string };

export type Suggestion = {
  id: string;
  type: "spelling" | "grammar" | "style";
  message: string;
  replacement?: string;
  start: number;
  end: number;
};

export type SuggestionsStorage = {
  suggestions: Suggestion[];
  deco: DecorationSet;
};

export type TelegramResult = {
  ok: boolean;
  messageId?: number;
  error?: string;
};

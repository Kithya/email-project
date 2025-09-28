"use client";

import React, { useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Text } from "@tiptap/extension-text";
import EditorMenuBar from "./editor-menubar";
import { Separator } from "~/components/ui/separator";
import { Button } from "~/components/ui/button";
import TagInput from "./tag-input";
import { Input } from "~/components/ui/input";
import AIComposeButton from "./ai-compose-button";
import { generate } from "./action";
import { readStreamableValue } from "@ai-sdk/rsc";
import type { AttachmentInput, Suggestion } from "~/types";

import { SuggestionsExtention } from "../../lib/suggestions-extension";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "~/components/ui/select";
import { findSuggestionAtSelection, mapOffsetToDoc } from "~/lib/utils";

type Props = {
  toValues: { label: string; value: string }[];
  setToValue: (values: { label: string; value: string }[]) => void;

  ccValues: { label: string; value: string }[];
  setCcValue: (values: { label: string; value: string }[]) => void;

  subject: string;
  setSubject: (subject: string) => void;

  to: string[];

  handleSend: (html: string, attachments?: AttachmentInput[]) => void;
  isSending: boolean;

  defaultToolbarExpand?: boolean;

  attachments?: AttachmentInput[];
  setAttachments?: (next: AttachmentInput[]) => void;
};

const EmailEditor = ({
  toValues,
  setToValue,
  ccValues,
  setCcValue,
  subject,
  setSubject,
  to,
  handleSend,
  isSending,
  defaultToolbarExpand,
  attachments: attachmentsProp,
  setAttachments: setAttachmentsProp,
}: Props) => {
  const [value, setValue] = React.useState<string>("");
  const [expanded, setExpanded] = React.useState<boolean>(
    defaultToolbarExpand ?? false,
  );
  const [token, setToken] = React.useState<string>("");

  const [attachmentsLocal, setAttachmentsLocal] = React.useState<
    AttachmentInput[]
  >([]);
  const attachments = attachmentsProp ?? attachmentsLocal;
  const setAttachments = setAttachmentsProp ?? setAttachmentsLocal;

  // Live language assistant state
  const [activeSuggestion, setActiveSuggestion] =
    React.useState<Suggestion | null>(null);
  const [popupPos, setPopupPos] = React.useState<{
    top: number;
    left: number;
  } | null>(null);
  const proofreadTimer = React.useRef<number | null>(null);
  const lastProofreadText = React.useRef<string>("");

  // Improve writing modal
  const [improveOpen, setImproveOpen] = React.useState(false);
  const [tone, setTone] = React.useState<"Neutral" | "Friendly" | "Formal">(
    "Neutral",
  );

  // AI autocomplete (unchanged)
  const aiGenerate = async (text: string) => {
    const { output } = await generate(text);
    for await (const t of readStreamableValue(output)) {
      if (t) setToken(t);
    }
  };

  const CustomText = Text.extend({
    addKeyboardShortcuts() {
      return {
        "Mod-j": () => {
          aiGenerate(this.editor.getText());
          return true;
        },
      };
    },
  });

  // Initialize TipTap (hooks always run, no early return)
  const editor = useEditor({
    autofocus: false,
    extensions: [
      StarterKit,
      CustomText,
      SuggestionsExtention.configure({
        getPlainText: () => editor?.getText() ?? "",
      }),
    ],
    onUpdate: ({ editor }) => {
      setValue(editor.getHTML());
      scheduleProofread();
      updateActiveSuggestion(editor);
    },
    immediatelyRender: false,
  });

  // Insert small autocomplete tokens directly
  React.useEffect(() => {
    if (!editor || !token) return;
    editor.commands.insertContent(token);
  }, [editor, token]);

  useEffect(() => {
    if (!editor) return;
    const handleSelection = () => {
      updateActiveSuggestion(editor);
    };

    editor.on("selectionUpdate", handleSelection);
    editor.on("transaction", handleSelection);

    return () => {
      editor.off("selectionUpdate", handleSelection);
      editor.off("transaction", handleSelection);
    };
  }, [editor]);

  const scheduleProofread = useCallback(() => {
    if (!editor) return;
    if (proofreadTimer.current) window.clearTimeout(proofreadTimer.current);
    proofreadTimer.current = window.setTimeout(async () => {
      const text = editor.getText();
      if (text === lastProofreadText.current) return;
      lastProofreadText.current = text;

      try {
        const res = await fetch("/api/proofread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, locale: "en-US" }),
        });
        const data = await res.json();
        const suggestions: Suggestion[] = data.suggestions ?? [];
        editor.commands.setSuggestions(suggestions);
        updateActiveSuggestion(editor);
      } catch {
        // ignore failures
      }
    }, 700);
  }, [editor]);

  const updateActiveSuggestion = (ed: any) => {
    const storage = ed.storage?.suggestions;
    const all: Suggestion[] = storage?.suggestions ?? [];
    const sug = findSuggestionAtSelection(ed.state, all) || null;
    setActiveSuggestion(sug);

    if (sug) {
      const from =
        mapOffsetToDoc(ed.state, sug.start) ?? ed.state.selection.from;
      const rect = ed.view.coordsAtPos(from);
      const containerRect = ed.view.dom.getBoundingClientRect();
      setPopupPos({
        top: rect.bottom - containerRect.top + 6,
        left: rect.left - containerRect.left,
      });
    } else {
      setPopupPos(null);
    }
  };

  const applyActiveSuggestion = () => {
    if (!editor || !activeSuggestion || !activeSuggestion.replacement) return;
    const from = mapOffsetToDoc(editor.state, activeSuggestion.start);
    const to = mapOffsetToDoc(editor.state, activeSuggestion.end);
    if (from == null || to == null || to <= from) return;

    const tr = editor.state.tr.insertText(
      activeSuggestion.replacement,
      from,
      to,
    );
    editor.view.dispatch(tr);

    const cur = editor.storage?.suggestions?.suggestions ?? [];
    editor.commands.setSuggestions(
      cur.filter((s: Suggestion) => s.id !== activeSuggestion.id),
    );

    setActiveSuggestion(null);
    setPopupPos(null);
    scheduleProofread();
  };

  const ignoreActiveSuggestion = () => {
    if (!editor || !activeSuggestion) return;
    const cur = editor.storage?.suggestions?.suggestions ?? [];
    editor.commands.setSuggestions(
      cur.filter((s: Suggestion) => s.id !== activeSuggestion.id),
    );
    setActiveSuggestion(null);
    setPopupPos(null);
  };

  // AI Compose final insert
  const onGenerate = (html: string) => {
    editor?.commands.insertContent(html);
  };

  // File -> base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++)
      // @ts-ignore
      binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const keyOf = (a: AttachmentInput) =>
    `${a.name}::${a.mimeType ?? ""}::${a.content.length}`;

  const handlePickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const picked = await Promise.all(
      Array.from(files).map(async (file) => {
        const buf = await file.arrayBuffer();
        return {
          inline: false,
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          content: arrayBufferToBase64(buf),
        } as AttachmentInput;
      }),
    );

    const existing = new Set((attachments ?? []).map(keyOf));
    const merged = [
      ...(attachments ?? []),
      ...picked.filter((a) => !existing.has(keyOf(a))),
    ];

    setAttachments(merged);
  };

  // Improve writing
  const handleImproveWriting = async () => {
    if (!editor) return;
    const text = editor.getText();
    const res = await fetch("/api/improve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, tone }),
    });
    const data = await res.json();
    const improved: string = data.improvedText || text;

    // Insert as simple HTML line breaks; keep minimal to avoid messing TipTap nodes
    editor.commands.setContent(improved.replace(/\n/g, "<br/>"));
    setImproveOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex border-b p-4 py-2">
        {/* Render toolbar only when editor is ready to avoid null access */}
        {editor ? (
          <EditorMenuBar
            editor={editor}
            onPickFiles={handlePickFiles}
            attachCount={attachments?.length ?? 0}
          />
        ) : (
          <div className="bg-muted/40 h-5 w-full animate-pulse rounded" />
        )}
      </div>

      <div className="space-y-2 p-4 pb-0">
        {expanded && (
          <>
            <TagInput
              value={toValues}
              label="To"
              onChange={setToValue}
              placeholder="Add Recipients"
            />
            <TagInput
              value={ccValues}
              label="Cc"
              onChange={setCcValue}
              placeholder="Add Recipients"
            />
            <Input
              id="subject"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </>
        )}

        <div className="flex items-center gap-2">
          <div
            className="cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            <span className="font-medium text-green-600">Draft </span>
            <span>to {to.join(", ")}</span>
          </div>
          <AIComposeButton
            isComposing={defaultToolbarExpand}
            onGenerate={onGenerate}
          />
        </div>

        {/* attachments strip */}
        {attachments && attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {attachments.map((a, idx) => (
              <span
                key={idx}
                className="rounded-md border bg-white px-2 py-1 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-200"
                title={a.name}
              >
                📎 {a.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="prose w-full px-4 py-5">
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div className="text-muted-foreground text-sm">Loading editor…</div>
        )}
      </div>

      {/* Recommendation popup (Replace / Ignore) */}
      {editor && activeSuggestion && popupPos && (
        <div
          className="bg-popover absolute z-50 rounded-md border px-3 py-2 text-sm shadow-md"
          style={{ top: popupPos.top, left: popupPos.left }}
        >
          <div className="text-muted-foreground mb-2 max-w-[280px] truncate text-xs">
            {activeSuggestion.message}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={applyActiveSuggestion}
              disabled={!activeSuggestion.replacement}
            >
              Replace
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={ignoreActiveSuggestion}
            >
              Ignore
            </Button>
          </div>
        </div>
      )}

      <Separator />
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm">
          Tip: Press{" "}
          <kbd className="rounded-lg border border-gray-200 bg-gray-100 px-2 py-1.5 text-xs font-semibold text-gray-800">
            Ctrl + J
          </kbd>{" "}
          for AI autocomplete
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setImproveOpen(true)}
            disabled={!editor}
          >
            Improve writing
          </Button>
          <Button
            onClick={() => {
              const html = editor?.getHTML() ?? value;
              handleSend(html, attachments);
            }}
            disabled={isSending || !editor}
          >
            Send
          </Button>
        </div>
      </div>

      {/* Improve Writing modal (minimal) */}
      <Dialog open={improveOpen} onOpenChange={setImproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Improve writing</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-sm font-medium">Tone</p>
              <Select value={tone} onValueChange={(v) => setTone(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Neutral">Neutral</SelectItem>
                  <SelectItem value="Friendly">Friendly</SelectItem>
                  <SelectItem value="Formal">Formal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-muted-foreground text-xs">
              We’ll keep your meaning and facts intact.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImproveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImproveWriting}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailEditor;

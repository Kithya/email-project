"use client";

import React from "react";
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

type Props = {
  toValues: { label: string; value: string }[];
  setToValue: (values: { label: string; value: string }[]) => void;

  ccValues: { label: string; value: string }[];
  setCcValue: (values: { label: string; value: string }[]) => void;

  subject: string;
  setSubject: (subject: string) => void;

  to: string[];

  handleSend: (value: string) => void;
  isSending: boolean;

  defaultToolbarExpand?: boolean;
};

const EmailEditor = ({
  toValues,
  ccValues,
  subject,
  setSubject,
  to,
  handleSend,
  isSending,
  setToValue,
  setCcValue,
  defaultToolbarExpand,
}: Props) => {
  const [value, setValue] = React.useState<string>("");
  const [expanded, setExpanded] = React.useState<boolean>(
    defaultToolbarExpand ?? false,
  );
  const [token, setToken] = React.useState<string>("");

  const aiGenerate = async (value: string) => {
    const { output } = await generate(value);
    for await (const token of readStreamableValue(output)) {
      if (token) {
        setToken(token);
      }
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

  const editor = useEditor({
    autofocus: false,
    extensions: [StarterKit, CustomText],
    onUpdate: ({ editor }) => {
      setValue(editor.getHTML());
    },
    immediatelyRender: false,
  });

  React.useEffect(() => {
    editor?.commands?.insertContent(token);
  }, [editor, token]);

  if (!editor) return null;

  const onGenerate = (token: string) => {
    editor?.commands?.insertContent(token);
  };

  return (
    <div>
      <div className="flex border-b p-4 py-2">
        <EditorMenuBar editor={editor} />
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
      </div>
      <div className="prose w-full px-4 py-5">
        <EditorContent editor={editor} value={value} />
      </div>

      <Separator />
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm">
          Tip: Press{" "}
          <kbd className="rounded-lg border border-gray-200 bg-gray-100 px-2 py-1.5 text-xs font-semibold text-gray-800">
            Ctrl + J
          </kbd>{" "}
          for AI autocomplete
        </span>
        <Button
          onClick={async () => {
            editor?.commands?.clearContent();
            await handleSend(value);
          }}
          disabled={isSending}
        >
          Send
        </Button>
      </div>
    </div>
  );
};

export default EmailEditor;

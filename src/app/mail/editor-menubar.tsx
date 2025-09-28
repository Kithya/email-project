import { type Editor } from "@tiptap/react";
import React, { useRef } from "react";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo,
  Strikethrough,
  Undo,
  Paperclip,
} from "lucide-react";

type Props = {
  editor: Editor;
  onPickFiles?: (files: FileList | null) => void;
  attachCount?: number;
};

const EditorMenuBar = ({ editor, onPickFiles, attachCount = 0 }: Props) => {
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Attachments */}
      {onPickFiles && (
        <>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Attach files"
            aria-label="Attach files"
            className="relative"
          >
            <Paperclip className="text-secondary-foreground size-4" />
            {attachCount > 0 && (
              <span className="absolute -top-2 -right-2 inline-flex min-w-4 items-center justify-center rounded-full bg-gray-900 px-1 text-[10px] leading-4 text-white">
                {attachCount}
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              onPickFiles?.(e.target.files);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <span className="mx-1 h-4 w-px bg-gray-300" />
        </>
      )}

      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={editor.isActive("bold") ? "is-active" : ""}
        title="Bold"
        aria-label="Bold"
        aria-pressed={editor.isActive("bold")}
      >
        <Bold className="text-secondary-foreground size-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={editor.isActive("italic") ? "is-active" : ""}
        title="Italic"
        aria-label="Italic"
        aria-pressed={editor.isActive("italic")}
      >
        <Italic className="text-secondary-foreground size-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={editor.isActive("strike") ? "is-active" : ""}
        title="Strikethrough"
        aria-label="Strikethrough"
        aria-pressed={editor.isActive("strike")}
      >
        <Strikethrough className="text-secondary-foreground size-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={!editor.can().chain().focus().toggleCode().run()}
        className={editor.isActive("code") ? "is-active" : ""}
        title="Code"
        aria-label="Code"
        aria-pressed={editor.isActive("code")}
      >
        <Code className="text-secondary-foreground size-4" />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive("heading", { level: 1 }) ? "is-active" : ""}
        title="Heading 1"
        aria-label="Heading 1"
        aria-pressed={editor.isActive("heading", { level: 1 })}
      >
        <Heading1 className="text-secondary-foreground size-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive("heading", { level: 2 }) ? "is-active" : ""}
        title="Heading 2"
        aria-label="Heading 2"
        aria-pressed={editor.isActive("heading", { level: 2 })}
      >
        <Heading2 className="text-secondary-foreground size-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={editor.isActive("heading", { level: 3 }) ? "is-active" : ""}
        title="Heading 3"
        aria-label="Heading 3"
        aria-pressed={editor.isActive("heading", { level: 3 })}
      >
        <Heading3 className="text-secondary-foreground size-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        className={editor.isActive("heading", { level: 4 }) ? "is-active" : ""}
        title="Heading 4"
        aria-label="Heading 4"
        aria-pressed={editor.isActive("heading", { level: 4 })}
      >
        <Heading4 className="text-secondary-foreground size-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
        className={editor.isActive("heading", { level: 5 }) ? "is-active" : ""}
        title="Heading 5"
        aria-label="Heading 5"
        aria-pressed={editor.isActive("heading", { level: 5 })}
      >
        <Heading5 className="text-secondary-foreground size-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
        className={editor.isActive("heading", { level: 6 }) ? "is-active" : ""}
        title="Heading 6"
        aria-label="Heading 6"
        aria-pressed={editor.isActive("heading", { level: 6 })}
      >
        <Heading6 className="text-secondary-foreground size-4" />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive("bulletList") ? "is-active" : ""}
        title="Bullet list"
        aria-label="Bullet list"
        aria-pressed={editor.isActive("bulletList")}
      >
        <List className="text-secondary-foreground size-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive("orderedList") ? "is-active" : ""}
        title="Ordered list"
        aria-label="Ordered list"
        aria-pressed={editor.isActive("orderedList")}
      >
        <ListOrdered className="text-secondary-foreground size-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={editor.isActive("blockquote") ? "is-active" : ""}
        title="Quote"
        aria-label="Quote"
        aria-pressed={editor.isActive("blockquote")}
      >
        <Quote className="text-secondary-foreground size-4" />
      </button>

      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        title="Undo"
        aria-label="Undo"
      >
        <Undo className="text-secondary-foreground size-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        title="Redo"
        aria-label="Redo"
      >
        <Redo className="text-secondary-foreground size-4" />
      </button>
    </div>
  );
};

export default EditorMenuBar;

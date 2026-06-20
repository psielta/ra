"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";

const theme = {
  paragraph: "mb-2 text-sm leading-relaxed",
};

const editorConfig = {
  namespace: "RaEditor",
  theme,
  onError(error: Error) {
    console.error(error);
  },
};

interface LexicalEditorProps {
  placeholder?: string;
  className?: string;
}

export function LexicalEditor({
  placeholder = "Escreva no papiro...",
  className,
}: LexicalEditorProps) {
  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div
        className={`border-input bg-background relative min-h-[160px] rounded-md border ${className ?? ""}`}
      >
        <RichTextPlugin
          contentEditable={
            <ContentEditable className="min-h-[160px] resize-none px-3 py-2 outline-none" />
          }
          placeholder={
            <div className="text-muted-foreground pointer-events-none absolute top-2 left-3 text-sm">
              {placeholder}
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>
    </LexicalComposer>
  );
}

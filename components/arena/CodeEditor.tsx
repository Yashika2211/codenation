"use client";

import { useEffect, useRef } from "react";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  bracketMatching,
  indentOnInput,
  foldGutter,
  indentUnit,
} from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { rust } from "@codemirror/lang-rust";
import { go } from "@codemirror/lang-go";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { codenationEditorTheme, codenationHighlight } from "@/lib/design/editorTheme";
import type { LanguageId } from "@/lib/judge/languages";

function languageExtension(id: LanguageId): Extension {
  switch (id) {
    case "python":
      return python();
    case "javascript":
      return javascript();
    case "typescript":
      return javascript({ typescript: true });
    case "rust":
      return rust();
    case "go":
      return go();
    case "cpp":
      return cpp();
    case "java":
      return java();
  }
}

export type EditorTelemetry = {
  keystrokes: number;
  pasteEvents: number;
  pastedChars: number;
  totalChars: number;
};

type CodeEditorProps = {
  value: string;
  language: LanguageId;
  onChange: (value: string) => void;
  /**
   * Aggregates only — the keystroke stream itself is never recorded or sent.
   * Section 8 is explicit about that.
   */
  onTelemetry?: (delta: Partial<EditorTelemetry>) => void;
  readOnly?: boolean;
  className?: string;
};

export function CodeEditor({
  value,
  language,
  onChange,
  onTelemetry,
  readOnly = false,
  className,
}: CodeEditorProps) {
  const host = useRef<HTMLDivElement | null>(null);
  const view = useRef<EditorView | null>(null);
  // Held in refs so swapping the language does not tear down the callbacks.
  const onChangeRef = useRef(onChange);
  const onTelemetryRef = useRef(onTelemetry);

  useEffect(() => {
    onChangeRef.current = onChange;
    onTelemetryRef.current = onTelemetry;
  }, [onChange, onTelemetry]);

  useEffect(() => {
    if (!host.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        foldGutter(),
        history(),
        indentOnInput(),
        indentUnit.of("    "),
        bracketMatching(),
        closeBrackets(),
        highlightActiveLine(),
        keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
        languageExtension(language),
        codenationEditorTheme,
        codenationHighlight,
        EditorView.lineWrapping,
        EditorState.readOnly.of(readOnly),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;

          const next = update.state.doc.toString();
          onChangeRef.current(next);

          let inserted = 0;
          update.changes.iterChanges((_fa, _ta, _fb, _tb, text) => {
            inserted += text.length;
          });

          // A single change dropping many characters at once is a paste.
          const isPaste = inserted > 12;
          onTelemetryRef.current?.({
            keystrokes: isPaste ? 0 : 1,
            pasteEvents: isPaste ? 1 : 0,
            pastedChars: isPaste ? inserted : 0,
            totalChars: next.length,
          });
        }),
      ],
    });

    const instance = new EditorView({ state, parent: host.current });
    view.current = instance;

    return () => {
      instance.destroy();
      view.current = null;
    };
    // Rebuilding on language change is intentional: the parser is an extension.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, readOnly]);

  // Reflect external value changes (template reset, duel restore) without
  // clobbering the cursor while the user is typing.
  useEffect(() => {
    const instance = view.current;
    if (!instance) return;
    const current = instance.state.doc.toString();
    if (current === value) return;

    instance.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  }, [value]);

  return <div ref={host} className={className} data-testid="code-editor" />;
}

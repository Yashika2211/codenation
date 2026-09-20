import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";

/**
 * CodeMirror dressed in the CodeNation palette. Every colour here is one of the
 * tokens from globals.css — the editor is part of the interface, not a widget
 * bolted onto it.
 */

const VOID = "#06070D";
const PANEL = "#0D1018";
const TEXT = "#EAF0F8";
const DIM = "#93A3B8";
const GHOST = "#6E7B90";
const FLUX = "#3BE8B0";
const ION = "#7C6BFF";
const PLASMA = "#E84FA8";
const SIGNAL = "#5FC8FF";
const AMBER = "#F2B441";
const LINE = "rgb(124 140 180 / 0.16)";

export const codenationEditorTheme: Extension = EditorView.theme(
  {
    "&": {
      color: TEXT,
      backgroundColor: "transparent",
      fontSize: "13.5px",
      height: "100%",
    },
    ".cm-scroller": {
      fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
      lineHeight: "1.65",
      overflow: "auto",
    },
    ".cm-content": {
      caretColor: FLUX,
      padding: "14px 0",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: GHOST,
      border: "none",
      borderRight: `1px solid ${LINE}`,
      paddingRight: "6px",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 8px 0 14px",
      minWidth: "40px",
    },
    ".cm-activeLine": { backgroundColor: "rgb(255 255 255 / 0.028)" },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: DIM },
    "&.cm-focused .cm-cursor": { borderLeftColor: FLUX, borderLeftWidth: "2px" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: "rgb(59 232 176 / 0.22)",
    },
    ".cm-selectionMatch": { backgroundColor: "rgb(124 107 255 / 0.22)" },
    ".cm-matchingBracket, &.cm-focused .cm-matchingBracket": {
      backgroundColor: "rgb(59 232 176 / 0.18)",
      outline: `1px solid rgb(59 232 176 / 0.4)`,
    },
    ".cm-tooltip": {
      backgroundColor: PANEL,
      border: `1px solid ${LINE}`,
      borderRadius: "9px",
      color: TEXT,
    },
    ".cm-tooltip-autocomplete ul li[aria-selected]": {
      backgroundColor: "rgb(59 232 176 / 0.14)",
      color: TEXT,
    },
    ".cm-panels": { backgroundColor: PANEL, color: TEXT },
    ".cm-searchMatch": { backgroundColor: "rgb(242 180 65 / 0.24)" },
    ".cm-foldPlaceholder": {
      backgroundColor: "rgb(124 140 180 / 0.16)",
      border: "none",
      color: DIM,
    },
    "&.cm-editor.cm-focused": { outline: "none" },
  },
  { dark: true },
);

export const codenationHighlight: Extension = syntaxHighlighting(
  HighlightStyle.define([
    { tag: [tags.keyword, tags.moduleKeyword, tags.controlKeyword], color: PLASMA },
    { tag: [tags.definitionKeyword, tags.modifier], color: ION },
    { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: FLUX },
    { tag: [tags.typeName, tags.className, tags.namespace], color: SIGNAL },
    { tag: [tags.string, tags.special(tags.string)], color: AMBER },
    { tag: [tags.number, tags.bool, tags.null, tags.atom], color: "#FF9E6B" },
    { tag: [tags.comment, tags.lineComment, tags.blockComment], color: GHOST, fontStyle: "italic" },
    { tag: [tags.operator, tags.punctuation, tags.separator, tags.bracket], color: DIM },
    { tag: [tags.variableName, tags.propertyName], color: TEXT },
    { tag: tags.invalid, color: "#FF6B81" },
    { tag: [tags.meta, tags.annotation], color: ION },
  ]),
);

export const EDITOR_BACKGROUND = VOID;

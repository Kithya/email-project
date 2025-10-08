// suggestions-extension.ts
import { Extension } from "@tiptap/core";
import { DecorationSet } from "@tiptap/pm/view";
import { Plugin, EditorState, Transaction } from "@tiptap/pm/state";
import type { Suggestion, SuggestionsStorage } from "~/types";
import {
  buildDecorations,
  findSuggestionAtSelection,
  mapOffsetToDoc,
} from "./utils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    suggestions: {
      setSuggestions: (suggestions: Suggestion[]) => ReturnType;
      clearSuggestions: () => ReturnType;
    };
  }
  interface Storage {
    suggestions: SuggestionsStorage;
  }
}

const META_SET = "df:suggestions:set";
const META_CLEAR = "df:suggestions:clear";

export const SuggestionsExtention = Extension.create({
  name: "suggestions",

  addStorage() {
    return {
      suggestions: [] as Suggestion[],
      deco: DecorationSet.empty as DecorationSet,
    };
  },

  addCommands() {
    return {
      setSuggestions:
        (suggestions: Suggestion[]) =>
        ({ state, dispatch }) => {
          if (!dispatch) return true;
          dispatch(state.tr.setMeta(META_SET, suggestions));
          return true;
        },
      clearSuggestions:
        () =>
        ({ state, dispatch }) => {
          if (!dispatch) return true;
          dispatch(state.tr.setMeta(META_CLEAR, true));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const self = this;

    return [
      new Plugin({
        // Keep plugin state in sync with doc + metas, and mirror into extension storage
        state: {
          init(_config, state: EditorState) {
            self.storage.suggestions = [];
            self.storage.deco = DecorationSet.empty;
            return null;
          },
          apply(
            tr: Transaction,
            _value: unknown,
            _old: EditorState,
            newState: EditorState,
          ) {
            const setMeta = tr.getMeta(META_SET) as Suggestion[] | undefined;
            if (setMeta) {
              self.storage.suggestions = setMeta;
              self.storage.deco = buildDecorations(
                newState,
                self.storage.suggestions,
              );
              return null;
            }
            if (tr.getMeta(META_CLEAR)) {
              self.storage.suggestions = [];
              self.storage.deco = DecorationSet.empty;
              return null;
            }
            if (tr.docChanged) {
              self.storage.deco = self.storage.deco.map(tr.mapping, tr.doc);
            }
            return null;
          },
        },
        props: {
          decorations(state: EditorState) {
            return self.storage.deco ?? DecorationSet.empty;
          },
          handleKeyDown(view, event) {
            const list = self.storage?.suggestions ?? [];
            if (!list.length) return false;

            const state = view.state;
            const sug = findSuggestionAtSelection(state, list) || null;
            if (!sug) return false;

            if (
              (event.key === "Enter" || event.key === "Tab") &&
              (sug as any).replacement
            ) {
              event.preventDefault();
              const from = mapOffsetToDoc(state, sug.start);
              const to = mapOffsetToDoc(state, sug.end);
              if (from != null && to != null && to > from) {
                view.dispatch(state.tr.insertText(sug.replacement!, from, to));
                // remove accepted suggestion
                // @ts-ignore
                const remaining = list.filter((s) => s.id !== sug.id);
                view.dispatch(state.tr.setMeta(META_SET, remaining));
              }
              return true;
            }

            if (event.key === "Escape") {
              event.preventDefault();
              // @ts-ignore
              const remaining = list.filter((s) => s.id !== sug.id);
              view.dispatch(state.tr.setMeta(META_SET, remaining));
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});

import { Extension } from "@tiptap/core";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Plugin, EditorState } from "@tiptap/pm/state";
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

export const SuggestionsExtention = Extension.create({
  name: "suggestions",

  addOptions() {
    return {
      suggestions: [] as Suggestion[],
      getPlainText: () => "",
      applyFilter: (s: Suggestion) => true as boolean,
    };
  },

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
          this.storage.suggestions = suggestions;
          this.storage.deco = buildDecorations(state, suggestions);
          if (dispatch) this.editor.view.updateState(state);
          return true;
        },
      clearSuggestions:
        () =>
        ({ state, dispatch }) => {
          this.storage.suggestions = [];
          this.storage.deco = DecorationSet.empty;
          if (dispatch) this.editor.view.updateState(state);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const self = this;
    return [
      new Plugin({
        props: {
          decorations(state: EditorState) {
            return self.storage.deco ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});

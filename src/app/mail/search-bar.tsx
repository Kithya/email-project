"use client";

import { atom, useAtom } from "jotai";
import { Loader2, Search, X } from "lucide-react";
import React from "react";
import { Input } from "~/components/ui/input";
import useThreads from "~/hooks/use-threads";

export const searchValueAtom = atom("");
export const isSearchingAtom = atom(false);

const SearchBar = () => {
  const [searchValue, setSearchValue] = useAtom(searchValueAtom);
  const [isSearching, setIsSearching] = useAtom(isSearchingAtom);
  const { isFetching } = useThreads();

  const handleBlur = () => {
    // Allow exiting search mode even if there's a search value
    // This will let users click on threads while keeping the search term
    setIsSearching(false);
  };

  const handleFocus = () => {
    setIsSearching(true);
  };

  const handleClear = () => {
    setIsSearching(false);
    setSearchValue("");
  };

  return (
    <div className="relative m-2">
      <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
      <Input
        placeholder="Search your email...."
        className="pl-8"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />

      <div className="absolute top-2.5 right-2 flex items-center gap-2">
        {isFetching && (
          <Loader2 className="size-4 animate-spin text-gray-400" />
        )}
        <button
          className="rounded-sm hover:bg-gray-400/20"
          onClick={handleClear}
        >
          <X className="size-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
};

export default SearchBar;

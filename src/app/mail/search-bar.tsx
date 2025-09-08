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
    if (searchValue !== "") return;
    setIsSearching(false);
  };

  return (
    <div className="relative m-2">
      <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
      <Input
        placeholder="Search...."
        className="pl-8"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onFocus={() => setIsSearching(true)}
        onBlur={() => handleBlur()}
      />

      <div className="absolute top-2.5 right-2 flex items-center gap-2">
        {isFetching && (
          <Loader2 className="size-4 animate-spin text-gray-400" />
        )}
        <button
          className="rounded-sm hover:bg-gray-400/20"
          onClick={() => {
            setIsSearching(false);
            setSearchValue("");
          }}
        >
          <X className="size-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
};

export default SearchBar;

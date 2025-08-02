"use client";
import { Archive, ArchiveX, Clock, MoreVertical, Trash2 } from "lucide-react";
import React from "react";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import useThreads from "~/hooks/use-threads";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

const ThreadDisplay = () => {
  const { threadId, threads } = useThreads();

  const thread = threads?.find((t) => t.id === threadId);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center p-2">
        <div className="flex items-center gap-2">
          <Button variant={"ghost"} size={"icon"} disabled={!thread}>
            <Archive className="size-4" />
          </Button>
          <Button variant={"ghost"} size={"icon"} disabled={!thread}>
            <ArchiveX className="size-4" />
          </Button>
          <Button variant={"ghost"} size={"icon"} disabled={!thread}>
            <Trash2 className="size-4" />
          </Button>
        </div>
        <Separator orientation="vertical" className="ml-2 w-10" />
        <Button
          className="ml-2"
          variant={"ghost"}
          size={"icon"}
          disabled={!thread}
        >
          <Clock className="size-4" />
        </Button>
        <div className="ml-auto flex items-center">
          {/* <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant={"ghost"} size={"icon"} disabled={!thread}>
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Mark as Unread</DropdownMenuItem>
              <DropdownMenuItem>Star Thread</DropdownMenuItem>
              <DropdownMenuItem>Add Label</DropdownMenuItem>
              <DropdownMenuItem>Mute Thread</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> */}
        </div>
      </div>
      <Separator />

      {thread ? (
        <>
          <div className="flex flex-1 flex-col overflow-scroll">
            <div className="flex items-center p-4">
              <div className="flex items-center gap-4 text-sm">
                <Avatar>
                  <AvatarImage alt="avatar" />
                  <AvatarFallback>
                    {thread.emails[0]?.from?.name
                      ?.split(" ")
                      .map((chunk) => chunk[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="text-muted-foreground p-8 text-center">
            No message seleted
          </div>
        </>
      )}
    </div>
  );
};

export default ThreadDisplay;

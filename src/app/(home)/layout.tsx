// src/app/(home)/layout.tsx
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <main className="flex-1">{children}</main>
    </div>
  );
}

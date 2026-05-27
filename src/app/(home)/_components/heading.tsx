"use client";

import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { navigation } from "~/lib/data";
import logo from "../../../../public/logo.png";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <Image src={logo} alt="Dealflow" className="h-8 w-auto" priority />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
            >
              {item.name}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <SignedOut>
            <SignInButton mode="modal" forceRedirectUrl="/mail">
              <Button variant="outline" className="h-9">
                Sign in
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Button asChild className="h-9">
              <Link href="/mail">Open mailbox</Link>
            </Button>
          </SignedIn>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-label="Toggle navigation"
        >
          {isMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {isMenuOpen && (
        <div className="border-t border-black/10 bg-white px-4 py-3 md:hidden dark:border-white/10 dark:bg-neutral-950">
          <nav className="mx-auto grid max-w-7xl gap-1">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </a>
            ))}
            <SignedOut>
              <SignInButton mode="modal" forceRedirectUrl="/mail">
                <Button className="mt-2 w-full">Start demo</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Button asChild className="mt-2 w-full">
                <Link href="/mail">Open mailbox</Link>
              </Button>
            </SignedIn>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;

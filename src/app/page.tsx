import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import LinkAccount from "~/components/LinkAccount";

export default async function Home() {
  return (
    <main className="p-4">
      {/* If signed OUT → show login/signup buttons */}
      <SignedOut>
        <div className="flex gap-4">
          <SignInButton mode="modal">
            <button className="rounded bg-blue-500 p-2 text-white">
              Sign In
            </button>
          </SignInButton>

          <SignUpButton mode="modal">
            <button className="rounded bg-green-500 p-2 text-white">
              Sign Up
            </button>
          </SignUpButton>
        </div>
      </SignedOut>

      {/* If signed IN → show user info & logout */}
      <SignedIn>
        <div className="flex items-center gap-4">
          <p>✅ You are logged in</p>
          {/* This UserButton includes Logout in the menu */}
          <UserButton afterSignOutUrl="/" />
        </div>
      </SignedIn>

      <LinkAccount />
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";
import logo from "../../../../public/logo.png";

const links = [
  { name: "Features", href: "#features" },
  { name: "Demo mode", href: "#pricing" },
  { name: "FAQ", href: "#faq" },
  { name: "Mailbox", href: "/mail" },
];

const Footer = () => {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <Image src={logo} alt="Dealflow" className="h-8 w-auto" />
            <p className="mt-4 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-300">
              A full-stack AI email assistant demo with seeded mailboxes,
              local-safe sending, and account-aware chat.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium">
            {links.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-neutral-600 transition-colors hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col justify-between gap-3 border-t border-neutral-200 pt-6 text-sm text-neutral-500 md:flex-row dark:border-neutral-800 dark:text-neutral-400">
          <p>© 2026 Dealflow. Portfolio demo.</p>
          <p>Built with Next.js, Prisma, Clerk, tRPC, and AI SDK.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

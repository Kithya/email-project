import {
  Bell,
  CheckCircle2,
  Edit3,
  Inbox,
  MessageCircle,
  Search,
} from "lucide-react";

export const plans = [
  {
    name: "Demo",
    price: "$0",
    period: "forever",
    description: "A polished portfolio demo with seeded business mailboxes.",
    features: [
      "Three realistic demo accounts",
      "Inbox, sent, draft, and done workflows",
      "Local send and reply simulation",
      "AI answers grounded in seeded emails",
      "Writing improvement and proofreading tools",
    ],
    buttonText: "Open demo",
    buttonVariant: "outline" as const,
    popular: false,
  },
  {
    name: "Portfolio Ready",
    price: "Live",
    period: "showcase",
    description:
      "Built to show full-stack product thinking without paid email APIs.",
    features: [
      "Per-account AI chat context",
      "Safe local outbox instead of external delivery",
      "Professional seeded executive, sales, and support inboxes",
      "Searchable conversations and account switching",
      "Provider-ready architecture for Gmail, Graph, IMAP, or Aurinko later",
    ],
    buttonText: "View mailbox",
    buttonVariant: "default" as const,
    popular: true,
  },
];
export const features = [
  {
    title: "Demo Mailboxes",
    description:
      "Executive, sales, and support inboxes give reviewers a real product tour immediately after sign-in.",
    icon: Inbox,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    title: "Account-Aware AI",
    description:
      "Ask questions against the selected mailbox only, with answers grounded in the visible email data.",
    icon: MessageCircle,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    title: "Safe Local Sending",
    description:
      "Compose and reply flows save to the local outbox so demos never depend on SMTP or provider quotas.",
    icon: Bell,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    title: "Writing Tools",
    description:
      "Improve tone, proofread drafts, and generate polished replies without leaving the mailbox.",
    icon: Edit3,
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    title: "Searchable Threads",
    description:
      "Quickly scan conversations, switch folders, and inspect thread-level context like a real email client.",
    icon: Search,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    title: "Portfolio Stability",
    description:
      "Demo mode avoids expensive third-party email APIs while preserving a path to real providers later.",
    icon: CheckCircle2,
    color: "text-success",
    bgColor: "bg-success/10",
  },
];

export const navigation = [
  { name: "Home", href: "#" },
  { name: "Features", href: "#features" },
  { name: "Pricing", href: "#pricing" },
  { name: "FAQ", href: "#faq" },
];

export const faqs = [
  {
    question: "Can I try the app without linking a real mailbox?",
    answer:
      "Yes. Every signed-in demo user receives seeded executive, sales, and support mailboxes, so the product works immediately without Aurinko, Gmail, IMAP, or SMTP credentials.",
  },
  {
    question: "Does Ask AI answer from the selected account only?",
    answer:
      "Yes. The AI chat is scoped to the currently selected account and uses that mailbox's email data as its context.",
  },
  {
    question: "Will demo sends actually email someone?",
    answer:
      "No. Demo sending is intentionally local-only. Replies and composed messages appear in the sent mailbox without delivering external email.",
  },
  {
    question: "Can real email providers be added later?",
    answer:
      "Yes. The demo mode keeps the current product usable while leaving room for Gmail API, Microsoft Graph, IMAP/SMTP, or Aurinko behind a provider switch.",
  },
  {
    question: "What does this project demonstrate?",
    answer:
      "It shows full-stack product architecture: authentication, Prisma persistence, tRPC data flows, account switching, local mail sync, AI-assisted writing, and a portfolio-safe demo experience.",
  },
];

export const footerSections = [
  {
    title: "Product",
    links: [
      { name: "Features", href: "#features" },
      { name: "Pricing", href: "#pricing" },
      { name: "Security", href: "#" },
      { name: "Integrations", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About", href: "#" },
      { name: "Blog", href: "#" },
      { name: "Careers", href: "#" },
      { name: "Contact", href: "#" },
    ],
  },
  {
    title: "Resources",
    links: [
      { name: "Documentation", href: "#" },
      { name: "Help Center", href: "#" },
      { name: "Community", href: "#" },
      { name: "Status", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { name: "Privacy Policy", href: "#" },
      { name: "Terms of Service", href: "#" },
      { name: "Cookie Policy", href: "#" },
      { name: "GDPR", href: "#" },
    ],
  },
];

export const FREE_CREDITS_PER_DAY = 15;
export const FREE_ACCOUNTS_PER_USER = 1;
export const PRO_ACCOUNTS_PER_USER = 10;

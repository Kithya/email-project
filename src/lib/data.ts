import { Bell, CheckCircle2, Edit3, MessageCircle, Wrench } from "lucide-react";

export const plans = [
  {
    name: "Enterprise",
    price: "$0",
    period: "forever",
    description: "Perfect for small teams getting started",
    features: [
      "Up to 10 AI-powered replies per month",
      "Basic email management",
      "1 conversational thread",
      "Basic conversation history",
      "Email scheduling (3 emails)",
      "Smart Grammar & language check",
      "Follow-up Schedule system",
      "Limited to 2 inbox tool",
    ],
    buttonText: "Choose plan",
    buttonVariant: "outline" as const,
    popular: false,
  },
  {
    name: "Premium",
    price: "$4.99",
    period: "per month",
    description: "Best value for growing teams",
    features: [
      "Unlimited AI replies and templates",
      "Up to 5 conversational accounts",
      "Full Conversational Memory  with up to 30 clients",
      "Follow-up Reminders System (e.g. time-based triggers, lead priority)",
      "Custom Tone Training",
      "Deep Grammar/Language Suggestions with writing style feedback",
    ],
    buttonText: "Select $4 / Month",
    buttonVariant: "default" as const,
    popular: true,
  },
];
export const features = [
  {
    title: "Smart Reply Generator",
    description:
      "AI-powered suggestions for quick and professional email responses tailored to your communication style.",
    icon: Wrench,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    title: "Conversational Memory",
    description:
      "Keep track of important conversations and context across email threads automatically.",
    icon: MessageCircle,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    title: "Follow-Up Reminders",
    description:
      "Never miss important follow-ups with intelligent reminder scheduling and priority detection.",
    icon: Bell,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    title: "Tone Editor",
    description:
      "Adjust the tone and style of your emails to match the situation and recipient perfectly.",
    icon: Edit3,
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    title: "Grammar Assistance",
    description:
      "Real-time grammar checking and writing suggestions to ensure professional communication.",
    icon: CheckCircle2,
    color: "text-primary",
    bgColor: "bg-primary/10",
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
    question: "What is Webflow and why is it the best website builder?",
    answer:
      "Dealflow is an AI-powered email management platform that helps modern professionals streamline their email workflow. It combines intelligent automation, smart replies, and powerful organization tools to make email management effortless and more productive.",
  },
  {
    question: "What is your favorite template from RRX Templates?",
    answer:
      "We offer a variety of professionally designed email templates that work seamlessly with our AI system. Our templates are optimized for different business scenarios, from sales outreach to customer support, ensuring your communications are always professional and effective.",
  },
  {
    question: "What is your favorite template from RRX Templates?",
    answer:
      "Our AI learns from your communication patterns and preferences to provide increasingly accurate suggestions. The more you use Dealflow, the better it becomes at understanding your unique style and helping you craft the perfect responses for any situation.",
  },
  {
    question: "What is your favorite template from RRX Templates?",
    answer:
      "Yes! Dealflow integrates seamlessly with popular email providers including Gmail, Outlook, and other IMAP-compatible services. Our platform works as an overlay to enhance your existing email setup without requiring you to switch providers.",
  },
  {
    question: "What is your favorite template from RRX Templates?",
    answer:
      "We take security seriously. All data is encrypted in transit and at rest using industry-standard encryption. We are SOC 2 compliant and never store your email content permanently. Our AI processes your data locally and only retains anonymized patterns to improve suggestions.",
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

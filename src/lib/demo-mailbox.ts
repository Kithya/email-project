import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "~/server/db";

export const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER ?? "demo";
export const DEMO_ACCOUNT_NAME = "Executive Demo";

export function isDemoMode() {
  return EMAIL_PROVIDER !== "aurinko";
}

export function isDemoAccount(account: {
  id: string;
  accessToken?: string | null;
}) {
  return (
    account.id.startsWith("demo:") || account.accessToken?.startsWith("demo:")
  );
}

const safeUserKey = (userId: string) =>
  userId.replace(/[^a-z0-9]/gi, "-").toLowerCase();

const demoAccountId = (userId: string, key: string) =>
  key === "executive" ? `demo:${userId}` : `demo:${userId}:${key}`;

const roleAddress = (userId: string, role: string) =>
  `${role}.${safeUserKey(userId)}@demo.dealflow.local`;

type DemoAddress = {
  name: string;
  address: string;
};

type DemoEmail = {
  id: string;
  from: DemoAddress;
  to: DemoAddress[];
  cc?: DemoAddress[];
  bcc?: DemoAddress[];
  replyTo?: DemoAddress[];
  subject: string;
  body: string;
  snippet: string;
  sentAt: Date;
  labels: string[];
  emailLabel: "inbox" | "sent" | "draft";
};

type DemoThread = {
  id: string;
  subject: string;
  done?: boolean;
  emails: DemoEmail[];
};

type DemoAccountSeed = {
  key: "executive" | "sales" | "support";
  name: string;
  ownerName: string;
  emailAddress: string;
};

function daysAgo(days: number, hours = 0) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(9 + hours, 30, 0, 0);
  return date;
}

function threadEmail(
  prefix: string,
  slug: string,
  index: number,
  input: Omit<DemoEmail, "id">,
): DemoEmail {
  return {
    id: `${prefix}:email:${slug}-${index}`,
    ...input,
  };
}

function buildDemoThreads(
  seed: DemoAccountSeed,
  me: DemoAddress,
  accountId: string,
): DemoThread[] {
  const prefix = accountId;
  const maya = { name: "Maya Chen", address: "maya.chen@northstar.example" };
  const leo = { name: "Leo Martin", address: "leo@brightbyte.example" };
  const priya = { name: "Priya Shah", address: "priya@finpilot.example" };
  const jordan = { name: "Jordan Lee", address: "jordan@atlasops.example" };
  const nina = { name: "Nina Park", address: "nina@launchpad.example" };
  const amara = { name: "Amara Okafor", address: "amara@heliofinance.example" };
  const theo = { name: "Theo Grant", address: "theo@meridianlabs.example" };
  const sofia = { name: "Sofia Alvarez", address: "sofia@clearpath.example" };
  const daniel = { name: "Daniel Brooks", address: "daniel@novacare.example" };

  if (seed.key === "sales") {
    return [
      {
        id: `${prefix}:thread:enterprise-pilot`,
        subject: "Enterprise pilot success criteria",
        emails: [
          threadEmail(prefix, "enterprise-pilot", 1, {
            from: amara,
            to: [me],
            subject: "Enterprise pilot success criteria",
            body: "<p>Hi team,</p><p>For the enterprise pilot, we want to track reply quality, response time reduction, and whether reps use the suggested follow-up drafts.</p><p>Can you send the evaluation plan before our Thursday review?</p>",
            snippet:
              "For the enterprise pilot, we want to track reply quality, response time reduction, and follow-up draft adoption.",
            sentAt: daysAgo(0, 0),
            labels: ["inbox", "important"],
            emailLabel: "inbox",
          }),
          threadEmail(prefix, "enterprise-pilot", 2, {
            from: me,
            to: [amara],
            subject: "Re: Enterprise pilot success criteria",
            body: "<p>Hi Amara,</p><p>Absolutely. I will send a short evaluation plan with baseline metrics, adoption targets, and a weekly reporting cadence.</p>",
            snippet:
              "I will send a short evaluation plan with baseline metrics, adoption targets, and a weekly reporting cadence.",
            sentAt: daysAgo(0, 2),
            labels: ["sent"],
            emailLabel: "sent",
          }),
        ],
      },
      {
        id: `${prefix}:thread:pricing-approval`,
        subject: "Pricing approval for Helio Finance",
        emails: [
          threadEmail(prefix, "pricing-approval", 1, {
            from: theo,
            to: [me],
            subject: "Pricing approval for Helio Finance",
            body: "<p>Hello,</p><p>The buyer accepted the annual plan but asked whether the implementation fee can be split across the first two invoices.</p><p>If approved, I can get signature today.</p>",
            snippet:
              "The buyer accepted the annual plan and asked whether the implementation fee can be split across the first two invoices.",
            sentAt: daysAgo(1, 3),
            labels: ["inbox"],
            emailLabel: "inbox",
          }),
        ],
      },
      {
        id: `${prefix}:thread:demo-recap`,
        subject: "Product demo recap",
        emails: [
          threadEmail(prefix, "demo-recap", 1, {
            from: me,
            to: [sofia],
            subject: "Product demo recap",
            body: "<p>Hi Sofia,</p><p>Thanks for joining the demo. The main takeaways were shared inbox triage, AI-assisted replies, and better visibility into unanswered customer messages.</p>",
            snippet:
              "The main takeaways were shared inbox triage, AI-assisted replies, and better visibility into unanswered customer messages.",
            sentAt: daysAgo(3, 1),
            labels: ["sent"],
            emailLabel: "sent",
          }),
        ],
      },
      {
        id: `${prefix}:thread:mutual-action-plan`,
        subject: "Mutual action plan draft",
        emails: [
          threadEmail(prefix, "mutual-action-plan", 1, {
            from: me,
            to: [amara],
            subject: "Mutual action plan draft",
            body: "<p>Hi Amara,</p><p>I am drafting the mutual action plan with security review, pilot kickoff, success metrics, and procurement milestones.</p>",
            snippet:
              "I am drafting the mutual action plan with security review, pilot kickoff, success metrics, and procurement milestones.",
            sentAt: daysAgo(2, 6),
            labels: ["draft"],
            emailLabel: "draft",
          }),
        ],
      },
    ];
  }

  if (seed.key === "support") {
    return [
      {
        id: `${prefix}:thread:urgent-escalation`,
        subject: "Urgent escalation: delayed customer replies",
        emails: [
          threadEmail(prefix, "urgent-escalation", 1, {
            from: daniel,
            to: [me],
            subject: "Urgent escalation: delayed customer replies",
            body: "<p>Hi support,</p><p>NovaCare is seeing delayed responses on billing questions. The customer is asking for a clear owner and a resolution update by end of day.</p>",
            snippet:
              "NovaCare is seeing delayed responses on billing questions and needs a clear owner plus a resolution update by end of day.",
            sentAt: daysAgo(0, 4),
            labels: ["inbox", "important"],
            emailLabel: "inbox",
          }),
          threadEmail(prefix, "urgent-escalation", 2, {
            from: me,
            to: [daniel],
            subject: "Re: Urgent escalation: delayed customer replies",
            body: "<p>Hi Daniel,</p><p>I have assigned Riley as the owner and asked the billing team to provide a status update by 3 PM today.</p>",
            snippet:
              "I assigned Riley as the owner and asked billing to provide a status update by 3 PM today.",
            sentAt: daysAgo(0, 5),
            labels: ["sent"],
            emailLabel: "sent",
          }),
        ],
      },
      {
        id: `${prefix}:thread:feature-request-routing`,
        subject: "Feature request routing",
        emails: [
          threadEmail(prefix, "feature-request-routing", 1, {
            from: sofia,
            to: [me],
            subject: "Feature request routing",
            body: "<p>Hello,</p><p>Can we route recurring feature requests into the product feedback board automatically? The support team is tracking too many themes manually.</p>",
            snippet:
              "Can we route recurring feature requests into the product feedback board automatically?",
            sentAt: daysAgo(1, 0),
            labels: ["inbox"],
            emailLabel: "inbox",
          }),
        ],
      },
      {
        id: `${prefix}:thread:knowledge-base-refresh`,
        subject: "Knowledge base refresh",
        emails: [
          threadEmail(prefix, "knowledge-base-refresh", 1, {
            from: me,
            to: [jordan],
            subject: "Knowledge base refresh",
            body: "<p>Hi Jordan,</p><p>I updated the draft for the billing FAQ and added a new troubleshooting section for authentication issues.</p>",
            snippet:
              "I updated the draft for the billing FAQ and added a new troubleshooting section for authentication issues.",
            sentAt: daysAgo(4, 2),
            labels: ["sent"],
            emailLabel: "sent",
          }),
        ],
      },
    ];
  }

  return [
    {
      id: `${prefix}:thread:proposal-review`,
      subject: "Proposal review and next steps",
      emails: [
        threadEmail(prefix, "proposal-review", 1, {
          from: maya,
          to: [me],
          subject: "Proposal review and next steps",
          body: "<p>Hi there,</p><p>Thanks for sending the revised proposal. The implementation timeline looks good, and the team is aligned on the phased rollout.</p><p>Could you confirm whether the onboarding workshop is included in the first milestone?</p><p>Best,<br/>Maya</p>",
          snippet:
            "Thanks for sending the revised proposal. Could you confirm whether the onboarding workshop is included in the first milestone?",
          sentAt: daysAgo(0, 1),
          labels: ["inbox", "important"],
          emailLabel: "inbox",
        }),
        threadEmail(prefix, "proposal-review", 2, {
          from: me,
          to: [maya],
          subject: "Re: Proposal review and next steps",
          body: "<p>Hi Maya,</p><p>Yes, the onboarding workshop is included in the first milestone. I will send a cleaner milestone breakdown this afternoon.</p><p>Best,<br/>DealFlow Demo</p>",
          snippet:
            "Yes, the onboarding workshop is included in the first milestone. I will send a cleaner milestone breakdown this afternoon.",
          sentAt: daysAgo(0, 2),
          labels: ["sent"],
          emailLabel: "sent",
        }),
      ],
    },
    {
      id: `${prefix}:thread:vendor-follow-up`,
      subject: "Follow-up on vendor contract",
      emails: [
        threadEmail(prefix, "vendor-follow-up", 1, {
          from: leo,
          to: [me],
          cc: [jordan],
          subject: "Follow-up on vendor contract",
          body: "<p>Hello,</p><p>Legal approved the updated vendor contract with one note: please keep the service credit language from section 4.2 unchanged.</p><p>Can you send a final copy before Friday?</p>",
          snippet:
            "Legal approved the updated vendor contract with one note about section 4.2. Can you send a final copy before Friday?",
          sentAt: daysAgo(1, 3),
          labels: ["inbox"],
          emailLabel: "inbox",
        }),
      ],
    },
    {
      id: `${prefix}:thread:board-briefing`,
      subject: "Board briefing package",
      emails: [
        threadEmail(prefix, "board-briefing", 1, {
          from: priya,
          to: [me],
          subject: "Board briefing package",
          body: "<p>Hi,</p><p>Please add a one-page summary covering pipeline health, renewal risk, and the customer support automation work. The board packet closes tomorrow at noon.</p>",
          snippet:
            "Please add a one-page summary covering pipeline health, renewal risk, and customer support automation work.",
          sentAt: daysAgo(2, 1),
          labels: ["inbox"],
          emailLabel: "inbox",
        }),
      ],
    },
    {
      id: `${prefix}:thread:quarterly-update`,
      subject: "Quarterly update draft",
      emails: [
        threadEmail(prefix, "quarterly-update", 1, {
          from: me,
          to: [priya],
          subject: "Quarterly update draft",
          body: "<p>Hi Priya,</p><p>I am drafting the quarterly update and will include customer adoption, expansion revenue, and the support response-time trend.</p>",
          snippet:
            "I am drafting the quarterly update and will include customer adoption, expansion revenue, and support response-time trends.",
          sentAt: daysAgo(2, 5),
          labels: ["draft"],
          emailLabel: "draft",
        }),
      ],
    },
    {
      id: `${prefix}:thread:customer-renewal`,
      subject: "Customer renewal notes",
      done: true,
      emails: [
        threadEmail(prefix, "customer-renewal", 1, {
          from: nina,
          to: [me],
          subject: "Customer renewal notes",
          body: "<p>Hi,</p><p>The customer renewed for another year. They specifically mentioned that faster reply drafting helped the sales team keep momentum during negotiations.</p><p>Thanks again for the quick support.</p>",
          snippet:
            "The customer renewed for another year and mentioned that faster reply drafting helped the sales team keep momentum.",
          sentAt: daysAgo(5, 2),
          labels: ["inbox"],
          emailLabel: "inbox",
        }),
      ],
    },
    {
      id: `${prefix}:thread:sent-intro`,
      subject: "Intro to the analytics team",
      emails: [
        threadEmail(prefix, "sent-intro", 1, {
          from: me,
          to: [jordan],
          subject: "Intro to the analytics team",
          body: "<p>Hi Jordan,</p><p>Looping you in with the analytics team so you can coordinate dashboard requirements and confirm the launch metrics.</p><p>Best,<br/>DealFlow Demo</p>",
          snippet:
            "Looping you in with the analytics team so you can coordinate dashboard requirements and confirm the launch metrics.",
          sentAt: daysAgo(3, 4),
          labels: ["sent"],
          emailLabel: "sent",
        }),
      ],
    },
  ];
}

async function upsertAddress(accountId: string, address: DemoAddress) {
  return db.emailAddress.upsert({
    where: {
      accountId_address: {
        accountId,
        address: address.address,
      },
    },
    update: { name: address.name },
    create: {
      accountId,
      name: address.name,
      address: address.address,
      raw: `${address.name} <${address.address}>`,
    },
  });
}

async function seedAccount(userId: string, seed: DemoAccountSeed) {
  const accountId = demoAccountId(userId, seed.key);
  const me = { name: seed.ownerName, address: seed.emailAddress };

  const account = await db.account.upsert({
    where: { id: accountId },
    update: {
      emailAddress: me.address,
      name: seed.name,
      accessToken: `demo:${userId}:${seed.key}`,
    },
    create: {
      id: accountId,
      userId,
      emailAddress: me.address,
      name: seed.name,
      accessToken: `demo:${userId}:${seed.key}`,
      nextDeltaToken: "demo-seeded",
    },
  });

  const threads = buildDemoThreads(seed, me, account.id);
  for (const thread of threads) {
    const addressMap = new Map<string, { id: string }>();
    for (const email of thread.emails) {
      const addresses = [
        email.from,
        ...email.to,
        ...(email.cc ?? []),
        ...(email.bcc ?? []),
        ...(email.replyTo ?? []),
      ];
      for (const address of addresses) {
        if (!addressMap.has(address.address)) {
          const row = await upsertAddress(account.id, address);
          addressMap.set(address.address, { id: row.id });
        }
      }
    }

    const participantIds = [
      ...new Set([...addressMap.values()].map((a) => a.id)),
    ];
    const lastMessageDate = thread.emails.reduce(
      (latest, email) => (email.sentAt > latest ? email.sentAt : latest),
      thread.emails[0]?.sentAt ?? new Date(),
    );
    const hasInbox = thread.emails.some(
      (email) => email.emailLabel === "inbox",
    );
    const hasDraft = thread.emails.some(
      (email) => email.emailLabel === "draft",
    );
    const hasSent = thread.emails.some((email) => email.emailLabel === "sent");

    await db.thread.upsert({
      where: { id: thread.id },
      update: {
        subject: thread.subject,
        accountId: account.id,
        lastMessageDate,
        participantIds,
        done: thread.done ?? false,
        inboxStatus: hasInbox,
        draftStatus: hasDraft,
        sentStatus: hasSent && !hasInbox && !hasDraft,
      },
      create: {
        id: thread.id,
        accountId: account.id,
        subject: thread.subject,
        lastMessageDate,
        participantIds,
        done: thread.done ?? false,
        inboxStatus: hasInbox,
        draftStatus: hasDraft,
        sentStatus: hasSent && !hasInbox && !hasDraft,
      },
    });

    for (const email of thread.emails) {
      const from = addressMap.get(email.from.address);
      if (!from) continue;

      await db.email.upsert({
        where: { id: email.id },
        update: {
          lastModifiedTime: new Date(),
          subject: email.subject,
          body: email.body,
          bodySnippet: email.snippet,
          sentAt: email.sentAt,
          receivedAt: email.sentAt,
          sysLabels: email.labels,
          emailLabel: email.emailLabel,
          to: {
            set: email.to
              .map((address) => addressMap.get(address.address))
              .filter(Boolean)
              .map((address) => ({ id: address!.id })),
          },
          cc: {
            set: (email.cc ?? [])
              .map((address) => addressMap.get(address.address))
              .filter(Boolean)
              .map((address) => ({ id: address!.id })),
          },
          bcc: {
            set: (email.bcc ?? [])
              .map((address) => addressMap.get(address.address))
              .filter(Boolean)
              .map((address) => ({ id: address!.id })),
          },
          replyTo: {
            set: (email.replyTo ?? [email.from])
              .map((address) => addressMap.get(address.address))
              .filter(Boolean)
              .map((address) => ({ id: address!.id })),
          },
        },
        create: {
          id: email.id,
          threadId: thread.id,
          createdTime: email.sentAt,
          lastModifiedTime: email.sentAt,
          sentAt: email.sentAt,
          receivedAt: email.sentAt,
          internetMessageId: `<${email.id}@demo.dealflow.local>`,
          subject: email.subject,
          sysLabels: email.labels,
          keywords: [],
          sysClassifications: [],
          sensitivity: "normal",
          fromId: from.id,
          hasAttachments: false,
          body: email.body,
          bodySnippet: email.snippet,
          internetHeaders: [],
          nativeProperties: { demo: "true", account: seed.key },
          omitted: [],
          emailLabel: email.emailLabel,
          to: {
            connect: email.to
              .map((address) => addressMap.get(address.address))
              .filter(Boolean)
              .map((address) => ({ id: address!.id })),
          },
          cc: {
            connect: (email.cc ?? [])
              .map((address) => addressMap.get(address.address))
              .filter(Boolean)
              .map((address) => ({ id: address!.id })),
          },
          bcc: {
            connect: (email.bcc ?? [])
              .map((address) => addressMap.get(address.address))
              .filter(Boolean)
              .map((address) => ({ id: address!.id })),
          },
          replyTo: {
            connect: (email.replyTo ?? [email.from])
              .map((address) => addressMap.get(address.address))
              .filter(Boolean)
              .map((address) => ({ id: address!.id })),
          },
        },
      });
    }
  }

  return account;
}

export async function ensureDemoMailboxForUser(userId: string) {
  const clerkUser = await currentUser().catch(() => null);
  const primaryEmail =
    clerkUser?.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    roleAddress(userId, "viewer");
  const firstName = clerkUser?.firstName ?? "Demo";
  const lastName = clerkUser?.lastName ?? "User";
  const displayName = `${firstName} ${lastName}`.trim() || "Demo User";

  await db.user.upsert({
    where: { id: userId },
    update: {
      emailAddress: primaryEmail,
      firstName,
      lastName,
      imageUrl: clerkUser?.imageUrl ?? null,
    },
    create: {
      id: userId,
      emailAddress: primaryEmail,
      firstName,
      lastName,
      imageUrl: clerkUser?.imageUrl ?? null,
    },
  });

  const seeds: DemoAccountSeed[] = [
    {
      key: "executive",
      name: DEMO_ACCOUNT_NAME,
      ownerName: displayName,
      emailAddress: roleAddress(userId, "executive"),
    },
    {
      key: "sales",
      name: "Sales Demo",
      ownerName: "Sales Team",
      emailAddress: roleAddress(userId, "sales"),
    },
    {
      key: "support",
      name: "Support Demo",
      ownerName: "Support Team",
      emailAddress: roleAddress(userId, "support"),
    },
  ];

  const accounts = [];
  for (const seed of seeds) {
    accounts.push(await seedAccount(userId, seed));
  }

  return accounts[0]!;
}

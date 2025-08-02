//  /api/clerk/webhook

import { db } from "~/server/db";

export const POST = async (req: Request) => {
  const { data } = await req.json();
  console.log("Clerk Webhook received", data);

  // const id = data.id;

  // // ✅ Handle missing fields gracefully
  // const emailAddress =
  //   data.email_addresses?.[0]?.email_address ?? `no-email-${id}@example.com`;

  // const firstName = data.first_name ?? "Unknown";
  // const lastName = data.last_name ?? "User";
  // const imageUrl = data.image_url ?? data.profile_image_url ?? null;

  // await db.user.upsert({
  //   where: { id },
  //   update: {
  //     emailAddress,
  //     firstName,
  //     lastName,
  //     imageUrl,
  //   },
  //   create: {
  //     id,
  //     emailAddress,
  //     firstName,
  //     lastName,
  //     imageUrl,
  //   },
  // });

  // console.log(`✅ User processed: ${emailAddress}`);

  const emailAddress = data.email_addresses[0].email_address;
  const firstName = data.first_name;
  const lastName = data.last_name;
  const imageUrl = data.image_url;
  const id = data.id;

  await db.user.create({
    data: {
      id: id,
      emailAddress: emailAddress,
      firstName: firstName,
      lastName: lastName,
      imageUrl: imageUrl,
    },
  });

  console.log("User created");
  return new Response("Webhook Received", { status: 200 });
};

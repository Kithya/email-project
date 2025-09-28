import {
  type EmailAddress,
  type EmailMessage,
  type OutgoingEmailAttachment,
  type SyncResponse,
  type SyncUpdatedResponse,
} from "~/types";
import axios from "axios";
import { syncEmailsToDatabase } from "./sync-to-db";
import { db } from "~/server/db";

export class Account {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async startSync() {
    const response = await axios.post<SyncResponse>(
      "https://api.aurinko.io/v1/email/sync",
      {},
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        params: {
          daysWithin: 1,
          bodyType: "html",
        },
      },
    );
    return response.data;
  }

  async getUpdatedEmails({
    deltaToken,
    pageToken,
  }: {
    deltaToken?: string;
    pageToken?: string;
  }) {
    let params: Record<string, string> = {};
    if (deltaToken) params.deltaToken = deltaToken;
    if (pageToken) params.pageToken = pageToken;

    const response = await axios.get<SyncUpdatedResponse>(
      "https://api.aurinko.io/v1/email/sync/updated",
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        params,
      },
    );
    return response.data;
  }

  async performInitialSync() {
    try {
      // start the sync
      let syncRepsonse = await this.startSync();
      while (!syncRepsonse.ready) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        syncRepsonse = await this.startSync();
      }

      // get the bookmarks delta token
      let storedDeltaToken: string = syncRepsonse.syncUpdatedToken;

      let updatedResponse = await this.getUpdatedEmails({
        deltaToken: storedDeltaToken,
      });

      if (updatedResponse.nextDeltaToken) {
        // sync completed, stored the delta token
        storedDeltaToken = updatedResponse.nextDeltaToken;
      }

      let allEmails: EmailMessage[] = updatedResponse.records;

      // fecth more pages if there are more

      while (updatedResponse.nextPageToken) {
        updatedResponse = await this.getUpdatedEmails({
          pageToken: updatedResponse.nextPageToken,
        });

        allEmails = allEmails.concat(updatedResponse.records);

        if (updatedResponse.nextDeltaToken) {
          // sync completed, stored the delta token
          storedDeltaToken = updatedResponse.nextDeltaToken;
        }
      }

      console.log("initial sync completed", allEmails.length, "emails");

      // stored the delta token for future incremental syncs
      await this.getUpdatedEmails({ deltaToken: storedDeltaToken });

      return {
        emails: allEmails,
        deltaToken: storedDeltaToken,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Error during initial sync:", error.response?.data);
      } else {
        console.error("Unexpected error during initial sync:", error);
      }
    }
  }

  async syncEmails() {
    const account = await db.account.findUnique({
      where: {
        accessToken: this.token,
      },
    });
    if (!account) throw new Error("Invalid token");
    if (!account.nextDeltaToken) throw new Error("No delta token");

    let response = await this.getUpdatedEmails({
      deltaToken: account.nextDeltaToken,
    });
    let allEmails: EmailMessage[] = response.records;
    let storedDeltaToken = account.nextDeltaToken;
    if (response.nextDeltaToken) {
      storedDeltaToken = response.nextDeltaToken;
    }
    while (response.nextPageToken) {
      response = await this.getUpdatedEmails({
        pageToken: response.nextPageToken,
      });
      allEmails = allEmails.concat(response.records);
      if (response.nextDeltaToken) {
        storedDeltaToken = response.nextDeltaToken;
      }
    }

    if (!response) throw new Error("Failed to sync emails");

    try {
      await syncEmailsToDatabase(allEmails, account.id);
    } catch (error) {
      console.log("error", error);
    }

    // console.log('syncEmails', response)
    await db.account.update({
      where: {
        id: account.id,
      },
      data: {
        nextDeltaToken: storedDeltaToken,
      },
    });

    return {
      emails: allEmails,
      deltaToken: storedDeltaToken,
    };
  }

  async sendEmail({
    from,
    subject,
    body,
    inReplyTo,
    references,
    threadId,
    to,
    cc,
    bcc,
    replyTo,
    attachments,
  }: {
    from: EmailAddress;
    subject: string;
    body: string;
    inReplyTo?: string;
    threadId?: string;
    references?: string;
    to: EmailAddress[];
    cc?: EmailAddress[];
    bcc?: EmailAddress[];
    replyTo?: EmailAddress;
    attachments?: OutgoingEmailAttachment[];
  }) {
    try {
      const response = await axios.post(
        "https://api.aurinko.io/v1/email/messages",
        {
          from,
          subject,
          body,
          inReplyTo,
          threadId,
          references,
          to,
          cc,
          bcc,
          replyTo: [replyTo],
          attachments,
        },
        {
          params: {
            returnIds: true,
            bodyType: "html",
          },
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        },
      );

      console.log("Email sent", response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Error sending email:",
          JSON.stringify(error.response?.data, null, 2),
        );
      } else {
        console.error("Error sending email:", error);
      }
      throw error;
    }
  }

  async getAttachmentContent(messageId: string, attachmentId: string) {
    const res = await axios.get<{ content?: string }>(
      `https://api.aurinko.io/v1/email/messages/${messageId}/attachments/${attachmentId}`,
      { headers: { Authorization: `Bearer ${this.token}` } },
    );
    return res.data?.content; // base64
  }
}

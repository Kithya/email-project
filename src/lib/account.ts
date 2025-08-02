import {
  type EmailMessage,
  type SyncResponse,
  type SyncUpdatedResponse,
} from "~/types";
import axios from "axios";

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
}

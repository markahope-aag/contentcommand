import { google } from "googleapis";
import { encrypt, decrypt } from "./crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientEnv, serverEnv } from "@/lib/env";
import type { GoogleOAuthToken } from "@/types/database";

const SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/analytics.readonly",
];

function getOAuth2Client() {
  const sEnv = serverEnv();
  const appUrl = clientEnv().NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/integrations/google/callback`;

  return new google.auth.OAuth2(sEnv.GOOGLE_CLIENT_ID, sEnv.GOOGLE_CLIENT_SECRET, redirectUri);
}

// ── OAuth Flow ──────────────────────────────────────────

export class GoogleAuthManager {
  // Generate the authorization URL for a specific client
  getAuthUrl(clientId: string): string {
    const oauth2Client = getOAuth2Client();
    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
      state: clientId, // Carries client_id through OAuth flow
    });
  }

  // Handle OAuth callback: exchange code for tokens, encrypt and store
  async handleCallback(code: string, clientId: string): Promise<void> {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error("Failed to obtain OAuth tokens");
    }

    const admin = createAdminClient();
    const encryptedAccess = encrypt(tokens.access_token);
    const encryptedRefresh = encrypt(tokens.refresh_token);
    const expiry = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString();

    await admin.from("google_oauth_tokens").upsert(
      {
        client_id: clientId,
        encrypted_access_token: encryptedAccess,
        encrypted_refresh_token: encryptedRefresh,
        token_expiry: expiry,
        scopes: SCOPES,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id" }
    );
  }

  // Get an authenticated OAuth2 client for a specific Content Command client
  async getAuthenticatedClient(clientId: string) {
    const admin = createAdminClient();
    const { data: tokenRecord, error } = await admin
      .from("google_oauth_tokens")
      .select("*")
      .eq("client_id", clientId)
      .single();

    if (error || !tokenRecord) {
      throw new Error(`No Google OAuth tokens found for client ${clientId}`);
    }

    const token = tokenRecord as GoogleOAuthToken;
    const oauth2Client = getOAuth2Client();

    const accessToken = decrypt(token.encrypted_access_token);
    const refreshToken = decrypt(token.encrypted_refresh_token);

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: new Date(token.token_expiry).getTime(),
    });

    // Handle token refresh
    oauth2Client.on("tokens", async (newTokens) => {
      const updates: Record<string, string> = {
        updated_at: new Date().toISOString(),
      };

      if (newTokens.access_token) {
        updates.encrypted_access_token = encrypt(newTokens.access_token);
      }
      if (newTokens.refresh_token) {
        updates.encrypted_refresh_token = encrypt(newTokens.refresh_token);
      }
      if (newTokens.expiry_date) {
        updates.token_expiry = new Date(newTokens.expiry_date).toISOString();
      }

      await admin
        .from("google_oauth_tokens")
        .update(updates)
        .eq("client_id", clientId);
    });

    return oauth2Client;
  }
}

// ── Search Console Client ───────────────────────────────

export class GoogleSearchConsoleClient {
  private authManager = new GoogleAuthManager();

  async getSearchAnalytics(
    clientId: string,
    siteUrl: string,
    options: {
      startDate: string;
      endDate: string;
      dimensions?: string[];
      rowLimit?: number;
    }
  ) {
    const auth = await this.authManager.getAuthenticatedClient(clientId);
    const searchconsole = google.searchconsole({ version: "v1", auth });

    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: options.startDate,
        endDate: options.endDate,
        dimensions: options.dimensions || ["query", "page"],
        rowLimit: options.rowLimit || 100,
      },
    });

    return response.data;
  }

  async getSites(clientId: string) {
    const auth = await this.authManager.getAuthenticatedClient(clientId);
    const searchconsole = google.searchconsole({ version: "v1", auth });

    const response = await searchconsole.sites.list();
    return response.data.siteEntry || [];
  }
}

// ── Analytics Client ────────────────────────────────────

export class GoogleAnalyticsClient {
  private authManager = new GoogleAuthManager();

  async getPageMetrics(
    clientId: string,
    propertyId: string,
    options: {
      startDate: string;
      endDate: string;
      pagePath?: string;
    }
  ) {
    const auth = await this.authManager.getAuthenticatedClient(clientId);
    const analyticsdata = google.analyticsdata({ version: "v1beta", auth });

    const dimensionFilter = options.pagePath
      ? {
          filter: {
            fieldName: "pagePath",
            stringFilter: { value: options.pagePath },
          },
        }
      : undefined;

    const response = await analyticsdata.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [
          { startDate: options.startDate, endDate: options.endDate },
        ],
        dimensions: [{ name: "pagePath" }],
        metrics: [
          { name: "screenPageViews" },
          { name: "averageSessionDuration" },
          { name: "bounceRate" },
        ],
        dimensionFilter,
      },
    });

    return response.data;
  }

  async getTrafficSources(
    clientId: string,
    propertyId: string,
    options: {
      startDate: string;
      endDate: string;
    }
  ) {
    const auth = await this.authManager.getAuthenticatedClient(clientId);
    const analyticsdata = google.analyticsdata({ version: "v1beta", auth });

    const response = await analyticsdata.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [
          { startDate: options.startDate, endDate: options.endDate },
        ],
        dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "screenPageViews" },
        ],
      },
    });

    return response.data;
  }
}

export const googleAuth = new GoogleAuthManager();
export const googleSearchConsole = new GoogleSearchConsoleClient();
export const googleAnalytics = new GoogleAnalyticsClient();

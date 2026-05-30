export {};

declare global {
  interface GoogleCalendarEvent {
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
    summary?: string;
  }

  interface TokenResponse {
    access_token: string;
    error?: string;
  }

  interface TokenClient {
    requestAccessToken: () => void;
  }

  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void;
      client: {
        init: (config: Record<string, string>) => Promise<void>;
        calendar: {
          events: {
            list: (params: Record<string, string | boolean>) => Promise<{
              result: { items: GoogleCalendarEvent[] };
            }>;
          };
        };
        setToken: (token: { access_token: string }) => void;
      };
    };
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: TokenResponse) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

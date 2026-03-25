/// <reference types="gapi" />
/// <reference types="gapi.client.drive-v3" />

declare namespace google.accounts.oauth2 {
  interface TokenClient {
    callback: (response: TokenResponse) => void;
    requestAccessToken: (config?: { prompt?: string }) => void;
  }
  interface TokenResponse {
    access_token: string;
    error?: string;
  }
  function initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
  }): TokenClient;
}

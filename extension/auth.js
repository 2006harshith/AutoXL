// auth.js

const CLIENT_ID = "34167525752-0kc2e62m121d95e8ri0mq2f960n52h51.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly";

export async function getAuthToken() {
  return new Promise((resolve, reject) => {
    const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;
    
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", CLIENT_ID);
    authUrl.searchParams.set("response_type", "token");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", SCOPES);

    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl.toString(),
        interactive: true
      },
      (redirectedTo) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        // Extract token from redirect URL
        const url = new URL(redirectedTo);
        const params = new URLSearchParams(url.hash.substring(1));
        const token = params.get("access_token");

        if (!token) {
          reject(new Error("No access token found"));
          return;
        }

        console.log("Token received:", token);
        resolve(token);
      }
    );
  });
}

export async function removeCachedToken(token) {
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, () => {
      resolve();
    });
  });
}
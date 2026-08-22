import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PublicClientApplication, type Configuration } from "@azure/msal-browser";
import { MsalProvider, useMsal } from "@azure/msal-react";
import App from "./App";
import "./styles.css";

const clientId = import.meta.env.VITE_MSAL_CLIENT_ID;
const tenantId = import.meta.env.VITE_MSAL_TENANT_ID;
const redirectUri = import.meta.env.VITE_MSAL_REDIRECT_URI || window.location.origin;
const apiScope = import.meta.env.VITE_MSAL_API_SCOPE || (clientId ? `api://${clientId}/user_impersonation` : "");

const msalConfig: Configuration = {
  auth: {
    clientId: clientId || "configuration-required",
    authority: `https://login.microsoftonline.com/${tenantId || "organizations"}`,
    redirectUri
  },
  cache: {
    cacheLocation: "sessionStorage"
  }
};

const msal = new PublicClientApplication(msalConfig);

function EntraApp() {
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  return (
    <App
      initialUser={account?.name}
      entraConfigured={Boolean(clientId && tenantId)}
      onEntraSignIn={async () => {
        const result = await instance.loginPopup({ scopes: apiScope ? [apiScope] : ["openid", "profile"] });
        sessionStorage.setItem("claimpilot_access_token", result.accessToken);
        return result.account.name || result.account.username;
      }}
      onSignOut={async () => {
        sessionStorage.removeItem("claimpilot_access_token");
        if (instance.getActiveAccount() || accounts[0]) {
          await instance.logoutPopup({ account: instance.getActiveAccount() || accounts[0] });
        }
      }}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MsalProvider instance={msal}>
      <EntraApp />
    </MsalProvider>
  </StrictMode>
);

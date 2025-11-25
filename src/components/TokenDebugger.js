import React, { useEffect } from "react";
import { useKeycloak } from "@react-keycloak/web";

const TokenDebugger = () => {
  const { keycloak } = useKeycloak();

  useEffect(() => {
    if (keycloak?.authenticated) {
      console.log("🔐 Raw access token:", keycloak.token);
      console.log("📦 Decoded token (parsed):", keycloak.tokenParsed);
      console.log("🧾 Realm roles:", keycloak.tokenParsed?.realm_access?.roles);
      console.log("👤 Preferred username:", keycloak.tokenParsed?.preferred_username);
      console.log("📧 Email:", keycloak.tokenParsed?.email);
      console.log("🪪 Full name:", keycloak.tokenParsed?.name);
    } else {
      console.log("User not authenticated yet.");
    }
  }, [keycloak?.authenticated]);

  return null; // nothing rendered — purely for logging
};

export default TokenDebugger;

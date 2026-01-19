// src/components/DownloadToolCard.jsx
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { notification } from "antd";
import axios from "axios";
import { useKeycloak } from "@react-keycloak/web";
import { downloadZip, reset } from "../reducers/downloadSlice";

export default function DownloadToolCard({
  title,
  icon: Icon,
  filename,
  communityId, // MUST be like "/public" or "/aarhus"
}) {
  const dispatch = useDispatch();
  const { keycloak } = useKeycloak();
  

  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
 const { loading, success, error } = useSelector((s) => s.download);
 const DL_KEY = `dl-${filename}`;

  useEffect(() => {
    let mounted = true;
    

    (async () => {
      if (!keycloak?.authenticated || !keycloak?.token) {
        if (mounted) {
          setAllowed(false);
          setChecking(false);
        }
        return;
      }

      try {
        const res = await axios.get(
          "https://data-platform.cds-probono.eu/rest2hdfs/auth/groups",
          { headers: { token: keycloak.token } }
        );
        const groups = res.data?.groups || [];
        if (mounted) setAllowed(groups.includes(communityId));
      } catch {
        if (mounted) setAllowed(false);
      } finally {
        if (mounted) setChecking(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [keycloak?.authenticated, keycloak?.token, communityId]);

  const disabled = checking || loading || !allowed;

  const handleDownload = () => {
  if (!keycloak?.authenticated) {
    notification.warning({
      message: "Sign in required",
      description: "Please sign in to download this file.",
      placement: "top",
    });
    return;
  }

  if (!allowed) {
    notification.warning({
      message: "Access restricted",
      description: `You need to be in the '${communityId}' group to download this file.`,
      placement: "top",
    });
    return;
  }
 dispatch(reset()); 
  // ✅ Better UX: instant feedback (feels faster)
  notification.open({
  key: DL_KEY,
  message: "Downloading",
  description: `${filename} (≈216 MB) — please keep this tab open.`,
  placement: "top",
  duration: 0, // stays
});

  dispatch(reset());
  dispatch(downloadZip({ filename, communityId, token: keycloak.token }));
  
};
useEffect(() => {
  if (!success) return;

  notification.destroy(DL_KEY); // ✅ close persistent one

  notification.success({
    message: "Download triggered",
    description: `${filename} download has started in your browser.`,
    placement: "top",
    duration: 3,
  });

  dispatch(reset());
}, [success, dispatch, filename, DL_KEY]);

useEffect(() => {
  if (!error) return;

  notification.destroy(DL_KEY); // ✅ close persistent one

  notification.error({
    message: "Download failed",
    description: typeof error === "string" ? error : "Download failed.",
    placement: "top",
    duration: 6,
  });

  dispatch(reset());
}, [error, dispatch, DL_KEY]);

useEffect(() => {
  return () => {
    notification.destroy(DL_KEY);
  };
}, [DL_KEY]);

  return (
  <div
    onClick={!disabled ? handleDownload : undefined}
    className="tool-card"
    style={{
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.7 : 1,
      position: "relative",
    }}
    title={
      checking
        ? "Checking access…"
        : !allowed
        ? `Requires group ${communityId}`
        : `Download ${filename}`
    }
  >
    {/* Icon */}
    <div className="tool-card-icon">
      {loading ? (
        <div className="spinner" />
      ) : (
        <Icon size={36} />
      )}
    </div>

    {/* Title */}
    <h3 className="tool-card-title">{title}</h3>

    {/* Sub info */}
    <p className="tool-card-sub">
  {loading ? "Downloading… (this may take a few minutes)" : allowed ? "ZIP download" : `Group: ${communityId}`}
</p>


    {/* CTA */}
    {!loading && (
      <span className="tool-card-cta">
        Download →
      </span>
    )}
  </div>
);
}

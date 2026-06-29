import { createContext, useContext, useEffect, useState } from "react";
import portalApi, {
  clearPortalSession,
  getPortalToken,
  getStoredPortalContact,
  setPortalSession,
} from "@/lib/portalApi";

const PortalContext = createContext(null);

export function PortalProvider({ children }) {
  const [contact, setContact] = useState(null);
  const [firm, setFirm] = useState(null);
  const [matterIds, setMatterIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getPortalToken();
    if (!token) {
      setContact(getStoredPortalContact());
      setLoading(false);
      return;
    }
    portalApi
      .get("/portal/me")
      .then((r) => {
        setContact(r.data.contact);
        setFirm(r.data.firm);
        setMatterIds(r.data.matter_ids || []);
      })
      .catch(() => {
        clearPortalSession();
        setContact(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const loginWithVerifyResponse = (data) => {
    setPortalSession({ token: data.token, contact: data.contact });
    setContact(data.contact);
    setFirm(data.firm);
    setMatterIds(data.matter_ids || []);
  };

  const logout = () => {
    clearPortalSession();
    setContact(null);
    setFirm(null);
    setMatterIds([]);
    window.location.href = "/portal/login";
  };

  return (
    <PortalContext.Provider
      value={{
        contact,
        firm,
        matterIds,
        loading,
        loginWithVerifyResponse,
        logout,
        isAuthenticated: Boolean(getPortalToken() && contact),
      }}
    >
      {children}
    </PortalContext.Provider>
  );
}

export const usePortal = () => useContext(PortalContext);

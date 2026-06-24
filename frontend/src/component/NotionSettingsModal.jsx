import { useState, useEffect } from "react";

export function NotionSettingsModal({ isOpen, onClose }) {
  const [apiKey, setApiKey] = useState("");
  const [databaseId, setDatabaseId] = useState("");
  const [autoSync, setAutoSync] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(localStorage.getItem("tm:notion_api_key") || "");
      setDatabaseId(localStorage.getItem("tm:notion_database_id") || "");
      setAutoSync(localStorage.getItem("tm:notion_auto_sync") === "true");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleSave(e) {
    e.preventDefault();
    localStorage.setItem("tm:notion_api_key", apiKey.trim());
    localStorage.setItem("tm:notion_database_id", databaseId.trim());
    localStorage.setItem("tm:notion_auto_sync", autoSync ? "true" : "false");
    onClose();
  }

  function handleClear() {
    localStorage.removeItem("tm:notion_api_key");
    localStorage.removeItem("tm:notion_database_id");
    localStorage.removeItem("tm:notion_auto_sync");
    setApiKey("");
    setDatabaseId("");
    setAutoSync(false);
  }

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100
    }}>
      <div className="glass rounded-2xl" style={{ width: "100%", maxWidth: 450, padding: "2rem", border: "1px solid rgba(255,255,255,0.1)", position: "relative" }}>
        
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: "1.2rem" }}>
          ✕
        </button>

        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--foreground)" }}>
          Notion Integration
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)", marginBottom: "1.5rem", lineHeight: 1.5 }}>
          Export your TrueMark originality reports directly to a Notion database. Your credentials are saved securely in your browser's local storage.
        </p>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.5rem" }}>
              Notion Internal Integration Token
            </label>
            <input 
              type="password" 
              value={apiKey} 
              onChange={e => setApiKey(e.target.value)} 
              placeholder="secret_..."
              style={{
                width: "100%", padding: "0.75rem", borderRadius: 8,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--foreground)", fontSize: "0.9rem"
              }}
            />
            <div style={{ fontSize: "0.7rem", color: "var(--muted-foreground)", marginTop: "0.3rem" }}>
              Create an integration at <a href="https://www.notion.so/my-integrations" target="_blank" rel="noreferrer" style={{ color: "oklch(0.7 0.22 270)" }}>notion.so/my-integrations</a>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.5rem" }}>
              Notion Database ID
            </label>
            <input 
              type="text" 
              value={databaseId} 
              onChange={e => setDatabaseId(e.target.value)} 
              placeholder="e.g. 1a2b3c4d5e..."
              style={{
                width: "100%", padding: "0.75rem", borderRadius: 8,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--foreground)", fontSize: "0.9rem"
              }}
            />
            <div style={{ fontSize: "0.7rem", color: "var(--muted-foreground)", marginTop: "0.3rem" }}>
              Remember to invite your integration to the database!
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", marginTop: "0.5rem" }}>
            <input 
              type="checkbox" 
              checked={autoSync} 
              onChange={e => setAutoSync(e.target.checked)} 
              style={{ width: 18, height: 18, accentColor: "oklch(0.7 0.22 270)" }}
            />
            <div>
              <div style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--foreground)" }}>Auto-Sync New Uploads</div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Automatically export new reports when analysis finishes.</div>
            </div>
          </label>

          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <button 
              type="button" 
              onClick={handleClear}
              style={{
                flex: 1, padding: "0.75rem", borderRadius: 8,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--foreground)", fontWeight: 600, cursor: "pointer"
              }}
            >
              Clear
            </button>
            <button 
              type="submit" 
              style={{
                flex: 2, padding: "0.75rem", borderRadius: 8, border: "none",
                background: "linear-gradient(135deg, oklch(0.65 0.22 270), oklch(0.65 0.22 230))",
                color: "white", fontWeight: 600, cursor: "pointer",
                boxShadow: "0 0 15px oklch(0.6 0.22 270 / 0.4)"
              }}
            >
              Save Configuration
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

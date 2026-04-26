import { Check, Loader2, Trash2, HardDrive } from "lucide-react";
import type { StoreOption } from "./useStoreTargets";

type Format = "stories" | "feed" | "reels" | "tv";

interface PublishFooterProps {
  role: "cliente" | "gerente" | "consultor";
  enablePublishing: boolean;
  format: Format;
  publishTargets: StoreOption[];
  selectedTargetIds: string[];
  toggleTarget: (id: string) => void;
  busy: boolean;
  status: "idle" | "generating" | "uploading" | "publishing" | "success" | "error";
  statusMsg: string;
  currentTemplate: any;
  onPublish: () => void;
  onPublishDrive: () => void;
  onClear: () => void;
  onDownload: () => void;
}

export function PublishFooter({
  role,
  enablePublishing,
  format,
  publishTargets,
  selectedTargetIds,
  toggleTarget,
  busy,
  status,
  statusMsg,
  currentTemplate,
  onPublish,
  onPublishDrive,
  onClear,
  onDownload,
}: PublishFooterProps) {
  return (
    <div
      style={{
        padding: "8px 14px 16px",
        paddingBottom: "80px",
        borderTop: "1px solid var(--bdr)",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        flexShrink: 0,
      }}
    >
      {enablePublishing && role !== "consultor" && publishTargets.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label
            style={{
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".07em",
              color: "var(--txt3)",
            }}
          >
            Publicar em
          </label>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {publishTargets.map((t) => {
              const active = selectedTargetIds.includes(t.id);
              const single = publishTargets.length === 1;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => !single && toggleTarget(t.id)}
                  disabled={single}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    padding: "4px 8px",
                    borderRadius: "8px",
                    border: `1.5px solid ${
                      active ? "var(--brand-primary)" : "var(--bdr)"
                    }`,
                    background: active
                      ? "rgba(59,130,246,0.1)"
                      : "transparent",
                    color: active ? "var(--brand-primary)" : "var(--txt2)",
                    fontSize: "10px",
                    fontWeight: 600,
                    cursor: single ? "default" : "pointer",
                    transition: "all .15s",
                  }}
                >
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "3px",
                      border: `1.5px solid ${
                        active ? "var(--brand-primary)" : "var(--bdr)"
                      }`,
                      background: active
                        ? "var(--brand-primary)"
                        : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {active && <Check size={7} strokeWidth={3} color="#fff" />}
                  </span>
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: "6px" }}>
        <button
          onClick={onClear}
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "8px",
            border: "1px solid var(--bdr2)",
            background: "transparent",
            color: "var(--txt3)",
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          }}
        >
          <Trash2 size={12} style={{ display: "inline", marginRight: "4px" }} />
          Limpar
        </button>
        <button
          onClick={onDownload}
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "8px",
            border: "1px solid var(--bdr2)",
            background: "transparent",
            color: "var(--txt3)",
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          }}
        >
          ⬇ Download
        </button>
      </div>
      {format !== "tv" && (
        <>
          <button
            onClick={onPublish}
            disabled={!enablePublishing || busy || !currentTemplate}
            style={{
              width: "100%",
              padding: "7px",
              borderRadius: "10px",
              border: "none",
              background: busy
                ? "#999"
                : "linear-gradient(135deg,var(--brand-primary),var(--brand-secondary,#2D7DD2))",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 700,
              cursor: !enablePublishing || busy || !currentTemplate ? "not-allowed" : "pointer",
              opacity: !enablePublishing || busy || !currentTemplate ? 0.5 : 1,
            }}
          >
            {busy ? (
              <>
                <Loader2
                  size={14}
                  style={{
                    display: "inline",
                    marginRight: "6px",
                    animation: "spin 1s linear infinite",
                  }}
                />
                Publicando...
              </>
            ) : (
              "✈ Publicar no Instagram"
            )}
          </button>
          <button
            onClick={enablePublishing ? onPublishDrive : undefined}
            disabled={!enablePublishing || busy || !currentTemplate}
            style={{
              width: "100%",
              padding: "7px",
              borderRadius: "10px",
              border: "none",
              background: "#334155",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 700,
              cursor: !enablePublishing || busy || !currentTemplate ? "not-allowed" : "pointer",
              opacity: !enablePublishing || busy || !currentTemplate ? 0.5 : 1,
            }}
          >
            <HardDrive size={14} style={{ display: "inline", marginRight: "6px" }} />
            Publicar + Drive
          </button>
        </>
      )}
      {statusMsg && (
        <div
          style={{
            fontSize: "10px",
            textAlign: "center",
            color:
              status === "error"
                ? "#ef4444"
                : status === "success"
                ? "#10b981"
                : "var(--txt3)",
            padding: "4px",
          }}
        >
          {statusMsg}
        </div>
      )}
    </div>
  );
}

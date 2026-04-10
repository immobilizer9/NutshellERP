"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────────
type Message = {
  id: string;
  role: "user" | "model";
  parts: string;
  timestamp: Date;
};

// ── Quick action chips ─────────────────────────────────────────────────────────
const QUICK_CHIPS = [
  "Proofread my text",
  "Check this GK fact",
  "Suggest improvements",
  "Explain this topic for Class 5",
];

// ── Icons ──────────────────────────────────────────────────────────────────────
function SparkleIcon({ size = 20, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
      <path d="M12 2l1.8 5.7L19.5 9l-5.7 1.8L12 16.5l-1.8-5.7L4.5 9l5.7-1.8L12 2z" />
      <path d="M19 14l.9 2.8L22.7 18l-2.8.9L19 21.7l-.9-2.8L15.3 18l2.8-.9L19 14z" opacity="0.6" />
      <path d="M6 16l.6 1.8L8.4 18.6l-1.8.6L6 21l-.6-1.8L3.6 18.6l1.8-.6L6 16z" opacity="0.4" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

// ── Typing indicator (three bouncing dots) ─────────────────────────────────────
function TypingDots() {
  return (
    <div style={{
      display: "inline-flex", gap: 4, padding: "10px 14px",
      background: "var(--bg)", borderRadius: "16px 16px 16px 4px",
      border: "1px solid var(--border-soft)",
    }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "var(--text-muted)", display: "inline-block",
          animation: `aiTypingBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AIChatbot() {
  const pathname = usePathname();

  const [isOpen,    setIsOpen]    = useState(false);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [hasNew,    setHasNew]    = useState(false);
  const [docContext, setDocContext] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  // ── Detect document page and load context ───────────────────────────────────
  useEffect(() => {
    const match = pathname?.match(/\/content\/(?:workspace|documents)\/([^/?#]+)/);
    if (match) {
      const docId = match[1];
      fetch(`/api/content/documents/${docId}`, { credentials: "include" })
        .then((r) => r.json())
        .then((d) => {
          if (d.body) {
            // Strip HTML tags — send plain text as context
            const tmp = document.createElement("div");
            tmp.innerHTML = d.body;
            const text = (tmp.textContent || tmp.innerText || "").trim();
            setDocContext(text.slice(0, 8000)); // cap to avoid huge prompts
          }
        })
        .catch(() => {});
    } else {
      setDocContext(null);
    }
  }, [pathname]);

  // ── Auto-scroll to latest message ──────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, isOpen]);

  // ── Auto-resize textarea ───────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 80) + "px";
  };

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (overrideText?: string) => {
    const content = (overrideText ?? input).trim();
    if (!content || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      parts: content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setLoading(true);

    // Build history from current messages + the new user message
    const history = [...messages, userMsg].map((m) => ({ role: m.role, parts: m.parts }));

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: history,
          context: docContext || undefined,
        }),
      });
      const data = await res.json();

      const aiMsg: Message = {
        id: `a-${Date.now()}`,
        role: "model",
        parts: data.error
          ? data.error
          : (data.reply || "No response received."),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
      if (!isOpen) setHasNew(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "model",
          parts: "Network error. Please check your connection and try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading, docContext, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const isEmpty   = messages.length === 0;
  const isDocPage = !!docContext;
  const canSend   = input.trim().length > 0 && !loading;

  return (
    <>
      {/* ── Animation keyframes ────────────────────────────────────────── */}
      <style>{`
        @keyframes aiTypingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30%            { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes aiPanelIn {
          from { opacity: 0; transform: translateY(14px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes aiBtnPop {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* ── Floating trigger button ─────────────────────────────────────── */}
      {!isOpen && (
        <button
          title="AI Assistant"
          onClick={() => { setIsOpen(true); setHasNew(false); }}
          style={{
            position: "fixed", bottom: 24, right: 24,
            width: 52, height: 52, borderRadius: "50%",
            background: "var(--accent)", border: "none",
            boxShadow: "0 4px 20px rgba(99,102,241,0.50)",
            cursor: "pointer", zIndex: 200,
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "aiBtnPop 0.2s ease forwards",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.09)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 24px rgba(99,102,241,0.6)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)";    (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(99,102,241,0.50)"; }}
        >
          <SparkleIcon size={22} color="white" />
          {/* Unread indicator */}
          {hasNew && (
            <span style={{
              position: "absolute", top: 5, right: 5,
              width: 10, height: 10, borderRadius: "50%",
              background: "#ef4444", border: "2px solid #fff",
            }} />
          )}
        </button>
      )}

      {/* ── Chat panel ─────────────────────────────────────────────────── */}
      {isOpen && (
        <div style={{
          position: "fixed", bottom: 24, right: 24,
          width: 380, height: 520,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          display: "flex", flexDirection: "column",
          overflow: "hidden", zIndex: 200,
          animation: "aiPanelIn 0.2s ease forwards",
        }}>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div style={{
            background: "var(--accent)",
            padding: "11px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.12)",
            display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
          }}>
            <SparkleIcon size={20} color="white" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#fff", lineHeight: 1.2 }}>Nutshell AI</div>
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.72)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Proofreading · Fact-checking · Content help
              </div>
            </div>
            {/* Clear chat */}
            <button
              title="Clear chat"
              onClick={() => setMessages([])}
              style={{
                width: 28, height: 28, borderRadius: 6, border: "none",
                background: "rgba(255,255,255,0.15)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", flexShrink: 0,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.28)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.15)"; }}
            >
              <TrashIcon />
            </button>
            {/* Close */}
            <button
              title="Close"
              onClick={() => setIsOpen(false)}
              style={{
                width: 28, height: 28, borderRadius: 6, border: "none",
                background: "rgba(255,255,255,0.15)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 18, lineHeight: 1, flexShrink: 0,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.28)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.15)"; }}
            >
              ×
            </button>
          </div>

          {/* ── Document context banner ──────────────────────────────────── */}
          {isDocPage && (
            <div style={{
              padding: "6px 14px", fontSize: 12, flexShrink: 0,
              background: "rgba(99,102,241,0.07)",
              borderBottom: "1px solid rgba(99,102,241,0.15)",
              color: "var(--accent)",
            }}>
              📄 I can see your document content
            </div>
          )}

          {/* ── Messages ────────────────────────────────────────────────── */}
          <div style={{ flex: 1, overflow: "auto", padding: "14px 12px 6px", display: "flex", flexDirection: "column" }}>

            {/* Quick chips — only when no messages */}
            {isEmpty && (
              <div style={{ textAlign: "center", marginBottom: "auto" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: "var(--accent-soft)", margin: "12px auto 10px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <SparkleIcon size={22} color="var(--accent)" />
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", marginBottom: 4 }}>
                  Nutshell AI
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 18 }}>
                  How can I help with your content today?
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center" }}>
                  {QUICK_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => sendMessage(chip)}
                      style={{
                        padding: "6px 13px", borderRadius: 99,
                        fontSize: 12.5, cursor: "pointer",
                        background: "var(--accent-soft)", color: "var(--accent)",
                        border: "1px solid var(--accent-border)",
                        fontFamily: "inherit",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.16)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)"; }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg) => (
              <div key={msg.id} style={{
                display: "flex", flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                marginBottom: 10,
              }}>
                <div style={{
                  maxWidth: "82%",
                  padding: "9px 13px",
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: msg.role === "user" ? "var(--accent)" : "var(--bg)",
                  color: msg.role === "user" ? "#fff" : "var(--text-primary)",
                  fontSize: 13.5, lineHeight: 1.55,
                  wordBreak: "break-word", whiteSpace: "pre-wrap",
                  border: msg.role === "model" ? "1px solid var(--border-soft)" : "none",
                }}>
                  {msg.parts}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 3, paddingInline: 4 }}>
                  {fmtTime(msg.timestamp)}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ marginBottom: 10, alignSelf: "flex-start" }}>
                <TypingDots />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input area ──────────────────────────────────────────────── */}
          <div style={{
            padding: "8px 10px", borderTop: "1px solid var(--border)",
            display: "flex", gap: 8, alignItems: "flex-end",
            flexShrink: 0, background: "var(--surface)",
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask me to proofread, fact-check, or help with content..."
              rows={1}
              style={{
                flex: 1, resize: "none",
                border: "1px solid var(--border)", borderRadius: 10,
                padding: "8px 10px", fontSize: 13,
                fontFamily: "inherit", outline: "none", lineHeight: 1.5,
                minHeight: 36, maxHeight: 80,
                background: "var(--bg)", color: "var(--text-primary)",
              }}
              onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; }}
              onBlur={(e)  => { e.target.style.borderColor = "var(--border)"; }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!canSend}
              title="Send (Enter)"
              style={{
                width: 36, height: 36, borderRadius: 10, border: "none",
                background: canSend ? "var(--accent)" : "var(--border)",
                color: canSend ? "#fff" : "var(--text-muted)",
                cursor: canSend ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "background 0.15s, color 0.15s",
              }}
            >
              <SendIcon />
            </button>
          </div>

        </div>
      )}
    </>
  );
}

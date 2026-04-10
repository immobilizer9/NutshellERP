"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
type Doc = {
  id: string; title: string; body: string; status: string; version: number;
  wordCount: number; charCount: number; adminComment: string | null;
  topic: { id: string; title: string; productType: string; classFrom: number; classTo: number };
  author: { id: string; name: string };
  updatedAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function countWords(html: string) {
  const text = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.split(" ").length : 0;
}
function countChars(html: string) {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").length;
}

const ALLOWED_TAGS = new Set([
  "p","div","br","b","strong","i","em","u","s","del",
  "h1","h2","h3","h4","h5","h6","ul","ol","li",
  "a","img","table","tr","td","th","span","hr","blockquote","pre","code",
]);

function cleanPastedHTML(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  function walk(node: Element) {
    // Walk children first (collect so we can safely mutate)
    Array.from(node.children).forEach(walk);

    const tag = node.tagName.toLowerCase();

    // Remove entirely
    if (["script","style","meta","link","head"].includes(tag)) {
      node.parentNode?.removeChild(node); return;
    }
    // Namespaced Word/GDocs tags (contain ":")
    if (tag.includes(":")) {
      const frag = document.createDocumentFragment();
      while (node.firstChild) frag.appendChild(node.firstChild);
      node.parentNode?.replaceChild(frag, node); return;
    }
    // Unwrap non-allowed tags (font, center, etc.)
    if (!ALLOWED_TAGS.has(tag)) {
      const frag = document.createDocumentFragment();
      while (node.firstChild) frag.appendChild(node.firstChild);
      node.parentNode?.replaceChild(frag, node); return;
    }

    // Strip disallowed attributes
    Array.from(node.attributes).forEach(attr => {
      if (attr.name === "style") {
        // Keep only font-weight, font-style, text-decoration, color
        const kept = attr.value.split(";").map(s => s.trim()).filter(s => {
          const prop = s.split(":")[0]?.trim().toLowerCase();
          return ["font-weight","font-style","text-decoration","color"].includes(prop ?? "");
        });
        if (kept.length > 0) node.setAttribute("style", kept.join("; "));
        else node.removeAttribute("style");
      } else if (attr.name === "href" && tag === "a") {
        // keep
      } else if ((attr.name === "src" || attr.name === "alt") && tag === "img") {
        // keep
      } else {
        node.removeAttribute(attr.name);
      }
    });

    // For span: remove entirely if no style left
    if (tag === "span" && !node.getAttribute("style")) {
      const frag = document.createDocumentFragment();
      while (node.firstChild) frag.appendChild(node.firstChild);
      node.parentNode?.replaceChild(frag, node);
    }
  }

  Array.from(doc.body.children).forEach(walk);
  return doc.body.innerHTML;
}

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  DRAFT:       { bg: "#f1f3f4",           text: "#5f6368" },
  SUBMITTED:   { bg: "#fef3c7",           text: "#92400e" },
  APPROVED:    { bg: "#d1fae5",           text: "#065f46" },
  REJECTED:    { bg: "#fee2e2",           text: "#991b1b" },
  DESIGN_SENT: { bg: "#ede9fe",           text: "#5b21b6" },
  PUBLISHED:   { bg: "#dbeafe",           text: "#1e40af" },
};

const FONT_FAMILIES = ["Arial","Georgia","Times New Roman","Courier New","Verdana","Trebuchet MS"];
const VALID_SIZES   = [6,7,8,9,10,11,12,14,16,18,20,24,28,32,36,48,72];
const STYLE_OPTIONS = [
  { label: "Normal text", val: "p"        },
  { label: "Title",       val: "title"    },
  { label: "Subtitle",    val: "subtitle" },
  { label: "Heading 1",   val: "h1"       },
  { label: "Heading 2",   val: "h2"       },
  { label: "Heading 3",   val: "h3"       },
  { label: "Heading 4",   val: "h4"       },
];

const COLOR_SWATCHES = [
  ["#000000","#434343","#666666","#999999","#b7b7b7","#cccccc","#d9d9d9","#ffffff"],
  ["#ff0000","#ff9900","#ffff00","#00ff00","#00ffff","#4a86e8","#0000ff","#9900ff"],
  ["#f4cccc","#fce5cd","#fff2cc","#d9ead3","#d0e4f7","#c9daf8","#cfe2f3","#d9d2e9"],
  ["#ea9999","#f9cb9c","#ffe599","#b6d7a8","#a2c4c9","#a4c2f4","#9fc5e8","#b4a7d6"],
  ["#cc0000","#e69138","#f1c232","#6aa84f","#45818e","#3c78d8","#3d85c8","#674ea7"],
  ["#990000","#b45f06","#bf9000","#38761d","#134f5c","#1155cc","#0b5394","#351c75"],
];

const TABLE_COLORS = [
  "#ffffff","#000000","#f4cccc","#fff2cc","#d9ead3","#cfe2f3",
  "#ea9999","#ffe599","#b6d7a8","#9fc5e8","#ff9900","#674ea7",
];

const SPECIAL_CHAR_GROUPS = [
  { group: "Arrows",      chars: ["←","→","↑","↓","↔","↕","⇐","⇒","⇑","⇓"] },
  { group: "Math",        chars: ["±","×","÷","≠","≈","≤","≥","∞","∑","√","π","°","²","³"] },
  { group: "Currency",    chars: ["₹","$","€","£","¥","¢"] },
  { group: "Punctuation", chars: ["\u201C","\u201D","\u2018","\u2019","…","—","–","•","·","™","©","®"] },
  { group: "Fractions",   chars: ["½","⅓","¼","¾","⅔","⅛","⅜"] },
];

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function Ic({ d, d2, size = 18, fill }: { d: string; d2?: string; size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ?? "none"}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <path d={d} />
      {d2 && <path d={d2} />}
    </svg>
  );
}

const ICONS = {
  undo:       "M3 7v6h6M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13",
  redo:       "M21 7v6h-6M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13",
  alignL:     "M3 6h18M3 12h12M3 18h15",
  alignC:     "M3 6h18M6 12h12M4 18h16",
  alignR:     "M3 6h18M9 12h12M6 18h15",
  alignJ:     "M3 6h18M3 12h18M3 18h18",
  listOl:     "M10 6h11M10 12h11M10 18h11M4 6h.01M4 12h.01M4 18h.01",
  listUl:     "M9 6h13M9 12h13M9 18h13M4 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM4 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM4 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  indent:     "M13 8l4 4-4 4M3 6h18M3 12h8M3 18h18",
  outdent:    "M11 8l-4 4 4 4M3 6h18M11 12h10M3 18h18",
  link:       "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  hr:         "M5 12h14",
  search:     "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z",
  clearFmt:   "M6 18L18 6M8 8h8M8 16h8",
  back:       "M19 12H5M12 5l-7 7 7 7",
  doc:        "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
  check:      "M20 6 9 17l-5-5",
};

// ─── Editor ───────────────────────────────────────────────────────────────────
export default function WorkspaceEditor() {
  const params = useParams();
  const router = useRouter();
  const docId  = params.id as string;

  const [doc,       setDoc]       = useState<Doc | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [title,     setTitle]     = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved">("saved");
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [myId,      setMyId]      = useState<string | null>(null);
  const [isAdmin,   setIsAdmin]   = useState(false);

  const [showFR,    setShowFR]    = useState(false);
  const [frFind,    setFrFind]    = useState("");
  const [frReplace, setFrReplace] = useState("");

  const [bold,      setBold]      = useState(false);
  const [italic,    setItalic]    = useState(false);
  const [underline, setUnderline] = useState(false);
  const [strike,    setStrike]    = useState(false);

  const [actionMsg,     setActionMsg]     = useState({ text: "", ok: false });
  const [processing,    setProcessing]    = useState(false);
  const [showReject,    setShowReject]    = useState(false);
  const [rejectComment, setRejectComment] = useState("");

  const [lastSavedAt,        setLastSavedAt]         = useState<string>("");
  const [openMenu,           setOpenMenu]           = useState<string | null>(null);
  const [openSubmenu,        setOpenSubmenu]         = useState<string | null>(null);
  const [showWordCountBar,   setShowWordCountBar]    = useState(true);
  const [zoom,               setZoom]               = useState(100);
  const [showDocDetails,     setShowDocDetails]      = useState(false);
  const [showWordCountModal, setShowWordCountModal]  = useState(false);
  const [showImagePopup,     setShowImagePopup]      = useState(false);
  const [showLinkPopup,      setShowLinkPopup]       = useState(false);
  const [showTablePicker,    setShowTablePicker]     = useState(false);
  const [showSpecialChars,   setShowSpecialChars]    = useState(false);
  const [aiTask,             setAiTask]             = useState<string | null>(null);
  const [aiLoading,          setAiLoading]          = useState(false);
  const [aiError,            setAiError]            = useState<string | null>(null);
  const [aiHistory,          setAiHistory]          = useState<{ role: "user" | "model"; parts: string }[]>([]);
  const [aiFollowUp,         setAiFollowUp]         = useState("");

  const [alignL,          setAlignL]          = useState(false);
  const [alignC,          setAlignC]          = useState(false);
  const [alignR,          setAlignR]          = useState(false);
  const [alignJ,          setAlignJ]          = useState(false);
  const [listBullet,      setListBullet]      = useState(false);
  const [listNumber,      setListNumber]      = useState(false);
  const [curFontSize,     setCurFontSize]     = useState("11");
  const [curFontFam,      setCurFontFam]      = useState("Arial");
  const [curStyleVal,     setCurStyleVal]     = useState("p");
  const [textColor,       setTextColor]       = useState("#000000");
  const [hlColor,         setHlColor]         = useState("#ffff00");
  const [openLsDrop,      setOpenLsDrop]      = useState(false);
  const [openColorPicker, setOpenColorPicker] = useState<"text"|"highlight"|null>(null);
  const [colorPickerRect, setColorPickerRect] = useState<DOMRect | null>(null);
  const [tablePickerRect, setTablePickerRect] = useState<DOMRect | null>(null);
  const [customHex,       setCustomHex]       = useState("#000000");
  const [linkText,        setLinkText]        = useState("");
  const [linkUrl,         setLinkUrl]         = useState("");
  const [linkInAnchor,    setLinkInAnchor]    = useState(false);
  const [imgUrl,          setImgUrl]          = useState("");
  const [imgAlt,          setImgAlt]          = useState("");
  const [tableHoverR,     setTableHoverR]     = useState(0);
  const [tableHoverC,     setTableHoverC]     = useState(0);
  const [tableGridR,      setTableGridR]      = useState(4);
  const [tableGridC,      setTableGridC]      = useState(4);

  // Find & Replace (enhanced)
  const [frMatchCase,  setFrMatchCase]  = useState(false);
  const [frWholeWord,  setFrWholeWord]  = useState(false);
  const [frMatchTotal, setFrMatchTotal] = useState(0);
  const [frMatchIndex, setFrMatchIndex] = useState(0);

  // Table controls
  const [showTableControls,    setShowTableControls]    = useState(false);
  const [activeTableEl,        setActiveTableEl]        = useState<HTMLTableElement | null>(null);
  const [activeTdEl,           setActiveTdEl]           = useState<HTMLTableCellElement | null>(null);
  const [tableCtrlPos,         setTableCtrlPos]         = useState({ top: 0, left: 0 });
  const [tableCellColorPicker, setTableCellColorPicker] = useState<"bg"|"border"|null>(null);
  const [tableCellColorPos,    setTableCellColorPos]    = useState<DOMRect | null>(null);

  const editorRef       = useRef<HTMLDivElement>(null);
  const titleRef        = useRef<string>(title);
  const docRef          = useRef<Doc | null>(null);
  const saveTimer       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedContentRef = useRef("");
  const savedTitleRef   = useRef("");
  const savedRangeRef   = useRef<Range | null>(null);
  const textColorBtnRef  = useRef<HTMLButtonElement>(null);
  const hlColorBtnRef    = useRef<HTMLButtonElement>(null);
  const tableBtnRef      = useRef<HTMLButtonElement>(null);
  const linkUrlInputRef  = useRef<HTMLInputElement>(null);
  const imgUrlInputRef  = useRef<HTMLInputElement>(null);
  const frFindInputRef  = useRef<HTMLInputElement>(null);
  const frDebounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wcDebounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frMatchCaseRef  = useRef(false);
  const frWholeWordRef  = useRef(false);
  const colResizingRef  = useRef<{ td: HTMLTableCellElement; startX: number; startW: number } | null>(null);
  const hasUnsavedChangesRef = useRef(false);
  const aiPanelBodyRef  = useRef<HTMLDivElement>(null);

  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { docRef.current   = doc;   }, [doc]);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setMyId(d?.user?.id ?? null);
        const modules: string[] = d?.user?.modules ?? [];
        const roles: string[]   = d?.user?.roles   ?? [];
        setIsAdmin(
          modules.includes("USER_MANAGEMENT") ||
          modules.includes("CONTENT_REVIEW")  ||
          roles.includes("ADMIN")
        );
      });
  }, []);

  useEffect(() => {
    console.log("Loading document:", docId);
    fetch(`/api/content/documents/${docId}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then((d) => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        console.log("API response:", JSON.stringify({ id: d.id, title: d.title, bodyLength: d.body?.length, status: d.status }));
        setDoc(d);
        setTitle(d.title ?? "");
        savedTitleRef.current = d.title ?? "";
        setWordCount(d.wordCount ?? 0);
        setCharCount(d.charCount ?? 0);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load document."); setLoading(false); });
  }, [docId]);

  useEffect(() => {
    if (!doc) return;
    const html = doc.body || "<p><br></p>";

    const applyContent = () => {
      if (!editorRef.current) return;
      editorRef.current.innerHTML = html;
      savedContentRef.current = html;
      console.log("innerHTML set, length:", editorRef.current.innerHTML.length);
      try {
        const range = document.createRange();
        const sel   = window.getSelection();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      } catch (_) {}
    };

    if (editorRef.current) {
      applyContent();
    } else {
      const t = setTimeout(applyContent, 100);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id]);

  useEffect(() => {
    const onSelChange = () => {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
        updateToolbarState();
      }
    };
    document.addEventListener("selectionchange", onSelChange);
    return () => document.removeEventListener("selectionchange", onSelChange);
  }, []);

  // ─── Table cursor detection ────────────────────────────────────────────────
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount || !editorRef.current) return;
      let cell: HTMLTableCellElement | null = null;
      let tbl:  HTMLTableElement    | null = null;
      let cur:  Node | null = sel.anchorNode;
      while (cur && cur !== editorRef.current) {
        if (cur.nodeType === Node.ELEMENT_NODE) {
          const el = cur as HTMLElement;
          if ((el.tagName === "TD" || el.tagName === "TH") && !cell) cell = el as HTMLTableCellElement;
          if (el.tagName === "TABLE") { tbl = el as HTMLTableElement; break; }
        }
        cur = cur.parentNode;
      }
      if (cell && tbl) {
        setActiveTdEl(cell);
        setActiveTableEl(tbl);
        const r = tbl.getBoundingClientRect();
        setTableCtrlPos({ top: Math.max(130, r.top - 36), left: r.left });
        setShowTableControls(true);
      } else {
        setShowTableControls(false);
      }
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  const scheduleAutoSave = useCallback(() => {
    setSaveState("unsaved");
    hasUnsavedChangesRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { performSave(); }, 1000);
  }, []);

  const performSave = useCallback(async (opts?: { beacon?: boolean }) => {
    const el   = editorRef.current;
    // Strip any active find-highlight marks before saving
    const raw  = el ? el.innerHTML : (docRef.current?.body ?? "");
    const body = raw.replace(/<mark class="find-highlight"[^>]*>([^<]*)<\/mark>/g, "$1");
    const t    = titleRef.current;
    const d    = docRef.current;
    if (!d) return;

    if (body === savedContentRef.current && t === savedTitleRef.current) {
      setSaveState("saved");
      return;
    }

    const wc = countWords(body);
    const cc = countChars(body);
    setWordCount(wc);
    setCharCount(cc);

    if (opts?.beacon) {
      const fd = new FormData();
      fd.append("documentId", d.id);
      fd.append("title", t);
      fd.append("body",  body);
      navigator.sendBeacon("/api/content/documents/beacon", fd);
      return;
    }

    setSaveState("saving");
    console.log("Saving:", { id: d.id, bodyLength: body.length, title: t });
    try {
      const res = await fetch("/api/content/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: d.id, title: t, docBody: body, wordCount: wc, charCount: cc }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error("Save failed: " + res.status + " " + errText);
      }
      savedContentRef.current = body;
      savedTitleRef.current   = t;
      hasUnsavedChangesRef.current = false;
      setSaveState("saved");
      console.log("Save successful");
      const now = new Date();
      setLastSavedAt(`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`);
    } catch (err) {
      console.error("Save error:", err);
      setSaveState("unsaved");
    }
  }, []);

  // ─── AI task runner ───────────────────────────────────────────────────────
  const runAiTask = useCallback(async (task: string) => {
    const text = editorRef.current?.innerText?.trim() ?? "";
    if (!text) {
      setAiHistory([]);
      setAiError("empty");
      setAiLoading(false);
      return;
    }
    let prompt = "";
    if (task === "proofread") {
      prompt = "Please proofread this document. List every grammar, spelling, punctuation and style error you find. For each error, show: the original text, what is wrong, and the corrected version. Be thorough.\n\nDocument:\n" + text;
    } else if (task === "factcheck") {
      prompt = "Please fact-check this GK (General Knowledge) content written for Indian school students Class 1 to Class 8. For each factual claim, verify if it is correct. List any errors with the correct information. Also flag anything that seems outdated or ambiguous.\n\nDocument:\n" + text;
    } else {
      prompt = "Please suggest improvements to make this content more engaging, clearer, and better suited for school students. Focus on: clarity, age-appropriate language, engagement, and structure.\n\nDocument:\n" + text;
    }
    const initMsg: { role: "user" | "model"; parts: string } = { role: "user", parts: prompt };
    setAiHistory([initMsg]);
    setAiError(null);
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages: [initMsg] }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setAiError(data.error || "AI unavailable. Please try again.");
      } else {
        setAiHistory([initMsg, { role: "model", parts: data.reply }]);
      }
    } catch {
      setAiError("AI unavailable. Please try again.");
    } finally {
      setAiLoading(false);
    }
  }, []);

  // ─── Column resize (document-level drag) ──────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!colResizingRef.current) return;
      const delta = e.clientX - colResizingRef.current.startX;
      const newW  = Math.max(30, colResizingRef.current.startW + delta);
      colResizingRef.current.td.style.width    = `${newW}px`;
      colResizingRef.current.td.style.minWidth = `${newW}px`;
    };
    const onUp = () => {
      if (!colResizingRef.current) return;
      colResizingRef.current = null;
      scheduleAutoSave();
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    };
  }, [scheduleAutoSave]);

  useEffect(() => {
    const onUnload = () => {
      if (!hasUnsavedChangesRef.current) return;
      const fd = new FormData();
      fd.append("documentId", docId);
      fd.append("body", editorRef.current?.innerHTML || "");
      fd.append("title", titleRef.current || "");
      navigator.sendBeacon("/api/content/documents/beacon", fd);
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      performSave({ beacon: true });
    };
  }, [performSave, docId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "h") { e.preventDefault(); setShowFR(true); setTimeout(() => frFindInputRef.current?.focus(), 50); }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        const sel = window.getSelection();
        const selText = sel && !sel.isCollapsed ? sel.toString() : "";
        let inAnchor = false;
        if (sel && sel.rangeCount > 0) {
          const n = sel.getRangeAt(0).commonAncestorContainer;
          inAnchor = !!(n.nodeType === Node.ELEMENT_NODE ? n as Element : (n as Node).parentElement)?.closest("a");
        }
        setLinkText(selText);
        setLinkUrl("");
        setLinkInAnchor(inAnchor);
        setShowLinkPopup(true);
        setTimeout(() => linkUrlInputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        clearFRHighlights(); setFrMatchTotal(0); setFrMatchIndex(0);
        setShowFR(false); setShowReject(false); setOpenMenu(null); setOpenSubmenu(null);
        setShowDocDetails(false); setShowWordCountModal(false); setOpenColorPicker(null);
        setShowLinkPopup(false); setShowImagePopup(false); setShowTablePicker(false); setShowSpecialChars(false);
        setTableCellColorPicker(null); setAiTask(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); performSave(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [performSave]);

  useEffect(() => {
    const handler = () => { setOpenMenu(null); setOpenSubmenu(null); setOpenLsDrop(false); setOpenColorPicker(null); setShowLinkPopup(false); setShowImagePopup(false); setShowTablePicker(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-run AI task when panel opens; reset when it closes
  useEffect(() => {
    if (!aiTask) {
      setAiHistory([]);
      setAiError(null);
      setAiLoading(false);
      setAiFollowUp("");
      return;
    }
    runAiTask(aiTask);
  }, [aiTask, runAiTask]);

  // Auto-scroll AI panel to bottom when history grows
  useEffect(() => {
    if (aiPanelBodyRef.current) {
      aiPanelBodyRef.current.scrollTo({ top: aiPanelBodyRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [aiHistory, aiLoading]);

  function onEditorInput() {
    scheduleAutoSave();
    if (wcDebounceRef.current) clearTimeout(wcDebounceRef.current);
    wcDebounceRef.current = setTimeout(() => {
      const text = editorRef.current?.innerText || "";
      const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
      const chars = text.length;
      setWordCount(words);
      setCharCount(chars);
    }, 500);
  }

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    if (!savedRangeRef.current) {
      editorRef.current?.focus();
      return;
    }
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  }

  function updateToolbarState() {
    try {
      setBold(document.queryCommandState("bold"));
      setItalic(document.queryCommandState("italic"));
      setUnderline(document.queryCommandState("underline"));
      setStrike(document.queryCommandState("strikeThrough"));
      setAlignL(document.queryCommandState("justifyLeft"));
      setAlignC(document.queryCommandState("justifyCenter"));
      setAlignR(document.queryCommandState("justifyRight"));
      setAlignJ(document.queryCommandState("justifyFull"));
      setListBullet(document.queryCommandState("insertUnorderedList"));
      setListNumber(document.queryCommandState("insertOrderedList"));
      const blockTag = document.queryCommandValue("formatBlock").toLowerCase();
      const sel2 = window.getSelection();
      if (sel2 && sel2.rangeCount > 0) {
        const anc = sel2.getRangeAt(0).commonAncestorContainer;
        const blockEl = (anc.nodeType === Node.ELEMENT_NODE ? anc as Element : anc.parentElement)
          ?.closest("h1,h2,h3,h4,p,div") as HTMLElement | null;
        if (blockEl?.classList.contains("doc-title")) setCurStyleVal("title");
        else if (blockEl?.classList.contains("doc-subtitle")) setCurStyleVal("subtitle");
        else setCurStyleVal(blockTag || "p");
      }
      const fn = document.queryCommandValue("fontName");
      if (fn) setCurFontFam(fn.replace(/"/g, "").split(",")[0].trim());
    } catch (e) {}
  }

  async function handleBack() {
    const el   = editorRef.current;
    const body = el ? el.innerHTML : (docRef.current?.body ?? "");
    const t    = titleRef.current;
    const d    = docRef.current;
    if (d && (body !== savedContentRef.current || t !== savedTitleRef.current)) {
      const wc = countWords(body);
      const cc = countChars(body);
      await fetch("/api/content/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        keepalive: true,
        body: JSON.stringify({ id: d.id, title: t, docBody: body, wordCount: wc, charCount: cc }),
      }).catch(() => {});
    }
    router.back();
  }

  function exec(cmd: string, value?: string | null) {
    restoreSelection();
    try {
      document.execCommand(cmd, false, value !== undefined && value !== null ? value : null as unknown as string);
    } catch (e) {
      console.error("execCommand failed:", cmd, e);
    }
    editorRef.current?.focus();
    saveSelection();
    updateToolbarState();
    scheduleAutoSave();
  }

  function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const html  = e.clipboardData.getData("text/html");
    const plain = e.clipboardData.getData("text/plain");
    if (html) {
      const cleaned = cleanPastedHTML(html);
      document.execCommand("insertHTML", false, cleaned);
    } else {
      const escaped = plain
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n\n+/g, "</p><p>")
        .replace(/\n/g, "<br>");
      document.execCommand("insertHTML", false, `<p>${escaped}</p>`);
    }
    scheduleAutoSave();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const ctrl = e.ctrlKey || e.metaKey;

    // Tab / Shift+Tab
    if (e.key === "Tab") {
      e.preventDefault();
      const sel = window.getSelection();
      const inList = !!(sel?.anchorNode && (
        (sel.anchorNode.nodeType === Node.ELEMENT_NODE ? sel.anchorNode as Element : (sel.anchorNode as Node).parentElement)
          ?.closest("li")
      ));
      if (inList) {
        exec(e.shiftKey ? "outdent" : "indent");
      } else if (!e.shiftKey) {
        exec("insertHTML", "&nbsp;&nbsp;&nbsp;&nbsp;");
      }
      return;
    }

    if (!ctrl) return;

    switch (e.key) {
      case "b": e.preventDefault(); exec("bold"); break;
      case "i": e.preventDefault(); exec("italic"); break;
      case "u": e.preventDefault(); exec("underline"); break;
      case "z": e.preventDefault(); exec(e.shiftKey ? "redo" : "undo"); break;
      case "y": e.preventDefault(); exec("redo"); break;
      case "a": e.preventDefault(); exec("selectAll"); break;
      case "p": e.preventDefault(); window.print(); break;
      case "]": e.preventDefault(); exec("indent"); break;
      case "[": e.preventDefault(); exec("outdent"); break;
      case "L": case "l":
        if (e.shiftKey) { e.preventDefault(); exec("justifyLeft"); }
        break;
      case "E": case "e":
        if (e.shiftKey) { e.preventDefault(); exec("justifyCenter"); }
        break;
      case "R": case "r":
        if (e.shiftKey) { e.preventDefault(); exec("justifyRight"); }
        break;
      case "J": case "j":
        if (e.shiftKey) { e.preventDefault(); exec("justifyFull"); }
        break;
      case "7":
        if (e.shiftKey) { e.preventDefault(); exec("insertOrderedList"); }
        break;
      case "8":
        if (e.shiftKey) { e.preventDefault(); exec("insertUnorderedList"); }
        break;
      case "V": case "v":
        if (e.shiftKey) {
          e.preventDefault();
          navigator.clipboard.readText().then(text => {
            restoreSelection();
            exec("insertText", text);
          }).catch(() => {});
        }
        break;
    }
  }

  // ─── Find & Replace helpers ───────────────────────────────────────────────

  function clearFRHighlights() {
    const el = editorRef.current;
    if (!el) return;
    el.querySelectorAll("mark.find-highlight").forEach(mark => {
      mark.parentNode?.replaceChild(document.createTextNode(mark.textContent || ""), mark);
    });
    el.normalize();
  }

  function findMatches(term: string, mcOverride?: boolean, wwOverride?: boolean) {
    const el = editorRef.current;
    if (!el) return;
    clearFRHighlights();
    if (!term.trim()) { setFrMatchTotal(0); setFrMatchIndex(0); return; }
    const mc = mcOverride !== undefined ? mcOverride : frMatchCaseRef.current;
    const ww = wwOverride !== undefined ? wwOverride : frWholeWordRef.current;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = ww ? `\\b${escaped}\\b` : escaped;
    let re: RegExp;
    try { re = new RegExp(pattern, mc ? "g" : "gi"); } catch { return; }

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        return (n.parentElement as HTMLElement)?.classList.contains("find-highlight")
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });
    const textNodes: Text[] = [];
    let n: Node | null = walker.nextNode();
    while (n) { textNodes.push(n as Text); n = walker.nextNode(); }

    let count = 0;
    for (const tn of textNodes) {
      const text = tn.nodeValue || "";
      re.lastIndex = 0;
      if (!re.test(text)) continue;
      re.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0, m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const mark = document.createElement("mark");
        mark.className = "find-highlight";
        mark.dataset.matchIndex = String(count++);
        mark.textContent = m[0];
        frag.appendChild(mark);
        last = m.index + m[0].length;
        if (m[0].length === 0) { re.lastIndex++; }
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      tn.parentNode?.replaceChild(frag, tn);
    }

    setFrMatchTotal(count);
    if (count > 0) {
      setFrMatchIndex(1);
      const first = el.querySelector('mark.find-highlight[data-match-index="0"]') as HTMLElement | null;
      if (first) { first.dataset.active = "true"; first.scrollIntoView({ block: "center" }); }
    } else {
      setFrMatchIndex(0);
    }
  }

  function navigateFRMatch(dir: 1 | -1) {
    const el = editorRef.current;
    if (!el || frMatchTotal === 0) return;
    const cur = el.querySelector('mark.find-highlight[data-active="true"]') as HTMLElement | null;
    if (cur) delete cur.dataset.active;
    const newIdx = ((frMatchIndex - 1 + dir + frMatchTotal) % frMatchTotal);
    setFrMatchIndex(newIdx + 1);
    const next = el.querySelector(`mark.find-highlight[data-match-index="${newIdx}"]`) as HTMLElement | null;
    if (next) { next.dataset.active = "true"; next.scrollIntoView({ block: "center" }); }
  }

  function replaceFROne() {
    const el = editorRef.current;
    if (!el || frMatchTotal === 0) return;
    const mark = el.querySelector(`mark.find-highlight[data-match-index="${frMatchIndex - 1}"]`);
    if (!mark) return;
    mark.parentNode?.replaceChild(document.createTextNode(frReplace), mark);
    findMatches(frFind);
    scheduleAutoSave();
  }

  function replaceFRAll() {
    const el = editorRef.current;
    if (!el || !frFind.trim()) return;
    clearFRHighlights();
    const escaped = frFind.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = frWholeWordRef.current ? `\\b${escaped}\\b` : escaped;
    let re: RegExp;
    try { re = new RegExp(pattern, frMatchCaseRef.current ? "g" : "gi"); } catch { return; }
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let nd: Node | null = walker.nextNode();
    while (nd) { nodes.push(nd as Text); nd = walker.nextNode(); }
    nodes.forEach(tn => {
      if (re.test(tn.nodeValue || "")) { re.lastIndex = 0; tn.nodeValue = (tn.nodeValue || "").replace(re, frReplace); }
    });
    setFrMatchTotal(0); setFrMatchIndex(0);
    scheduleAutoSave();
  }

  async function sendAiFollowUp() {
    if (!aiFollowUp.trim() || aiLoading) return;
    const userMsg: { role: "user" | "model"; parts: string } = { role: "user", parts: aiFollowUp.trim() };
    const newHistory = [...aiHistory, userMsg];
    setAiHistory(newHistory);
    setAiFollowUp("");
    setAiError(null);
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages: newHistory }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setAiError(data.error || "AI unavailable. Please try again.");
      } else {
        setAiHistory([...newHistory, { role: "model", parts: data.reply }]);
      }
    } catch {
      setAiError("AI unavailable. Please try again.");
    } finally {
      setAiLoading(false);
    }
  }

  function downloadAs(ext: "html" | "txt") {
    const el = editorRef.current;
    if (!el) return;
    const content = ext === "html" ? el.innerHTML : el.innerText;
    const blob    = new Blob([content], { type: ext === "html" ? "text/html" : "text/plain" });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement("a");
    a.href        = url;
    a.download    = `${titleRef.current || "document"}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function applyLineHeight(lh: string) {
    const el = editorRef.current;
    if (!el) return;
    restoreSelection();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const anc   = range.commonAncestorContainer;
      const block = (anc.nodeType === Node.ELEMENT_NODE ? anc as Element : anc.parentElement)
        ?.closest("p,h1,h2,h3,h4,div,li") as HTMLElement | null;
      if (block && el.contains(block)) { block.style.lineHeight = lh; scheduleAutoSave(); return; }
    }
    el.style.lineHeight = lh;
    scheduleAutoSave();
  }

  function applyFontSize(size: string) {
    const n = parseInt(size);
    if (isNaN(n) || n < 1 || n > 400) return;
    restoreSelection();
    document.execCommand("fontSize", false, "7");
    editorRef.current?.querySelectorAll("font[size='7']").forEach((el) => {
      (el as HTMLElement).removeAttribute("size");
      (el as HTMLElement).style.fontSize = `${n}pt`;
    });
    editorRef.current?.focus();
    saveSelection();
    setCurFontSize(String(n));
    scheduleAutoSave();
  }

  function stepFontSize(dir: 1 | -1) {
    const cur = parseInt(curFontSize) || 11;
    const idx = VALID_SIZES.indexOf(cur);
    let next: number;
    if (idx === -1) {
      next = dir === 1
        ? (VALID_SIZES.find(s => s > cur) ?? VALID_SIZES[VALID_SIZES.length - 1])
        : ([...VALID_SIZES].reverse().find(s => s < cur) ?? VALID_SIZES[0]);
    } else {
      next = VALID_SIZES[Math.max(0, Math.min(VALID_SIZES.length - 1, idx + dir))];
    }
    applyFontSize(String(next));
  }

  function applyStyle(val: string) {
    if (!editorRef.current) return;
    restoreSelection();
    if (val === "title") {
      document.execCommand("formatBlock", false, "h1");
      const s = window.getSelection();
      if (s && s.rangeCount > 0) {
        const n = s.getRangeAt(0).commonAncestorContainer;
        const el = (n.nodeType === Node.ELEMENT_NODE ? n as Element : n.parentElement)
          ?.closest("h1") as HTMLElement | null;
        if (el) el.className = "doc-title";
      }
    } else if (val === "subtitle") {
      document.execCommand("formatBlock", false, "h2");
      const s = window.getSelection();
      if (s && s.rangeCount > 0) {
        const n = s.getRangeAt(0).commonAncestorContainer;
        const el = (n.nodeType === Node.ELEMENT_NODE ? n as Element : n.parentElement)
          ?.closest("h2") as HTMLElement | null;
        if (el) el.className = "doc-subtitle";
      }
    } else {
      document.execCommand("formatBlock", false, val);
    }
    editorRef.current?.focus();
    saveSelection();
    updateToolbarState();
    setCurStyleVal(val);
    scheduleAutoSave();
  }

  function clearFormatAll() {
    if (!editorRef.current) return;
    restoreSelection();
    document.execCommand("removeFormat");
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_ELEMENT);
      let node: Node | null = walker.currentNode;
      while (node) {
        if (range.intersectsNode(node)) (node as HTMLElement).removeAttribute("style");
        node = walker.nextNode();
      }
    }
    editorRef.current.focus();
    saveSelection();
    updateToolbarState();
    scheduleAutoSave();
  }

  function applyColor(color: string) {
    restoreSelection();
    try {
      if (openColorPicker === "text") {
        document.execCommand("foreColor", false, color);
        setTextColor(color);
      } else {
        if (!document.execCommand("hiliteColor", false, color)) {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
            const range = sel.getRangeAt(0);
            const span = document.createElement("span");
            span.style.backgroundColor = color;
            try { range.surroundContents(span); } catch { /* spans multiple elements */ }
          }
        }
        setHlColor(color);
      }
    } catch (e) {
      console.error("applyColor failed:", e);
    }
    editorRef.current?.focus();
    saveSelection();
    setCustomHex(color);
    setOpenColorPicker(null);
    scheduleAutoSave();
  }

  function openLinkPopup() {
    saveSelection();
    const sel = window.getSelection();
    const selText = sel && !sel.isCollapsed ? sel.toString() : "";
    let inAnchor = false;
    if (sel && sel.rangeCount > 0) {
      const n = sel.getRangeAt(0).commonAncestorContainer;
      inAnchor = !!(n.nodeType === Node.ELEMENT_NODE ? n as Element : (n as Node).parentElement)?.closest("a");
    }
    setLinkText(selText);
    setLinkUrl("");
    setLinkInAnchor(inAnchor);
    setShowLinkPopup(true);
    setTimeout(() => linkUrlInputRef.current?.focus(), 50);
  }

  function applyLink() {
    if (!linkUrl.trim()) return;
    restoreSelection();
    try {
      const sel = window.getSelection();
      if (sel && sel.isCollapsed && linkText.trim()) {
        document.execCommand("insertHTML", false, `<a href="${linkUrl}">${linkText}</a>`);
      } else {
        document.execCommand("createLink", false, linkUrl);
      }
    } catch (e) {
      console.error("applyLink failed:", e);
    }
    editorRef.current?.focus();
    saveSelection();
    setShowLinkPopup(false);
    scheduleAutoSave();
  }

  function insertTable(rows: number, cols: number) {
    const cell = `<td style="border:1px solid #999;padding:6px 8px;min-width:60px">&nbsp;</td>`;
    const row  = `<tr>${cell.repeat(cols)}</tr>`;
    const html = `<table style="border-collapse:collapse;width:100%;margin:8px 0">${row.repeat(rows)}</table><p><br></p>`;
    exec("insertHTML", html);
    setShowTablePicker(false);
  }

  // ─── Table operation helpers ───────────────────────────────────────────────

  function makeCell(): HTMLTableCellElement {
    const td = document.createElement("td");
    td.style.cssText = "border:1px solid #999;padding:6px 8px;min-width:60px";
    td.innerHTML = "&nbsp;";
    return td;
  }
  function getColIdx(): number {
    if (!activeTdEl) return 0;
    const tr = activeTdEl.closest("tr") as HTMLTableRowElement | null;
    return tr ? Array.from(tr.cells).indexOf(activeTdEl) : 0;
  }

  function tblInsertRowAbove() {
    if (!activeTdEl || !activeTableEl) return;
    const tr = activeTdEl.closest("tr");
    if (!tr) return;
    const cols = activeTableEl.rows[0]?.cells.length || 1;
    const nr = document.createElement("tr");
    for (let i = 0; i < cols; i++) nr.appendChild(makeCell());
    tr.parentNode?.insertBefore(nr, tr);
    scheduleAutoSave();
  }
  function tblInsertRowBelow() {
    if (!activeTdEl || !activeTableEl) return;
    const tr = activeTdEl.closest("tr");
    if (!tr) return;
    const cols = activeTableEl.rows[0]?.cells.length || 1;
    const nr = document.createElement("tr");
    for (let i = 0; i < cols; i++) nr.appendChild(makeCell());
    tr.parentNode?.insertBefore(nr, tr.nextSibling);
    scheduleAutoSave();
  }
  function tblInsertColLeft() {
    if (!activeTdEl || !activeTableEl) return;
    const idx = getColIdx();
    Array.from(activeTableEl.rows).forEach(row => row.insertBefore(makeCell(), row.cells[idx] ?? null));
    scheduleAutoSave();
  }
  function tblInsertColRight() {
    if (!activeTdEl || !activeTableEl) return;
    const idx = getColIdx();
    Array.from(activeTableEl.rows).forEach(row => row.insertBefore(makeCell(), row.cells[idx + 1] ?? null));
    scheduleAutoSave();
  }
  function tblDeleteRow() {
    if (!activeTdEl || !activeTableEl) return;
    if (activeTableEl.rows.length <= 1) { activeTableEl.parentNode?.removeChild(activeTableEl); setShowTableControls(false); }
    else { const tr = activeTdEl.closest("tr"); tr?.parentNode?.removeChild(tr); }
    scheduleAutoSave();
  }
  function tblDeleteCol() {
    if (!activeTdEl || !activeTableEl) return;
    const idx = getColIdx();
    if ((activeTableEl.rows[0]?.cells.length || 0) <= 1) { activeTableEl.parentNode?.removeChild(activeTableEl); setShowTableControls(false); }
    else { Array.from(activeTableEl.rows).forEach(row => { if (row.cells[idx]) row.removeChild(row.cells[idx]); }); }
    scheduleAutoSave();
  }
  function tblDeleteTable() {
    if (!activeTableEl) return;
    activeTableEl.parentNode?.removeChild(activeTableEl);
    setShowTableControls(false);
    scheduleAutoSave();
  }
  function tblSetBgColor(color: string) {
    if (!activeTdEl) return;
    activeTdEl.style.backgroundColor = color;
    setTableCellColorPicker(null);
    scheduleAutoSave();
  }
  function tblSetBorderColor(color: string) {
    if (!activeTdEl || !activeTableEl) return;
    Array.from(activeTableEl.querySelectorAll("td,th")).forEach(c => { (c as HTMLElement).style.borderColor = color; });
    setTableCellColorPicker(null);
    scheduleAutoSave();
  }

  // ─── Column resize (paper-level mouse events) ─────────────────────────────

  function onPaperMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (colResizingRef.current) return; // drag in progress — document listener handles it
    const td = (e.target as Element).closest?.("td,th") as HTMLTableCellElement | null;
    const paper = e.currentTarget as HTMLDivElement;
    if (td) {
      const rect = td.getBoundingClientRect();
      paper.style.cursor = rect.right - e.clientX <= 4 ? "col-resize" : "";
    } else {
      paper.style.cursor = "";
    }
  }
  function onPaperMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const td = (e.target as Element).closest?.("td,th") as HTMLTableCellElement | null;
    if (!td) return;
    const rect = td.getBoundingClientRect();
    if (rect.right - e.clientX <= 4) {
      e.preventDefault();
      colResizingRef.current = { td, startX: e.clientX, startW: td.offsetWidth };
    }
  }

  async function reviewAction(action: string, comment?: string) {
    if (!doc) return;
    setProcessing(true); setActionMsg({ text: "", ok: false });
    const payload: any = { id: doc.id, action };
    if (comment !== undefined) payload.adminComment = comment;
    const res  = await fetch("/api/content/documents", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setActionMsg({ text: data.error || "Failed", ok: false });
    } else {
      setDoc((d) => d ? { ...d, status: data.status, adminComment: data.adminComment } : d);
      setActionMsg({ text: "Done.", ok: true });
      setShowReject(false);
    }
    setProcessing(false);
  }

  const isOwner = myId && doc?.author?.id === myId;
  const canEdit = myId === null ? true : Boolean(isOwner || isAdmin);
  const statusC = doc ? (STATUS_COLOR[doc.status] ?? { bg: "#f1f3f4", text: "#5f6368" }) : null;

  // ─── Menu bar styles ──────────────────────────────────────────────────────
  const mbDropSt: React.CSSProperties = {
    position: "absolute", top: 32, left: 0, background: "#fff",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)", borderRadius: 2, minWidth: 220, zIndex: 200,
    paddingTop: 4, paddingBottom: 4,
  };
  const mbItemSt: React.CSSProperties = {
    height: 28, padding: "0 8px 0 32px", fontSize: 13, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    color: "#202124", whiteSpace: "nowrap",
  };
  const mbKbSt: React.CSSProperties = { color: "#999", fontSize: 12, marginLeft: 24 };
  const mbDivSt: React.CSSProperties = { height: 1, background: "#e0e0e0", margin: "4px 0" };
  const mbLblSt = (active: boolean): React.CSSProperties => ({
    padding: "0 12px", height: 32, display: "flex", alignItems: "center",
    cursor: "pointer", background: active ? "#f1f3f4" : "transparent",
    borderRadius: 2, whiteSpace: "nowrap",
  });

  // ─── LOADING / ERROR ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8f9fa", gap: 16 }}>
        <div style={{ width: 40, height: 40, border: "3px solid #e8eaed", borderTopColor: "#1a73e8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#5f6368", fontSize: 14 }}>Opening document…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f9fa", flexDirection: "column", gap: 12 }}>
        <p style={{ color: "#d93025", fontSize: 14 }}>{error}</p>
        <button onClick={handleBack} style={{ padding: "8px 20px", borderRadius: 4, border: "1px solid #dadce0", background: "#fff", cursor: "pointer", fontSize: 13, color: "#3c4043" }}>Go Back</button>
      </div>
    );
  }

  return (
    <>
      {/* ── Editor-scoped content styles ── */}
      <style>{`
        .doc-editor { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #202124; }
        .doc-editor h1 { font-size: 20pt; font-weight: 400; margin: 20px 0 6px; color: #202124; }
        .doc-editor h2 { font-size: 16pt; font-weight: 400; margin: 16px 0 4px; color: #202124; }
        .doc-editor h3 { font-size: 14pt; font-weight: 700; margin: 14px 0 4px; color: #202124; }
        .doc-editor h4 { font-size: 12pt; font-weight: 700; margin: 12px 0 4px; color: #202124; }
        .doc-editor p  { margin: 0 0 8px; }
        .doc-editor ul, .doc-editor ol { padding-left: 24px; margin: 0 0 8px; }
        .doc-editor li { margin-bottom: 4px; }
        .doc-editor a  { color: #1a73e8; }
        .doc-editor hr { border: none; border-top: 1px solid #dadce0; margin: 16px 0; }
        .doc-editor blockquote { border-left: 3px solid #dadce0; margin: 8px 0; padding: 4px 16px; color: #5f6368; }
        .doc-editor [contenteditable]:focus { outline: none; }
        .doc-editor .doc-title    { font-size: 26pt; font-weight: 400; margin: 20px 0 6px; }
        .doc-editor .doc-subtitle { font-size: 14pt; font-weight: 400; color: #5f6368; margin: 0 0 16px; }
        .tb-btn:hover  { background: #e8eaed !important; }
        .tb2-btn { height: 28px; min-width: 28px; border-radius: 4px; padding: 0 6px; border: none; cursor: pointer; background: transparent; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; color: #3c4043; font-size: 13px; font-family: inherit; }
        .tb2-btn:hover { background: #f1f3f4; }
        .tb2-btn.active { background: #e8f0fe !important; color: #1a73e8 !important; }
        .tb2-sep { width: 1px; height: 24px; background: #e0e0e0; margin: 0 4px; flex-shrink: 0; align-self: center; }
        .tb2-drop { height: 28px; border: 1px solid transparent; border-radius: 4px; background: transparent; cursor: pointer; font-size: 13px; color: #3c4043; font-family: inherit; padding: 0 4px; outline: none; flex-shrink: 0; }
        .tb2-drop:hover { background: #f1f3f4; border-color: #dadce0; }
        .mb-item:hover { background: #f1f3f4; }
        .mb-lbl:hover  { background: #f1f3f4; }
        @keyframes ed-spin { to { transform: rotate(360deg); } }
        @keyframes ai-shimmer { 0%,100% { background-position: 200% 0; } 50% { background-position: -200% 0; } }
        .sc-btn:hover { background: #f1f3f4 !important; }
        .ai-tb-btn:hover { background: #ede9fe !important; color: #7c3aed !important; }
        mark.find-highlight { background: #ffff00; border-radius: 1px; color: inherit; }
        mark.find-highlight[data-active="true"] { background: #ff9632; outline: 2px solid #ff6d00; border-radius: 1px; }
        .tbl-ctrl-btn { height: 26px; min-width: 28px; border-radius: 3px; border: none; background: transparent; cursor: pointer; font-size: 11px; color: #3c4043; display: inline-flex; align-items: center; justify-content: center; padding: 0 4px; white-space: nowrap; font-family: inherit; }
        .tbl-ctrl-btn:hover { background: #f1f3f4; }
        .tbl-sep { width: 1px; height: 18px; background: #e0e0e0; margin: 0 3px; flex-shrink: 0; }
        @media print {
          .editor-topbar, .editor-menubar, .editor-toolbar, .editor-wordcount-bar, .status-banner, .find-replace-panel { display: none !important; }
          .editor-document-area { overflow: visible !important; background: white !important; padding: 0 !important; }
          .editor-paper { box-shadow: none !important; margin: 0 !important; padding: 1cm !important; width: 100% !important; min-height: auto !important; }
        }
      `}</style>

      <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#f8f9fa", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ══ Row 1: Header bar ══ */}
        <div className="editor-topbar" style={{ height: 56, flexShrink: 0, background: "#fff", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", gap: 8, padding: "0 8px 0 4px" }}>

          {/* Back */}
          <button
            onClick={handleBack}
            className="tb-btn"
            title="Back"
            style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#5f6368", flexShrink: 0 }}
          >
            <Ic d={ICONS.back} size={20} />
          </button>

          {/* Doc icon */}
          <div style={{ flexShrink: 0, color: "#1a73e8" }}>
            <Ic d={ICONS.doc} size={28} />
          </div>

          {/* Title + breadcrumb */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: "0 1 480px", minWidth: 0 }}>
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); scheduleAutoSave(); }}
              style={{
                fontSize: 16, fontWeight: 400, border: "none", outline: "none",
                background: "transparent", color: "#202124", width: "100%",
                padding: "2px 4px", borderRadius: 4,
                fontFamily: "inherit",
              }}
              onFocus={(e) => { (e.target as HTMLInputElement).style.background = "#f8f9fa"; }}
              onBlur={(e)  => { (e.target as HTMLInputElement).style.background = "transparent"; }}
              placeholder="Untitled document"
            />
            {doc && (
              <div style={{ fontSize: 11, color: "#5f6368", paddingLeft: 4, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {doc.topic.title} · {doc.topic.productType.replace(/_/g, " ")} · Class {doc.topic.classFrom}–{doc.topic.classTo} · v{doc.version}
              </div>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* Save status */}
          <div style={{ fontSize: 12, color: "#5f6368", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {saveState === "saving" && (
              <div style={{ width: 14, height: 14, border: "2px solid #dadce0", borderTopColor: "#1a73e8", borderRadius: "50%", animation: "ed-spin 0.8s linear infinite" }} />
            )}
            {saveState === "saved" && <Ic d={ICONS.check} size={14} />}
            <span>{saveState === "saving" ? "Saving…" : saveState === "saved" ? "All changes saved" : "Unsaved changes"}</span>
          </div>

          {/* Word count */}
          <div style={{ fontSize: 12, color: "#5f6368", flexShrink: 0, paddingRight: 4 }}>
            {wordCount.toLocaleString()} words
          </div>

          {/* Status badge */}
          {statusC && doc && (
            <span style={{
              fontSize: 11.5, fontWeight: 600, padding: "3px 12px", borderRadius: 12,
              background: statusC.bg, color: statusC.text, flexShrink: 0,
              letterSpacing: "0.02em",
            }}>
              {doc.status.replace(/_/g, " ")}
            </span>
          )}

          {/* Action buttons */}
          {doc && (
            <>
              {(doc.status === "DRAFT" || doc.status === "REJECTED") && isOwner && (
                <button
                  onClick={async () => { await performSave(); reviewAction(doc.status === "REJECTED" ? "resubmit" : "submit"); }}
                  disabled={processing}
                  style={{ height: 36, padding: "0 18px", borderRadius: 18, border: "none", background: "#1a73e8", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", flexShrink: 0 }}
                >
                  {doc.status === "REJECTED" ? "Resubmit" : "Submit for review"}
                </button>
              )}
              {isAdmin && doc.status === "SUBMITTED" && !showReject && (
                <>
                  <button onClick={() => reviewAction("approve")} disabled={processing}
                    style={{ height: 36, padding: "0 18px", borderRadius: 18, border: "none", background: "#188038", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                    Approve
                  </button>
                  <button onClick={() => setShowReject(true)} disabled={processing}
                    style={{ height: 36, padding: "0 18px", borderRadius: 18, border: "1px solid #dadce0", background: "#fff", color: "#d93025", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                    Reject
                  </button>
                </>
              )}
              {isAdmin && doc.status === "APPROVED" && (
                <button onClick={() => reviewAction("send_to_design")} disabled={processing}
                  style={{ height: 36, padding: "0 18px", borderRadius: 18, border: "none", background: "#6366f1", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                  Send to Design
                </button>
              )}
              {isAdmin && doc.status === "DESIGN_SENT" && (
                <button onClick={() => reviewAction("publish")} disabled={processing}
                  style={{ height: 36, padding: "0 18px", borderRadius: 18, border: "none", background: "#1a73e8", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                  Publish
                </button>
              )}
            </>
          )}
          {actionMsg.text && (
            <span style={{ fontSize: 12, color: actionMsg.ok ? "#188038" : "#d93025", fontWeight: 500, flexShrink: 0 }}>
              {actionMsg.text}
            </span>
          )}
        </div>

        {/* ══ Reject bar ══ */}
        {showReject && (
          <div style={{ flexShrink: 0, padding: "8px 16px", background: "#fff8f8", borderBottom: "1px solid #fad2cf", display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#d93025", fontWeight: 500, flexShrink: 0 }}>Rejection reason:</span>
            <input
              style={{ flex: 1, height: 34, padding: "0 12px", border: "1px solid #dadce0", borderRadius: 4, fontSize: 13, outline: "none", fontFamily: "inherit" }}
              placeholder="Explain why the document is being rejected…"
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              autoFocus
            />
            <button onClick={() => reviewAction("reject", rejectComment)} disabled={!rejectComment.trim() || processing}
              style={{ height: 34, padding: "0 16px", borderRadius: 4, border: "none", background: "#d93025", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              Confirm
            </button>
            <button onClick={() => { setShowReject(false); setRejectComment(""); }}
              style={{ height: 34, padding: "0 14px", borderRadius: 4, border: "1px solid #dadce0", background: "#fff", fontSize: 13, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        )}

        {/* ══ Admin comment banner ══ */}
        {doc?.adminComment && (
          <div className="status-banner" style={{ flexShrink: 0, padding: "8px 20px", background: "#fef7e0", borderBottom: "1px solid #f9e0b0", fontSize: 13, color: "#7a5600", display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontWeight: 600 }}>Feedback:</span>
            <span>{doc.adminComment}</span>
          </div>
        )}

        {/* ══ Row 1.5: Menu Bar ══ */}
        <div
          className="editor-menubar"
          style={{ height: 32, flexShrink: 0, background: "#fff", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", padding: "0 4px", position: "relative", zIndex: 150, fontFamily: "Arial, sans-serif", fontSize: 13, userSelect: "none" }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── FILE ── */}
          <div style={{ position: "relative" }}>
            <div className="mb-lbl" style={mbLblSt(openMenu === "File")} onClick={() => { setOpenMenu(openMenu === "File" ? null : "File"); setOpenSubmenu(null); }} onMouseEnter={() => { if (openMenu) { setOpenMenu("File"); setOpenSubmenu(null); } }}>File</div>
            {openMenu === "File" && (
              <div style={mbDropSt}>
                <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); window.print(); setOpenMenu(null); }}><span>Print</span><span style={mbKbSt}>Ctrl+P</span></div>
                <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); downloadAs("html"); setOpenMenu(null); }}><span>Download as HTML</span></div>
                <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); downloadAs("txt"); setOpenMenu(null); }}><span>Download as Plain Text</span></div>
                <div style={mbDivSt} />
                <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); setShowDocDetails(true); setOpenMenu(null); }}><span>Document details</span></div>
              </div>
            )}
          </div>

          {/* ── EDIT ── */}
          <div style={{ position: "relative" }}>
            <div className="mb-lbl" style={mbLblSt(openMenu === "Edit")} onClick={() => { setOpenMenu(openMenu === "Edit" ? null : "Edit"); setOpenSubmenu(null); }} onMouseEnter={() => { if (openMenu) { setOpenMenu("Edit"); setOpenSubmenu(null); } }}>Edit</div>
            {openMenu === "Edit" && (
              <div style={mbDropSt}>
                <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); exec("undo"); setOpenMenu(null); }}><span>Undo</span><span style={mbKbSt}>Ctrl+Z</span></div>
                <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); exec("redo"); setOpenMenu(null); }}><span>Redo</span><span style={mbKbSt}>Ctrl+Y</span></div>
                <div style={mbDivSt} />
                <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); exec("cut"); setOpenMenu(null); }}><span>Cut</span><span style={mbKbSt}>Ctrl+X</span></div>
                <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); exec("copy"); setOpenMenu(null); }}><span>Copy</span><span style={mbKbSt}>Ctrl+C</span></div>
                <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); editorRef.current?.focus(); navigator.clipboard.readText().then(t => { document.execCommand("insertText", false, t); scheduleAutoSave(); }).catch(() => {}); setOpenMenu(null); }}><span>Paste without formatting</span><span style={mbKbSt}>Ctrl+Shift+V</span></div>
                <div style={mbDivSt} />
                <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); exec("selectAll"); setOpenMenu(null); }}><span>Select all</span><span style={mbKbSt}>Ctrl+A</span></div>
                <div style={mbDivSt} />
                <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); setShowFR(true); setOpenMenu(null); setTimeout(() => frFindInputRef.current?.focus(), 50); }}><span>Find and replace</span><span style={mbKbSt}>Ctrl+H</span></div>
              </div>
            )}
          </div>

          {/* ── VIEW ── */}
          <div style={{ position: "relative" }}>
            <div className="mb-lbl" style={mbLblSt(openMenu === "View")} onClick={() => { setOpenMenu(openMenu === "View" ? null : "View"); setOpenSubmenu(null); }} onMouseEnter={() => { if (openMenu) { setOpenMenu("View"); setOpenSubmenu(null); } }}>View</div>
            {openMenu === "View" && (
              <div style={mbDropSt}>
                <div className="mb-item" style={{ ...mbItemSt, fontWeight: showWordCountBar ? 600 : 400 }} onClick={(e) => { e.stopPropagation(); setShowWordCountBar(b => !b); setOpenMenu(null); }}><span>Show word count</span></div>
                <div style={mbDivSt} />
                {([75, 100, 125, 150] as const).map(z => (
                  <div key={z} className="mb-item" style={{ ...mbItemSt, fontWeight: zoom === z ? 700 : 400 }} onClick={(e) => { e.stopPropagation(); setZoom(z); setOpenMenu(null); }}><span>{z}%</span></div>
                ))}
                <div style={mbDivSt} />
                <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); document.documentElement.requestFullscreen?.().catch(console.error); setOpenMenu(null); }}><span>Full screen</span></div>
              </div>
            )}
          </div>

          {/* ── INSERT ── */}
          <div style={{ position: "relative" }}>
            <div className="mb-lbl" style={mbLblSt(openMenu === "Insert")} onClick={() => { setOpenMenu(openMenu === "Insert" ? null : "Insert"); setOpenSubmenu(null); }} onMouseEnter={() => { if (openMenu) { setOpenMenu("Insert"); setOpenSubmenu(null); } }}>Insert</div>
            {openMenu === "Insert" && (
              <div style={mbDropSt}>
                <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); saveSelection(); setImgUrl(""); setImgAlt(""); setShowImagePopup(true); setOpenMenu(null); setTimeout(() => imgUrlInputRef.current?.focus(), 50); }}><span>Image from URL</span></div>
                <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); exec("insertHorizontalRule"); setOpenMenu(null); }}><span>Horizontal line</span></div>
                <div style={mbDivSt} />
                <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); openLinkPopup(); setOpenMenu(null); }}><span>Link</span><span style={mbKbSt}>Ctrl+K</span></div>
                <div style={mbDivSt} />
                <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); setTablePickerRect(null); setTableHoverR(0); setTableHoverC(0); setTableGridR(4); setTableGridC(4); setShowTablePicker(true); setOpenMenu(null); }}><span>Table</span></div>
                <div style={mbDivSt} />
                <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); setShowSpecialChars(true); setOpenMenu(null); }}><span>Special characters</span></div>
                <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); exec("insertHTML", `<div style="page-break-after:always;border-top:2px dashed #ccc;margin:24px 0;padding-bottom:24px"><span style="color:#999;font-size:11px">Page Break</span></div><p><br></p>`); setOpenMenu(null); }}><span>Page break</span></div>
                <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); exec("insertText", new Date().toLocaleString("en-IN")); setOpenMenu(null); }}><span>Date and time</span></div>
              </div>
            )}
          </div>

          {/* ── FORMAT ── */}
          <div style={{ position: "relative" }}>
            <div className="mb-lbl" style={mbLblSt(openMenu === "Format")} onClick={() => { setOpenMenu(openMenu === "Format" ? null : "Format"); setOpenSubmenu(null); }} onMouseEnter={() => { if (openMenu) { setOpenMenu("Format"); setOpenSubmenu(null); } }}>Format</div>
            {openMenu === "Format" && (
              <div style={mbDropSt}>
                {/* Text submenu */}
                <div className="mb-item" style={{ ...mbItemSt, position: "relative" }} onMouseEnter={() => setOpenSubmenu("text")}>
                  <span>Text</span><span style={{ color: "#5f6368", fontSize: 10 }}>▶</span>
                  {openSubmenu === "text" && (
                    <div style={{ ...mbDropSt, position: "absolute", left: "100%", top: -4, minWidth: 180 }}>
                      <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); exec("bold"); setOpenMenu(null); setOpenSubmenu(null); }}><span>Bold</span><span style={mbKbSt}>Ctrl+B</span></div>
                      <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); exec("italic"); setOpenMenu(null); setOpenSubmenu(null); }}><span>Italic</span><span style={mbKbSt}>Ctrl+I</span></div>
                      <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); exec("underline"); setOpenMenu(null); setOpenSubmenu(null); }}><span>Underline</span><span style={mbKbSt}>Ctrl+U</span></div>
                      <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); exec("strikeThrough"); setOpenMenu(null); setOpenSubmenu(null); }}><span>Strikethrough</span></div>
                      <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); exec("superscript"); setOpenMenu(null); setOpenSubmenu(null); }}><span>Superscript</span></div>
                      <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); exec("subscript"); setOpenMenu(null); setOpenSubmenu(null); }}><span>Subscript</span></div>
                    </div>
                  )}
                </div>
                {/* Paragraph styles submenu */}
                <div className="mb-item" style={{ ...mbItemSt, position: "relative" }} onMouseEnter={() => setOpenSubmenu("para")}>
                  <span>Paragraph styles</span><span style={{ color: "#5f6368", fontSize: 10 }}>▶</span>
                  {openSubmenu === "para" && (
                    <div style={{ ...mbDropSt, position: "absolute", left: "100%", top: -4, minWidth: 180 }}>
                      {([["Normal text","p"],["Title","title"],["Subtitle","subtitle"],["Heading 1","h1"],["Heading 2","h2"],["Heading 3","h3"],["Heading 4","h4"]] as [string,string][]).map(([lbl, val]) => (
                        <div key={lbl} className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); applyStyle(val); setOpenMenu(null); setOpenSubmenu(null); }}><span>{lbl}</span></div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Align submenu */}
                <div className="mb-item" style={{ ...mbItemSt, position: "relative" }} onMouseEnter={() => setOpenSubmenu("align")}>
                  <span>Align</span><span style={{ color: "#5f6368", fontSize: 10 }}>▶</span>
                  {openSubmenu === "align" && (
                    <div style={{ ...mbDropSt, position: "absolute", left: "100%", top: -4, minWidth: 200 }}>
                      <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); exec("justifyLeft"); setOpenMenu(null); setOpenSubmenu(null); }}><span>Left</span><span style={mbKbSt}>Ctrl+Shift+L</span></div>
                      <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); exec("justifyCenter"); setOpenMenu(null); setOpenSubmenu(null); }}><span>Center</span><span style={mbKbSt}>Ctrl+Shift+E</span></div>
                      <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); exec("justifyRight"); setOpenMenu(null); setOpenSubmenu(null); }}><span>Right</span><span style={mbKbSt}>Ctrl+Shift+R</span></div>
                      <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); exec("justifyFull"); setOpenMenu(null); setOpenSubmenu(null); }}><span>Justified</span><span style={mbKbSt}>Ctrl+Shift+J</span></div>
                    </div>
                  )}
                </div>
                {/* Line spacing submenu */}
                <div className="mb-item" style={{ ...mbItemSt, position: "relative" }} onMouseEnter={() => setOpenSubmenu("lh")}>
                  <span>Line spacing</span><span style={{ color: "#5f6368", fontSize: 10 }}>▶</span>
                  {openSubmenu === "lh" && (
                    <div style={{ ...mbDropSt, position: "absolute", left: "100%", top: -4, minWidth: 120 }}>
                      {["1.0","1.15","1.5","2.0"].map(lh => (
                        <div key={lh} className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); applyLineHeight(lh); setOpenMenu(null); setOpenSubmenu(null); }}><span>{lh}</span></div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Lists submenu */}
                <div className="mb-item" style={{ ...mbItemSt, position: "relative" }} onMouseEnter={() => setOpenSubmenu("lists")}>
                  <span>Lists</span><span style={{ color: "#5f6368", fontSize: 10 }}>▶</span>
                  {openSubmenu === "lists" && (
                    <div style={{ ...mbDropSt, position: "absolute", left: "100%", top: -4, minWidth: 180 }}>
                      <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); exec("insertUnorderedList"); setOpenMenu(null); setOpenSubmenu(null); }}><span>Bullet list</span></div>
                      <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); exec("insertOrderedList"); setOpenMenu(null); setOpenSubmenu(null); }}><span>Numbered list</span></div>
                    </div>
                  )}
                </div>
                <div style={mbDivSt} />
                <div className="mb-item" style={mbItemSt} onMouseEnter={() => setOpenSubmenu(null)} onClick={(e) => { e.stopPropagation(); exec("removeFormat"); setOpenMenu(null); setOpenSubmenu(null); }}><span>Clear formatting</span></div>
              </div>
            )}
          </div>

          {/* ── TOOLS ── */}
          <div style={{ position: "relative" }}>
            <div className="mb-lbl" style={mbLblSt(openMenu === "Tools")} onClick={() => { setOpenMenu(openMenu === "Tools" ? null : "Tools"); setOpenSubmenu(null); }} onMouseEnter={() => { if (openMenu) { setOpenMenu("Tools"); setOpenSubmenu(null); } }}>Tools</div>
            {openMenu === "Tools" && (
              <div style={mbDropSt}>
                <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); setShowWordCountModal(true); setOpenMenu(null); }}><span>Word count</span></div>
                <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); setShowFR(true); setOpenMenu(null); setTimeout(() => frFindInputRef.current?.focus(), 50); }}><span>Find and replace</span></div>
                <div style={mbDivSt} />
                <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); setAiTask("proofread"); setOpenMenu(null); }}><span>AI Proofread</span></div>
                <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); setAiTask("factcheck"); setOpenMenu(null); }}><span>AI Fact Check</span></div>
                <div className="mb-item" style={mbItemSt} onClick={(e) => { e.stopPropagation(); setAiTask("improve"); setOpenMenu(null); }}><span>AI Improve</span></div>
              </div>
            )}
          </div>
        </div>

        {/* ══ Row 2: Toolbar ══ */}
        <div className="editor-toolbar" style={{
          height: 40, flexShrink: 0, background: "#fff", borderBottom: "1px solid #e0e0e0",
          display: "flex", alignItems: "center", padding: "0 6px", gap: 0,
          overflowX: "auto", overflowY: "hidden",
        }}>

          {/* G1: History */}
          <Tb2Btn title="Undo (Ctrl+Z)" onClick={() => exec("undo")}><Ic d={ICONS.undo} size={16} /></Tb2Btn>
          <Tb2Btn title="Redo (Ctrl+Y)" onClick={() => exec("redo")}><Ic d={ICONS.redo} size={16} /></Tb2Btn>
          <Tb2Sep />

          {/* G2: Zoom */}
          <select
            className="tb2-drop"
            value={zoom}
            style={{ width: 58, textAlign: "center" }}
            onMouseDown={() => { saveSelection(); }}
            onChange={(e) => setZoom(Number(e.target.value))}
          >
            {[50,75,100,125,150,200].map(z => <option key={z} value={z}>{z}%</option>)}
          </select>
          <Tb2Sep />

          {/* G3: Paragraph style */}
          <select
            className="tb2-drop"
            value={curStyleVal}
            style={{ width: 120 }}
            onMouseDown={() => { saveSelection(); }}
            onChange={(e) => { applyStyle(e.target.value); }}
          >
            {STYLE_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
          <Tb2Sep />

          {/* G4: Font family */}
          <select
            className="tb2-drop"
            value={curFontFam}
            style={{ width: 130 }}
            onMouseDown={() => { saveSelection(); }}
            onChange={(e) => { exec("fontName", e.target.value); setCurFontFam(e.target.value); }}
          >
            {FONT_FAMILIES.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
          </select>
          <Tb2Sep />

          {/* G5: Font size */}
          <Tb2Btn title="Decrease font size" onClick={() => stepFontSize(-1)}>−</Tb2Btn>
          <input
            type="text"
            value={curFontSize}
            onChange={(e) => setCurFontSize(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyFontSize(curFontSize); } }}
            onBlur={() => applyFontSize(curFontSize)}
            onFocus={(e) => (e.target as HTMLInputElement).select()}
            style={{ width: 36, height: 28, border: "1px solid #dadce0", borderRadius: 4, textAlign: "center", fontSize: 13, color: "#3c4043", fontFamily: "inherit", outline: "none", background: "#fff", flexShrink: 0 }}
          />
          <Tb2Btn title="Increase font size" onClick={() => stepFontSize(1)}>+</Tb2Btn>
          <Tb2Sep />

          {/* G6: Text formatting */}
          <Tb2Btn title="Bold (Ctrl+B)" active={bold} onClick={() => exec("bold")}>
            <span style={{ fontWeight: 700, fontSize: 14, fontFamily: "Arial, sans-serif" }}>B</span>
          </Tb2Btn>
          <Tb2Btn title="Italic (Ctrl+I)" active={italic} onClick={() => exec("italic")}>
            <span style={{ fontStyle: "italic", fontSize: 14, fontFamily: "Georgia, serif" }}>I</span>
          </Tb2Btn>
          <Tb2Btn title="Underline (Ctrl+U)" active={underline} onClick={() => exec("underline")}>
            <span style={{ textDecoration: "underline", fontSize: 14, fontFamily: "Arial, sans-serif" }}>U</span>
          </Tb2Btn>
          <Tb2Btn title="Strikethrough" active={strike} onClick={() => exec("strikeThrough")}>
            <span style={{ textDecoration: "line-through", fontSize: 14, fontFamily: "Arial, sans-serif" }}>S</span>
          </Tb2Btn>
          <Tb2Sep />

          {/* G7: Colors */}
          <button
            ref={textColorBtnRef}
            title="Text color"
            className="tb2-btn"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
            onClick={(e) => { e.stopPropagation(); const r = textColorBtnRef.current?.getBoundingClientRect() ?? null; setColorPickerRect(r); setOpenColorPicker(p => p === "text" ? null : "text"); }}
            style={{ flexDirection: "column", gap: 2 }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "Arial, sans-serif", lineHeight: 1 }}>A</span>
            <span style={{ width: 16, height: 3, background: textColor, borderRadius: 1 }} />
          </button>
          <button
            ref={hlColorBtnRef}
            title="Highlight color"
            className="tb2-btn"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
            onClick={(e) => { e.stopPropagation(); const r = hlColorBtnRef.current?.getBoundingClientRect() ?? null; setColorPickerRect(r); setOpenColorPicker(p => p === "highlight" ? null : "highlight"); }}
            style={{ flexDirection: "column", gap: 2 }}
          >
            <span style={{ fontSize: 12, fontFamily: "Arial, sans-serif", lineHeight: 1 }}>✏</span>
            <span style={{ width: 16, height: 3, background: hlColor, borderRadius: 1 }} />
          </button>
          <Tb2Sep />

          {/* G8: Link + Image + Table */}
          <Tb2Btn title="Insert link (Ctrl+K)" onClick={openLinkPopup}>
            <Ic d={ICONS.link} size={16} />
          </Tb2Btn>
          <Tb2Btn title="Insert image" onClick={() => { saveSelection(); setImgUrl(""); setImgAlt(""); setShowImagePopup(true); setTimeout(() => imgUrlInputRef.current?.focus(), 50); }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </Tb2Btn>
          <button
            ref={tableBtnRef}
            title="Insert table"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
            onClick={() => {
              const r = tableBtnRef.current?.getBoundingClientRect() ?? null;
              setTablePickerRect(r);
              setTableHoverR(0); setTableHoverC(0); setTableGridR(4); setTableGridC(4);
              setShowTablePicker(true);
            }}
            className="tb2-btn"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          </button>
          <Tb2Sep />

          {/* G9: Alignment */}
          <Tb2Btn title="Align left"   active={alignL} onClick={() => exec("justifyLeft")}><Ic d={ICONS.alignL} size={16} /></Tb2Btn>
          <Tb2Btn title="Align centre" active={alignC} onClick={() => exec("justifyCenter")}><Ic d={ICONS.alignC} size={16} /></Tb2Btn>
          <Tb2Btn title="Align right"  active={alignR} onClick={() => exec("justifyRight")}><Ic d={ICONS.alignR} size={16} /></Tb2Btn>
          <Tb2Btn title="Justify"      active={alignJ} onClick={() => exec("justifyFull")}><Ic d={ICONS.alignJ} size={16} /></Tb2Btn>
          <Tb2Sep />

          {/* G10: Line spacing */}
          <div style={{ position: "relative", flexShrink: 0, display: "inline-flex" }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <Tb2Btn title="Line spacing" onClick={() => setOpenLsDrop(v => !v)}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>↕</span>
            </Tb2Btn>
            {openLsDrop && (
              <div style={{ position: "absolute", top: 32, left: 0, zIndex: 300, background: "#fff", border: "1px solid #dadce0", borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", overflow: "hidden", minWidth: 80 }}>
                {["1.0","1.15","1.5","2.0"].map(lh => (
                  <div key={lh} className="mb-item"
                    onMouseDown={(e) => { e.preventDefault(); applyLineHeight(lh); setOpenLsDrop(false); }}
                    style={{ height: 28, padding: "0 16px", display: "flex", alignItems: "center", cursor: "pointer", fontSize: 13, color: "#202124" }}
                  >{lh}</div>
                ))}
              </div>
            )}
          </div>
          <Tb2Sep />

          {/* G11: Lists + indent */}
          <Tb2Btn title="Bullet list"       active={listBullet} onClick={() => exec("insertUnorderedList")}><Ic d={ICONS.listUl} size={16} /></Tb2Btn>
          <Tb2Btn title="Numbered list"     active={listNumber} onClick={() => exec("insertOrderedList")}><Ic d={ICONS.listOl} size={16} /></Tb2Btn>
          <Tb2Btn title="Decrease indent"   onClick={() => exec("outdent")}><Ic d={ICONS.outdent} size={16} /></Tb2Btn>
          <Tb2Btn title="Increase indent"   onClick={() => exec("indent")}><Ic d={ICONS.indent} size={16} /></Tb2Btn>
          <Tb2Sep />

          {/* G12: Clear formatting */}
          <Tb2Btn title="Clear formatting" onClick={clearFormatAll}>
            <span style={{ fontSize: 13, fontFamily: "Arial, sans-serif", textDecoration: "line-through", color: "#3c4043", fontWeight: 500 }}>Tx</span>
          </Tb2Btn>
          <Tb2Sep />

          {/* G13: AI tools */}
          {([
            { key: "proofread", label: "✦", title: "AI Proofread" },
            { key: "factcheck", label: "✓", title: "AI Fact Check" },
            { key: "improve",   label: "💡", title: "AI Improve" },
          ] as { key: string; label: string; title: string }[]).map(({ key, label, title }) => (
            <button
              key={key}
              title={title}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setAiTask(t => t === key ? null : key)}
              className="tb2-btn ai-tb-btn"
              style={{ color: "#7c3aed", background: aiTask === key ? "#ede9fe" : undefined, fontWeight: 600 }}
            >{label}</button>
          ))}
        </div>

        {/* ══ Find & Replace Panel ══ */}
        {showFR && (
          <div
            className="find-replace-panel"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed", top: 130, right: 24, zIndex: 500,
              background: "#fff", border: "1px solid #dadce0", borderRadius: 4,
              padding: "10px 14px", width: 380,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              display: "flex", flexDirection: "column", gap: 8,
              fontFamily: "Arial, sans-serif", fontSize: 13,
            }}
          >
            {/* Row 1: Find */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 52, color: "#5f6368", fontSize: 12, flexShrink: 0 }}>Find</span>
              <input
                ref={frFindInputRef}
                value={frFind}
                onChange={(e) => {
                  const val = e.target.value;
                  setFrFind(val);
                  if (frDebounceRef.current) clearTimeout(frDebounceRef.current);
                  frDebounceRef.current = setTimeout(() => findMatches(val), 300);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navigateFRMatch(1);
                  if (e.key === "Escape") { clearFRHighlights(); setFrMatchTotal(0); setFrMatchIndex(0); setShowFR(false); }
                }}
                placeholder="Find…"
                style={{ flex: 1, height: 28, border: "1px solid #dadce0", borderRadius: 3, padding: "0 8px", fontSize: 13, outline: "none", fontFamily: "inherit" }}
              />
              <span style={{ fontSize: 11, color: "#9aa0a6", whiteSpace: "nowrap", minWidth: 68, textAlign: "right" }}>
                {frMatchTotal > 0 ? `${frMatchIndex} of ${frMatchTotal}` : "0 matches"}
              </span>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => navigateFRMatch(-1)}
                title="Previous match"
                style={{ width: 22, height: 22, border: "1px solid #dadce0", borderRadius: 3, background: "#fff", cursor: "pointer", fontSize: 10, color: "#5f6368", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>▲</button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => navigateFRMatch(1)}
                title="Next match"
                style={{ width: 22, height: 22, border: "1px solid #dadce0", borderRadius: 3, background: "#fff", cursor: "pointer", fontSize: 10, color: "#5f6368", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>▼</button>
              <button onClick={() => { clearFRHighlights(); setFrMatchTotal(0); setFrMatchIndex(0); setShowFR(false); }}
                title="Close"
                style={{ width: 22, height: 22, border: "none", borderRadius: 3, background: "none", cursor: "pointer", fontSize: 15, color: "#5f6368", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
            </div>
            {/* Row 2: Replace */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 52, color: "#5f6368", fontSize: 12, flexShrink: 0 }}>Replace</span>
              <input
                value={frReplace}
                onChange={(e) => setFrReplace(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") { clearFRHighlights(); setFrMatchTotal(0); setFrMatchIndex(0); setShowFR(false); } }}
                placeholder="Replace with…"
                style={{ flex: 1, height: 28, border: "1px solid #dadce0", borderRadius: 3, padding: "0 8px", fontSize: 13, outline: "none", fontFamily: "inherit" }}
              />
              <button onMouseDown={(e) => e.preventDefault()} onClick={replaceFROne}
                disabled={frMatchTotal === 0}
                style={{ height: 28, padding: "0 10px", borderRadius: 3, border: "1px solid #dadce0", background: "#fff", fontSize: 12, cursor: frMatchTotal > 0 ? "pointer" : "default", color: "#3c4043", opacity: frMatchTotal > 0 ? 1 : 0.5, whiteSpace: "nowrap", flexShrink: 0 }}>Replace</button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={replaceFRAll}
                disabled={frMatchTotal === 0}
                style={{ height: 28, padding: "0 10px", borderRadius: 3, border: "none", background: "#1a73e8", color: "#fff", fontSize: 12, cursor: frMatchTotal > 0 ? "pointer" : "default", opacity: frMatchTotal > 0 ? 1 : 0.5, whiteSpace: "nowrap", flexShrink: 0 }}>All</button>
            </div>
            {/* Row 3: Options */}
            <div style={{ display: "flex", gap: 16, alignItems: "center", paddingLeft: 57 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#5f6368", cursor: "pointer" }}>
                <input type="checkbox" checked={frMatchCase}
                  onChange={(e) => {
                    const v = e.target.checked; setFrMatchCase(v); frMatchCaseRef.current = v;
                    if (frFind) findMatches(frFind, v, frWholeWordRef.current);
                  }}
                  style={{ margin: 0 }}
                />Match case
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#5f6368", cursor: "pointer" }}>
                <input type="checkbox" checked={frWholeWord}
                  onChange={(e) => {
                    const v = e.target.checked; setFrWholeWord(v); frWholeWordRef.current = v;
                    if (frFind) findMatches(frFind, frMatchCaseRef.current, v);
                  }}
                  style={{ margin: 0 }}
                />Whole word
              </label>
            </div>
          </div>
        )}

        {/* ══ Document Details Modal ══ */}
        {showDocDetails && doc && (
          <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setShowDocDetails(false)}>
            <div style={{ background: "#fff", borderRadius: 8, padding: 28, width: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span style={{ fontWeight: 600, fontSize: 16, color: "#202124" }}>Document details</span>
                <button onClick={() => setShowDocDetails(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#5f6368", fontSize: 20, lineHeight: 1 }}>✕</button>
              </div>
              {([
                ["Title",       title || "Untitled"],
                ["Author",      doc.author.name],
                ["Words",       wordCount.toLocaleString()],
                ["Characters",  charCount.toLocaleString()],
                ["Last saved",  new Date(doc.updatedAt).toLocaleString()],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 13 }}>
                  <span style={{ color: "#5f6368", minWidth: 100 }}>{k}</span>
                  <span style={{ color: "#202124", fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ Word Count Modal ══ */}
        {showWordCountModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setShowWordCountModal(false)}>
            <div style={{ background: "#fff", borderRadius: 8, padding: 28, width: 320, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span style={{ fontWeight: 600, fontSize: 16, color: "#202124" }}>Word count</span>
                <button onClick={() => setShowWordCountModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#5f6368", fontSize: 20, lineHeight: 1 }}>✕</button>
              </div>
              {((): [string, string][] => {
                const text = editorRef.current?.innerText ?? "";
                const charsNoSpaces = text.replace(/\s/g, "").length;
                const pages = Math.max(1, Math.ceil(wordCount / 500));
                return [
                  ["Words",                        wordCount.toLocaleString()],
                  ["Characters (with spaces)",     charCount.toLocaleString()],
                  ["Characters (without spaces)",  charsNoSpaces.toLocaleString()],
                  ["Estimated pages",              `~${pages}`],
                ];
              })().map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13 }}>
                  <span style={{ color: "#5f6368" }}>{k}</span>
                  <span style={{ color: "#202124", fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ Document area ══ */}
        <div className="editor-document-area" style={{ flex: 1, overflow: "auto", background: "#f0f4f8", paddingBottom: 60 }}>
          {/* Page ruler feel */}
          <div style={{ height: 24, background: "#f8f9fa", borderBottom: "1px solid #e8eaed" }} />

          {/* Status banners */}
          {doc?.status === "SUBMITTED" && (
            <div style={{ background: "#fef3c7", borderBottom: "1px solid #fde68a", padding: "10px 24px", fontSize: 13, color: "#92400e", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 600 }}>Awaiting review</span> — Your document has been submitted and is pending admin approval.
            </div>
          )}
          {doc?.status === "REJECTED" && (
            <div style={{ background: "#fee2e2", borderBottom: "1px solid #fecaca", padding: "10px 24px", fontSize: 13, color: "#991b1b" }}>
              <span style={{ fontWeight: 600 }}>Rejected</span>{doc.adminComment ? ` — ${doc.adminComment}` : " — Please revise and resubmit."}
            </div>
          )}
          {doc?.status === "APPROVED" && (
            <div style={{ background: "#d1fae5", borderBottom: "1px solid #a7f3d0", padding: "10px 24px", fontSize: 13, color: "#065f46", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 600 }}>Approved</span> — Your document has been approved and is ready for design.
            </div>
          )}
          {doc?.status === "DESIGN_SENT" && (
            <div style={{ background: "#ede9fe", borderBottom: "1px solid #ddd6fe", padding: "10px 24px", fontSize: 13, color: "#5b21b6", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 600 }}>Sent to design</span> — This document has been forwarded to the design team.
            </div>
          )}
          {doc?.status === "PUBLISHED" && (
            <div style={{ background: "#dbeafe", borderBottom: "1px solid #bfdbfe", padding: "10px 24px", fontSize: 13, color: "#1e40af", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 600 }}>Published</span> — This document has been published.
            </div>
          )}

          {/* Paper */}
          <div
            className="editor-paper"
            onMouseMove={onPaperMouseMove}
            onMouseDown={onPaperMouseDown}
            style={{
              width: 816, margin: "24px auto 40px", minHeight: 1056,
              background: "#ffffff",
              boxShadow: "0 1px 3px rgba(60,64,67,0.15), 0 4px 12px rgba(60,64,67,0.1)",
              padding: "96px 96px 80px",
              position: "relative",
              transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
              transformOrigin: "top center",
            }}
          >
            <div
              ref={editorRef}
              contentEditable={canEdit}
              suppressContentEditableWarning
              className="doc-editor"
              onInput={onEditorInput}
              onPaste={onPaste}
              onKeyDown={onKeyDown}
              style={{ outline: "none", minHeight: 800 }}
            />

            {/* Footer info bar */}
            <div style={{
              position: "absolute", bottom: 20, left: 96, right: 96,
              display: "flex", gap: 20, fontSize: 10.5, color: "#9aa0a6",
              borderTop: "1px solid #f0f4f8", paddingTop: 10,
            }}>
              <span>{wordCount.toLocaleString()} words</span>
              <span>{charCount.toLocaleString()} characters</span>
              {doc && <span style={{ marginLeft: "auto" }}>Topic: {doc.topic.title}</span>}
            </div>
          </div>
          {showWordCountBar && (
            <div className="editor-wordcount-bar" style={{ position: "sticky", bottom: 0, height: 24, background: "#f8f9fa", borderTop: "1px solid #e0e0e0", fontSize: 12, color: "#5f6368", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
              <span>{wordCount.toLocaleString()} words&nbsp;&nbsp;·&nbsp;&nbsp;{charCount.toLocaleString()} characters{lastSavedAt ? `\u00a0\u00a0·\u00a0\u00a0Last saved at ${lastSavedAt}` : ""}</span>
            </div>
          )}
        </div>

        {/* ══ Color Palette Popup ══ */}
        {openColorPicker && colorPickerRect && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: colorPickerRect.bottom + 4,
              left: colorPickerRect.left,
              zIndex: 600,
              background: "#fff",
              border: "1px solid #dadce0",
              borderRadius: 4,
              padding: 8,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              width: 180,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "#5f6368", fontWeight: 500 }}>
                {openColorPicker === "text" ? "Text color" : "Highlight color"}
              </span>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  restoreSelection();
                  if (editorRef.current) editorRef.current.focus();
                  if (openColorPicker === "text") {
                    document.execCommand("foreColor", false, "#000000");
                    setTextColor("#000000");
                  } else {
                    document.execCommand("hiliteColor", false, "transparent");
                  }
                  setOpenColorPicker(null);
                  scheduleAutoSave();
                }}
                style={{ fontSize: 11, color: "#1a73e8", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >RESET</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 8 }}>
              {COLOR_SWATCHES.map((row, ri) => (
                <div key={ri} style={{ display: "flex", gap: 2 }}>
                  {row.map((color) => (
                    <div
                      key={color}
                      title={color}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyColor(color)}
                      style={{ width: 16, height: 16, borderRadius: 2, background: color, cursor: "pointer", border: "1px solid rgba(0,0,0,0.1)", outline: "2px solid transparent", outlineOffset: 1, flexShrink: 0 }}
                      onMouseEnter={(e) => { const t = e.currentTarget as HTMLDivElement; t.style.outline = "2px solid #333"; t.style.border = "2px solid #fff"; }}
                      onMouseLeave={(e) => { const t = e.currentTarget as HTMLDivElement; t.style.outline = "2px solid transparent"; t.style.border = "1px solid rgba(0,0,0,0.1)"; }}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <input
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") applyColor(customHex); }}
                maxLength={7}
                placeholder="#000000"
                style={{ flex: 1, height: 24, border: "1px solid #dadce0", borderRadius: 3, padding: "0 4px", fontSize: 11, fontFamily: "monospace", outline: "none" }}
              />
              <div style={{ width: 16, height: 16, borderRadius: 2, background: customHex, border: "1px solid rgba(0,0,0,0.15)", flexShrink: 0 }} />
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyColor(customHex)}
                style={{ height: 24, padding: "0 6px", fontSize: 11, borderRadius: 3, border: "1px solid #dadce0", background: "#fff", cursor: "pointer", color: "#3c4043", flexShrink: 0 }}
              >Apply</button>
            </div>
          </div>
        )}

        {/* ══ Table Controls Toolbar ══ */}
        {showTableControls && activeTableEl && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed", top: tableCtrlPos.top, left: tableCtrlPos.left,
              zIndex: 500, background: "#fff", border: "1px solid #e0e0e0",
              borderRadius: 4, boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
              display: "flex", alignItems: "center", padding: "2px 4px", gap: 1,
            }}
          >
            <button className="tbl-ctrl-btn" title="Insert row above"  onMouseDown={(e) => e.preventDefault()} onClick={tblInsertRowAbove}>↑+row</button>
            <button className="tbl-ctrl-btn" title="Insert row below"  onMouseDown={(e) => e.preventDefault()} onClick={tblInsertRowBelow}>↓+row</button>
            <button className="tbl-ctrl-btn" title="Insert col left"   onMouseDown={(e) => e.preventDefault()} onClick={tblInsertColLeft}>←+col</button>
            <button className="tbl-ctrl-btn" title="Insert col right"  onMouseDown={(e) => e.preventDefault()} onClick={tblInsertColRight}>→+col</button>
            <div className="tbl-sep" />
            <button className="tbl-ctrl-btn" title="Delete row"   onMouseDown={(e) => e.preventDefault()} onClick={tblDeleteRow}   style={{ color: "#d93025" }}>−row</button>
            <button className="tbl-ctrl-btn" title="Delete column" onMouseDown={(e) => e.preventDefault()} onClick={tblDeleteCol}   style={{ color: "#d93025" }}>−col</button>
            <button className="tbl-ctrl-btn" title="Delete table"  onMouseDown={(e) => e.preventDefault()} onClick={tblDeleteTable} style={{ color: "#d93025" }}>⊗tbl</button>
            <div className="tbl-sep" />
            <button
              className="tbl-ctrl-btn" title="Cell background color"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => { const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect(); setTableCellColorPos(r); setTableCellColorPicker(v => v === "bg" ? null : "bg"); }}
              style={{ flexDirection: "column", gap: 1 }}
            >
              <span style={{ fontSize: 10, lineHeight: 1 }}>bg</span>
              <span style={{ width: 14, height: 3, background: activeTdEl?.style.backgroundColor || "#fff", border: "1px solid #ccc", borderRadius: 1 }} />
            </button>
            <button
              className="tbl-ctrl-btn" title="Border color"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => { const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect(); setTableCellColorPos(r); setTableCellColorPicker(v => v === "border" ? null : "border"); }}
              style={{ flexDirection: "column", gap: 1 }}
            >
              <span style={{ fontSize: 10, lineHeight: 1 }}>bd</span>
              <span style={{ width: 14, height: 3, background: activeTdEl?.style.borderColor || "#999", border: "1px solid #ccc", borderRadius: 1 }} />
            </button>
          </div>
        )}

        {/* ══ Table cell color picker ══ */}
        {tableCellColorPicker && tableCellColorPos && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed", top: tableCellColorPos.bottom + 4, left: tableCellColorPos.left,
              zIndex: 600, background: "#fff", border: "1px solid #dadce0",
              borderRadius: 4, padding: 6, boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              display: "flex", flexWrap: "wrap", gap: 3, width: 108,
            }}
          >
            {TABLE_COLORS.map(color => (
              <div
                key={color} title={color}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => tableCellColorPicker === "bg" ? tblSetBgColor(color) : tblSetBorderColor(color)}
                style={{
                  width: 20, height: 20, borderRadius: 2, background: color,
                  border: "1px solid rgba(0,0,0,0.15)", cursor: "pointer",
                  outline: "2px solid transparent", outlineOffset: 1,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.outline = "2px solid #333"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.outline = "2px solid transparent"; }}
              />
            ))}
          </div>
        )}

        {/* ══ Link Insertion Popup ══ */}
        {showLinkPopup && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed", top: 136, left: "50%", transform: "translateX(-50%)",
              zIndex: 600, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 4,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)", padding: 12, width: 320,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <label style={{ fontSize: 12, color: "#5f6368", display: "block", marginBottom: 3 }}>Text</label>
                <input
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Link text"
                  style={{ width: "100%", height: 32, border: "1px solid #dadce0", borderRadius: 4, padding: "0 8px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#5f6368", display: "block", marginBottom: 3 }}>Link</label>
                <input
                  ref={linkUrlInputRef}
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") applyLink(); if (e.key === "Escape") setShowLinkPopup(false); }}
                  placeholder="https://"
                  style={{ width: "100%", height: 32, border: "1px solid #dadce0", borderRadius: 4, padding: "0 8px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                {linkInAnchor && (
                  <button
                    onClick={() => { restoreSelection(); exec("unlink"); setShowLinkPopup(false); }}
                    style={{ height: 32, padding: "0 12px", borderRadius: 4, border: "1px solid #dadce0", background: "#fff", color: "#5f6368", fontSize: 13, cursor: "pointer" }}
                  >Remove link</button>
                )}
                <button
                  onClick={() => setShowLinkPopup(false)}
                  style={{ height: 32, padding: "0 12px", borderRadius: 4, border: "1px solid #dadce0", background: "#fff", color: "#3c4043", fontSize: 13, cursor: "pointer" }}
                >Cancel</button>
                <button
                  onClick={applyLink}
                  disabled={!linkUrl.trim()}
                  style={{ height: 32, padding: "0 16px", borderRadius: 4, border: "none", background: "#1a73e8", color: "#fff", fontSize: 13, fontWeight: 500, cursor: linkUrl.trim() ? "pointer" : "default", opacity: linkUrl.trim() ? 1 : 0.5 }}
                >Apply</button>
              </div>
            </div>
          </div>
        )}

        {/* ══ Image from URL Popup ══ */}
        {showImagePopup && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed", top: 136, left: "50%", transform: "translateX(-50%)",
              zIndex: 600, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 4,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)", padding: 12, width: 300,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <label style={{ fontSize: 12, color: "#5f6368", display: "block", marginBottom: 3 }}>Image URL</label>
                <input
                  ref={imgUrlInputRef}
                  value={imgUrl}
                  onChange={(e) => setImgUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") setShowImagePopup(false); }}
                  placeholder="https://..."
                  style={{ width: "100%", height: 32, border: "1px solid #dadce0", borderRadius: 4, padding: "0 8px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#5f6368", display: "block", marginBottom: 3 }}>Alt text (optional)</label>
                <input
                  value={imgAlt}
                  onChange={(e) => setImgAlt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") setShowImagePopup(false); }}
                  placeholder="Description of image"
                  style={{ width: "100%", height: 32, border: "1px solid #dadce0", borderRadius: 4, padding: "0 8px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </div>
              {imgUrl.trim() && (
                <ImgPreview src={imgUrl} alt={imgAlt} />
              )}
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowImagePopup(false)}
                  style={{ height: 32, padding: "0 12px", borderRadius: 4, border: "1px solid #dadce0", background: "#fff", color: "#3c4043", fontSize: 13, cursor: "pointer" }}
                >Cancel</button>
                <button
                  onClick={() => {
                    if (!imgUrl.trim()) return;
                    exec("insertHTML", `<img src="${imgUrl}" alt="${imgAlt}" style="max-width:100%;height:auto;display:block;margin:4px 0">`);
                    setShowImagePopup(false);
                  }}
                  disabled={!imgUrl.trim()}
                  style={{ height: 32, padding: "0 16px", borderRadius: 4, border: "none", background: "#1a73e8", color: "#fff", fontSize: 13, fontWeight: 500, cursor: imgUrl.trim() ? "pointer" : "default", opacity: imgUrl.trim() ? 1 : 0.5 }}
                >Insert</button>
              </div>
            </div>
          </div>
        )}

        {/* ══ Table Picker ══ */}
        {showTablePicker && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top:  tablePickerRect ? tablePickerRect.bottom + 4 : 132,
              left: tablePickerRect ? tablePickerRect.left       : 240,
              zIndex: 600, background: "#fff", border: "1px solid #dadce0", borderRadius: 4,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)", padding: 8,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {Array.from({ length: tableGridR }, (_, r) => (
                <div key={r} style={{ display: "flex", gap: 1 }}>
                  {Array.from({ length: tableGridC }, (_, c) => (
                    <div
                      key={c}
                      onMouseEnter={() => {
                        setTableHoverR(r + 1);
                        setTableHoverC(c + 1);
                        if (r + 1 >= tableGridR && tableGridR < 8) setTableGridR(prev => Math.min(8, prev + 1));
                        if (c + 1 >= tableGridC && tableGridC < 8) setTableGridC(prev => Math.min(8, prev + 1));
                      }}
                      onMouseLeave={() => { setTableHoverR(0); setTableHoverC(0); }}
                      onClick={() => insertTable(r + 1, c + 1)}
                      style={{
                        width: 18, height: 18, cursor: "pointer",
                        border: `1px solid ${r < tableHoverR && c < tableHoverC ? "#1a73e8" : "#e0e0e0"}`,
                        background: r < tableHoverR && c < tableHoverC ? "#c5d8fc" : "#fff",
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#5f6368", textAlign: "center", minHeight: 16 }}>
              {tableHoverR > 0 && tableHoverC > 0 ? `${tableHoverR} × ${tableHoverC} table` : "\u00a0"}
            </div>
          </div>
        )}

        {/* ══ Special Characters Modal ══ */}
        {showSpecialChars && (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setShowSpecialChars(false)}
          >
            <div
              style={{ background: "#fff", borderRadius: 8, padding: 20, width: 400, maxHeight: 400, display: "flex", flexDirection: "column", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexShrink: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 15, color: "#202124" }}>Special characters</span>
                <button onClick={() => setShowSpecialChars(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#5f6368", fontSize: 20, lineHeight: 1 }}>✕</button>
              </div>
              <div style={{ overflowY: "auto", flex: 1 }}>
                {SPECIAL_CHAR_GROUPS.map(({ group, chars }) => (
                  <div key={group} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: "#5f6368", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{group}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                      {chars.map((ch) => (
                        <button
                          key={ch}
                          title={ch}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { restoreSelection(); exec("insertText", ch); }}
                          className="sc-btn"
                          style={{ width: 28, height: 28, fontSize: 16, borderRadius: 4, border: "1px solid #e0e0e0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >{ch}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ AI Side Panel ══ */}
        {(() => {
          const panelTitle = aiTask === "proofread" ? "AI Proofreader" : aiTask === "factcheck" ? "AI Fact Checker" : "AI Writing Assistant";
          const modelMessages = aiHistory.filter(m => m.role === "model");
          const docWords = editorRef.current?.innerText?.trim().split(/\s+/).filter(Boolean).length ?? 0;
          return (
            <div style={{
              position: "fixed", top: 128, right: 0, bottom: 0,
              width: 320, background: "#fff",
              borderLeft: "1px solid #e0e0e0",
              boxShadow: "-2px 0 8px rgba(0,0,0,0.1)",
              zIndex: 100, display: "flex", flexDirection: "column",
              transform: aiTask ? "translateX(0)" : "translateX(100%)",
              transition: "transform 0.25s ease",
              fontFamily: "Arial, sans-serif",
            }}>

              {/* Panel header */}
              <div style={{ flexShrink: 0, padding: "12px 14px 10px", borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#202124" }}>{panelTitle}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      title="Re-run analysis"
                      onClick={() => aiTask && runAiTask(aiTask)}
                      style={{ width: 26, height: 26, border: "none", borderRadius: 4, background: "none", cursor: "pointer", fontSize: 15, color: "#5f6368", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >↺</button>
                    <button
                      title="Close panel"
                      onClick={() => setAiTask(null)}
                      style={{ width: 26, height: 26, border: "none", borderRadius: 4, background: "none", cursor: "pointer", fontSize: 16, color: "#5f6368", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >×</button>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#9aa0a6" }}>
                  Powered by Gemini
                  {docWords > 0 && <span style={{ marginLeft: 8 }}>· Analysing {docWords} words</span>}
                </div>
              </div>

              {/* Panel body */}
              <div ref={aiPanelBodyRef} style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>

                {/* Empty document */}
                {aiError === "empty" && (
                  <div style={{ fontSize: 13, color: "#6b7280", textAlign: "center", marginTop: 40, lineHeight: 1.6 }}>
                    Your document is empty.<br />Start writing first.
                  </div>
                )}

                {/* Loading skeleton */}
                {aiLoading && (
                  <div>
                    {[80, 95, 70].map((w, i) => (
                      <div key={i} style={{
                        height: 14, borderRadius: 4, marginBottom: 10,
                        width: `${w}%`, background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
                        backgroundSize: "200% 100%",
                        animation: `ai-shimmer 1.4s infinite`,
                        animationDelay: `${i * 0.15}s`,
                      }} />
                    ))}
                    <p style={{ fontSize: 12, color: "#9aa0a6", marginTop: 8 }}>Gemini is analysing your document…</p>
                  </div>
                )}

                {/* Error (non-empty) */}
                {aiError && aiError !== "empty" && (
                  <div style={{ fontSize: 13, color: "#dc2626", background: "#fef2f2", borderRadius: 6, padding: "10px 12px" }}>
                    {aiError}
                  </div>
                )}

                {/* Conversation */}
                {!aiLoading && !aiError && aiHistory.length > 0 && (() => {
                  const items: React.ReactNode[] = [];
                  let modelIdx = 0;
                  for (let i = 0; i < aiHistory.length; i++) {
                    const msg = aiHistory[i];
                    if (msg.role === "model") {
                      const isFirst = modelIdx === 0;
                      modelIdx++;
                      items.push(
                        <div key={i}>
                          {!isFirst && (
                            <div style={{ fontSize: 11, color: "#9aa0a6", marginBottom: 6, marginTop: 4 }}>Gemini</div>
                          )}
                          {renderAiSegments(msg.parts, aiTask ?? "improve")}
                        </div>
                      );
                    } else if (i > 0) {
                      // Follow-up user message (skip the first user message which is the full prompt)
                      items.push(
                        <div key={i} style={{
                          background: "#ede9fe", borderRadius: 6, padding: "8px 12px",
                          margin: "10px 0 6px", fontSize: 13, color: "#4c1d95", lineHeight: 1.5,
                        }}>
                          {msg.parts}
                        </div>
                      );
                    }
                  }
                  return items;
                })()}
              </div>

              {/* Panel footer */}
              <div style={{ flexShrink: 0, borderTop: "1px solid #f0f0f0", padding: "10px 14px" }}>
                {aiTask === "improve" && modelMessages.length > 0 && !aiLoading && (
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <input
                      value={aiFollowUp}
                      onChange={(e) => setAiFollowUp(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAiFollowUp(); } }}
                      placeholder="Ask a follow-up question…"
                      style={{
                        flex: 1, height: 32, border: "1px solid #e0e0e0", borderRadius: 6,
                        padding: "0 10px", fontSize: 12, outline: "none", fontFamily: "inherit",
                        color: "#202124",
                      }}
                    />
                    <button
                      onClick={sendAiFollowUp}
                      disabled={!aiFollowUp.trim() || aiLoading}
                      style={{
                        width: 32, height: 32, borderRadius: 6, border: "none",
                        background: aiFollowUp.trim() ? "#7c3aed" : "#e5e7eb",
                        color: aiFollowUp.trim() ? "#fff" : "#9ca3af",
                        cursor: aiFollowUp.trim() ? "pointer" : "default",
                        fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}
                    >→</button>
                  </div>
                )}
                <button
                  onClick={() => aiTask && runAiTask(aiTask)}
                  disabled={aiLoading}
                  style={{
                    width: "100%", height: 32, borderRadius: 6, border: "1px solid #e0e0e0",
                    background: "#fff", fontSize: 13, color: "#5f6368",
                    cursor: aiLoading ? "default" : "pointer", fontFamily: "inherit",
                    opacity: aiLoading ? 0.5 : 1,
                  }}
                >Analyse again</button>
              </div>
            </div>
          );
        })()}

      </div>

    </>
  );
}

// ─── Image preview (handles load error gracefully) ────────────────────────────
function ImgPreview({ src, alt }: { src: string; alt: string }) {
  const [broken, setBroken] = useState(false);
  // Reset broken state whenever src changes
  const prevSrc = useRef(src);
  if (prevSrc.current !== src) { prevSrc.current = src; setBroken(false); }

  return (
    <div style={{ height: 80, border: "1px solid #e0e0e0", borderRadius: 4, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f9fa" }}>
      {broken ? (
        <span style={{ fontSize: 12, color: "#9aa0a6", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 24 }}>🖼</span>
          <span>Failed to load image</span>
        </span>
      ) : (
        <img
          src={src}
          alt={alt || "preview"}
          style={{ maxHeight: 78, maxWidth: "100%", objectFit: "contain" }}
          onError={() => setBroken(true)}
        />
      )}
    </div>
  );
}

// ─── Toolbar primitives ───────────────────────────────────────────────────────
function Tb2Btn({ children, onClick, title, active, style }: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`tb2-btn${active ? " active" : ""}`}
      style={style}
    >
      {children}
    </button>
  );
}

function Tb2Sep() {
  return <div className="tb2-sep" />;
}

// ─── AI response rendering ────────────────────────────────────────────────────

function getItemDotColor(taskType: string, itemText: string): string {
  if (taskType === "proofread") return "#dc2626";
  if (taskType === "improve")   return "#7c3aed";
  // factcheck: infer from keywords
  const lower = itemText.toLowerCase();
  if (/\bcorrect\b|\baccurate\b|\b✓\b/.test(lower)) return "#16a34a";
  if (/\bincorrect\b|\bwrong\b|\berror\b|\binaccurate\b|\bfalse\b/.test(lower)) return "#dc2626";
  return "#6b7280";
}

function parseBoldText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part.split("\n").map((line, j) => (
      <span key={`${i}-${j}`}>{j > 0 && <br />}{line}</span>
    ));
  });
}

function splitAiResponse(text: string): string[] {
  // Numbered list (1. 2. 3. …)
  if (/\n\d+\.\s/.test(text) || /^\d+\.\s/.test(text)) {
    const parts = text.split(/\n(?=\d+\.\s)/).map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) return parts;
  }
  // Markdown headers
  if (/\n#{1,3}\s/.test(text)) {
    const parts = text.split(/\n(?=#{1,3}\s)/).map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) return parts;
  }
  // Double newlines
  const paragraphs = text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
  if (paragraphs.length > 1) return paragraphs;
  return [text.trim()].filter(Boolean);
}

function renderAiSegments(text: string, taskType: string): React.ReactNode {
  const segments = splitAiResponse(text);
  return (
    <>
      {segments.map((seg, i) => (
        <div key={i} style={{
          background: "#f8f9fa", borderRadius: 6, padding: "10px 12px",
          marginBottom: 8, display: "flex", gap: 8, alignItems: "flex-start",
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: getItemDotColor(taskType, seg),
            flexShrink: 0, marginTop: 6,
          }} />
          <div style={{ fontSize: 13, lineHeight: 1.65, color: "#202124" }}>
            {parseBoldText(seg)}
          </div>
        </div>
      ))}
    </>
  );
}

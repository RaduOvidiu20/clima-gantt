"use client";

import { useState } from "react";
import { toPng } from "html-to-image";

interface Props {
  nodeRef: React.RefObject<HTMLElement | null>;
  filename?: string;
}

export function ExportButton({ nodeRef, filename = "gantt.png" }: Props) {
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    const node = nodeRef.current;
    if (!node) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(node, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        width: node.scrollWidth,
        height: node.scrollHeight,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      link.click();
    } catch (e) {
      console.error("Export PNG eșuat", e);
      alert("Exportul a eșuat. Încearcă din nou.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={busy}
      className="rounded border border-slate-300 px-3 py-1 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
      title="Exportă diagrama ca imagine PNG"
    >
      {busy ? "Se exportă…" : "⬇ Export PNG"}
    </button>
  );
}

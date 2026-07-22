"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateProject, deleteProject } from "@/app/ECR/actions";

interface Props {
  id: string;
  name: string;
  number: string | null;
  canEdit: boolean;
}

export function ProjectHeader({ id, name, number, canEdit }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(name);
  const [numberVal, setNumberVal] = useState(number ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    const trimmed = nameVal.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await updateProject(id, {
        name: trimmed,
        number: numberVal.trim() || null,
      });
      setEditing(false);
    });
  }

  function remove() {
    if (
      !confirm(
        "Sigur ștergi acest proiect și toate testele lui? Acțiunea nu poate fi anulată.",
      )
    )
      return;
    startTransition(async () => {
      await deleteProject(id);
      router.push("/ECR");
    });
  }

  return (
    <div className="mb-5">
      <div className="flex items-center gap-4 text-sm text-blue-600">
        <Link href="/ECR" className="hover:underline">
          ← Toate proiectele ECR
        </Link>
        <Link href="/" className="hover:underline">
          ← Calendar
        </Link>
      </div>

      {editing ? (
        <div className="mt-2 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium text-slate-600">Nr. proiect</span>
            <input
              value={numberVal}
              onChange={(e) => setNumberVal(e.target.value)}
              placeholder="ex. P-2026-014"
              className="w-40 rounded border border-slate-300 px-2 py-1.5"
            />
          </label>
          <label className="flex flex-1 flex-col text-sm">
            <span className="mb-1 font-medium text-slate-600">Nume proiect *</span>
            <input
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-1.5"
            />
          </label>
          <button
            onClick={save}
            disabled={pending || !nameVal.trim()}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Salvează
          </button>
          <button
            onClick={() => {
              setNameVal(name);
              setNumberVal(number ?? "");
              setEditing(false);
            }}
            disabled={pending}
            className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
          >
            Anulează
          </button>
        </div>
      ) : (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {number ? <span className="mr-2 text-blue-600">{number}</span> : null}
            {name}
          </h1>
          {canEdit && (
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(true)}
                className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
              >
                ✎ Editează
              </button>
              <button
                onClick={remove}
                disabled={pending}
                className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                🗑 Șterge proiect
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

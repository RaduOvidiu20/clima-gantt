"use client";

import { useTransition } from "react";
import Link from "next/link";
import { deleteProject } from "@/app/ECR/actions";

interface Props {
  id: string;
  name: string;
  number: string | null;
  testsCount: number;
  canEdit: boolean;
}

export function ProjectCard({ id, name, number, testsCount, canEdit }: Props) {
  const [pending, startTransition] = useTransition();

  function remove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Ștergi proiectul „${name}" și toate testele lui?`)) return;
    startTransition(async () => {
      await deleteProject(id);
    });
  }

  return (
    <div
      className={`relative rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-blue-400 hover:shadow ${
        pending ? "opacity-50" : ""
      }`}
    >
      <Link href={`/ECR/${id}`} className="block p-4 pr-10">
        {number ? (
          <span className="text-xs font-medium text-blue-600">{number}</span>
        ) : null}
        <h3 className="font-semibold">{name}</h3>
        <span className="text-sm text-slate-500">{testsCount} teste</span>
      </Link>
      {canEdit && (
        <button
          onClick={remove}
          disabled={pending}
          title="Șterge proiectul"
          className="absolute right-2 top-2 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
        >
          ✕
        </button>
      )}
    </div>
  );
}

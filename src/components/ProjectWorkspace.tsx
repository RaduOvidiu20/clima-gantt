"use client";

import { useMemo, useState, useTransition } from "react";
import { schedule, type DurationUnit } from "@/lib/schedule";
import type { TestRow, TestPatch } from "@/lib/types";
import { addTest, updateTest, deleteTest, moveTest } from "@/app/ECR/actions";
import { TestTable } from "./TestTable";
import { GanttChart } from "./GanttChart";
import { LegendCard } from "./LegendCard";

interface Props {
  projectId: string;
  initialTests: TestRow[];
  canEdit: boolean;
}

export function ProjectWorkspace({ projectId, initialTests, canEdit }: Props) {
  const [tests, setTests] = useState<TestRow[]>(initialTests);
  const [pending, startTransition] = useTransition();

  const { scheduled, totalH } = useMemo(() => {
    const s = schedule(tests);
    return { scheduled: s.tests, totalH: s.totalH };
  }, [tests]);

  const equipments = useMemo(() => {
    const set = new Set<string>();
    for (const t of tests) {
      const e = (t.equipment ?? "").trim();
      if (e) set.add(e);
    }
    return [...set].sort();
  }, [tests]);

  function updateLocal(id: string, patch: Partial<TestRow>) {
    setTests((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
  }

  function saveTest(id: string, patch: TestPatch) {
    updateLocal(id, patch);
    startTransition(async () => {
      await updateTest(id, projectId, patch);
    });
  }

  function handleAdd() {
    startTransition(async () => {
      const t = await addTest(projectId);
      setTests((prev) => [
        ...prev,
        {
          id: t.id,
          projectId: t.projectId,
          order: t.order,
          name: t.name,
          description: t.description,
          durationVal: t.durationVal,
          durationUnit: (t.durationUnit as DurationUnit) ?? "h",
          note: t.note,
          status: t.status,
          equipment: t.equipment,
          parallel: t.parallel,
        },
      ]);
    });
  }

  function handleDelete(id: string) {
    setTests((prev) => prev.filter((t) => t.id !== id));
    startTransition(async () => {
      await deleteTest(id, projectId);
    });
  }

  function handleMove(id: string, dir: "up" | "down") {
    setTests((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      const swap = dir === "up" ? idx - 1 : idx + 1;
      if (idx === -1 || swap < 0 || swap >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
    startTransition(async () => {
      await moveTest(id, projectId, dir);
    });
  }

  return (
    <div className="space-y-5">
      <LegendCard equipments={equipments} />
      <TestTable
        tests={tests}
        onLocal={updateLocal}
        onSave={saveTest}
        onAdd={handleAdd}
        onDelete={handleDelete}
        onMove={handleMove}
        pending={pending}
        canEdit={canEdit}
      />
      <GanttChart scheduled={scheduled} totalH={totalH} />
    </div>
  );
}

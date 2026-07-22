"use client";

import { useState, useTransition } from "react";
import { createLabTask, updateLabTask, takeLabTask, cancelLabTask, getLabTaskHistory } from "./actions";

type UserBasic = { firstName: string; lastName: string; username: string };

export type LabTaskUI = {
  id: string;
  title: string;
  description: string;
  deadline: Date;
  priority: string;
  specialRequest: string | null;
  status: string;
  creatorId: number;
  assigneeId: number | null;
  createdAt: Date;
  creator: UserBasic;
  assignee: UserBasic | null;
};

interface Props {
  initialTasks: LabTaskUI[];
  sessionUser: { id: number; username: string; role: string; permissions?: string[] };
  isAdmin: boolean;
}

export function LabBoard({ initialTasks, sessionUser, isAdmin }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [pending, startTransition] = useTransition();
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<LabTaskUI | null>(null);

  const hasCreatePerm = isAdmin || (sessionUser.permissions?.includes("lab_create") ?? false);
  const hasEngineerPerm = isAdmin || (sessionUser.permissions?.includes("lab_engineer") ?? false);

  const columns = [
    { id: "Nepreluat", label: "Nepreluate" },
    { id: "In lucru", label: "În Lucru" },
    { id: "Finalizat", label: "Finalizate" },
    { id: "Canceled", label: "Anulate" }
  ];

  // Refresh helper -> in realitate, actions fac revalidatePath, deci page isi va lua update, dar client-ul are nevoie sa vada modifcarea locala pt UX fluent sau sa asteptam refresh. 
  // Din moment ce folosim revalidatePath intr-un Server Action pe aceeasi pagina, Next.js va reimprospata `initialTasks`.
  // Pentru simplitate, ne vom baza pe prop-ul `initialTasks` care vine updatat.
  // Dar pentru a nu arata vechiul state cat timp face tranzitia, vom sincroniza tasks cu initialTasks.
  
  if (initialTasks !== tasks && !pending) {
    setTasks(initialTasks);
  }

  return (
    <div>
      {hasCreatePerm && (
        <button 
          onClick={() => setCreateModalOpen(true)}
          className="mb-6 rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          + Adaugă Task
        </button>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div key={col.id} className="w-80 flex-shrink-0 flex flex-col bg-slate-100 rounded-lg p-3">
              <h3 className="font-semibold text-slate-700 mb-3 flex items-center justify-between">
                {col.label} 
                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{colTasks.length}</span>
              </h3>
              <div className="flex flex-col gap-3">
                {colTasks.map(task => (
                  <div 
                    key={task.id} 
                    onClick={() => setSelectedTask(task)}
                    className="bg-white p-3 rounded shadow-sm border border-slate-200 cursor-pointer hover:border-blue-400 transition"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-medium text-blue-600">{task.priority}</span>
                      <span className="text-xs text-slate-400">{new Date(task.createdAt).toLocaleDateString("ro-RO")}</span>
                    </div>
                    <h4 className="font-semibold text-sm mb-1">{task.title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-2">{task.description}</p>
                    <div className="mt-3 flex justify-between items-end text-xs text-slate-500">
                      <div>
                        Resp: {task.assignee ? task.assignee.firstName || task.assignee.username : "Nespecificat"}
                      </div>
                      <div className="text-red-500 font-medium" title="Deadline">
                        ⌛ {new Date(task.deadline).toLocaleDateString("ro-RO")}
                      </div>
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <div className="text-center text-slate-400 text-sm py-4">Fără taskuri</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isCreateModalOpen && (
        <CreateModal 
          onClose={() => setCreateModalOpen(false)}
          onSave={async (data) => {
            startTransition(async () => {
              await createLabTask(data);
              setCreateModalOpen(false);
            });
          }}
          pending={pending}
        />
      )}

      {selectedTask && (
        <EditModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          sessionUser={sessionUser}
          isAdmin={isAdmin}
          hasEngineerPerm={hasEngineerPerm}
          onTake={async (id) => {
            startTransition(async () => {
              await takeLabTask(id);
              setSelectedTask(null);
            });
          }}
          onSave={async (id, patch) => {
            startTransition(async () => {
              await updateLabTask(id, patch);
              setSelectedTask(null);
            });
          }}
          onCancel={async (id) => {
            startTransition(async () => {
              await cancelLabTask(id);
              setSelectedTask(null);
            });
          }}
          pending={pending}
        />
      )}
    </div>
  );
}

function CreateModal({ onClose, onSave, pending }: { onClose: () => void, onSave: (d: any) => void, pending: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-full">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold">Creare Task Laborator</h2>
        </div>
        <form 
          className="p-6 overflow-y-auto flex-1 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            onSave({
              title: fd.get("title") as string,
              description: fd.get("description") as string,
              deadline: fd.get("deadline") as string,
              priority: fd.get("priority") as string,
              specialRequest: fd.get("specialRequest") as string,
            });
          }}
        >
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium text-slate-700">Task / Nr. Reclamație *</span>
            <input name="title" required className="rounded border border-slate-300 px-3 py-2" />
          </label>
          
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium text-slate-700">Coment / Descriere *</span>
            <textarea name="description" required rows={3} className="rounded border border-slate-300 px-3 py-2" />
          </label>
          
          <div className="flex gap-4">
            <label className="flex flex-1 flex-col text-sm">
              <span className="mb-1 font-medium text-slate-700">Deadline *</span>
              <input type="date" name="deadline" required className="rounded border border-slate-300 px-3 py-2" />
            </label>
            <label className="flex flex-1 flex-col text-sm">
              <span className="mb-1 font-medium text-slate-700">Prioritate</span>
              <select name="priority" defaultValue="Medie" className="rounded border border-slate-300 px-3 py-2">
                <option value="Scazuta">Scăzută</option>
                <option value="Medie">Medie</option>
                <option value="Ridicata">Ridicată</option>
                <option value="Urgenta">Urgentă</option>
              </select>
            </label>
          </div>

          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium text-slate-700">Special Request (Opțional)</span>
            <textarea name="specialRequest" rows={2} className="rounded border border-slate-300 px-3 py-2" />
          </label>

          <div className="mt-4 flex gap-3 justify-end">
            <button type="button" onClick={onClose} disabled={pending} className="px-4 py-2 rounded text-slate-600 hover:bg-slate-100">
              Anulare
            </button>
            <button type="submit" disabled={pending} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
              {pending ? "Se salvează..." : "Adaugă Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditModal({ task, onClose, onTake, onSave, onCancel, sessionUser, isAdmin, hasEngineerPerm, pending }: {
  task: LabTaskUI;
  onClose: () => void;
  onTake: (id: string) => void;
  onSave: (id: string, patch: any) => void;
  onCancel: (id: string) => void;
  sessionUser: any;
  isAdmin: boolean;
  hasEngineerPerm: boolean;
  pending: boolean;
}) {
  const isCreator = task.creatorId === sessionUser.id;
  const isAssignee = task.assigneeId === sessionUser.id;
  const canEdit = isAdmin || isAssignee;
  const canCancel = isAdmin || isCreator;
  const canTake = hasEngineerPerm && task.status === "Nepreluat";

  const [editMode, setEditMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<any[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = async () => {
    setShowHistory(true);
    setLoadingHistory(true);
    try {
      const logs = await getLabTaskHistory(task.id);
      setHistoryLogs(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-full relative">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-lg font-bold">Detalii Task</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4 text-sm">
          {!editMode ? (
            <>
              <div className="flex justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="block text-xs text-slate-500">Titlu / Nr</span>
                  <span className="font-semibold text-base">{task.title}</span>
                </div>
                <div className="text-right">
                  <span className="block text-xs text-slate-500">Status</span>
                  <span className="font-medium bg-slate-100 px-2 py-1 rounded">{task.status}</span>
                </div>
              </div>

              <div>
                <span className="block text-xs text-slate-500 mb-1">Descriere</span>
                <p className="whitespace-pre-wrap">{task.description}</p>
              </div>

              <div className="flex justify-between bg-slate-50 p-3 rounded">
                <div>
                  <span className="block text-xs text-slate-500">Creat la</span>
                  <span>{new Date(task.createdAt).toLocaleString("ro-RO")}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-500">Deadline</span>
                  <span className="text-red-600 font-medium">{new Date(task.deadline).toLocaleDateString("ro-RO")}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-500">Prioritate</span>
                  <span>{task.priority}</span>
                </div>
              </div>

              <div>
                <span className="block text-xs text-slate-500 mb-1">Special Request</span>
                <p className="whitespace-pre-wrap italic text-slate-700">{task.specialRequest || "-"}</p>
              </div>

              <div className="flex gap-4 border-t border-slate-100 pt-3">
                <div className="flex-1">
                  <span className="block text-xs text-slate-500">Creat de</span>
                  <span>{task.creator?.firstName} {task.creator?.lastName} ({task.creator?.username})</span>
                </div>
                <div className="flex-1">
                  <span className="block text-xs text-slate-500">Responsabil</span>
                  <span>{task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName} (${task.assignee.username})` : "Nepreluat"}</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 justify-end border-t border-slate-200 pt-4">
                {canCancel && task.status !== "Canceled" && (
                  <button onClick={() => { if(confirm("Anulezi acest task?")) onCancel(task.id) }} disabled={pending} className="px-3 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50">
                    Anulează Task
                  </button>
                )}
                {canEdit && (
                  <button onClick={() => setEditMode(true)} disabled={pending} className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50">
                    Editează
                  </button>
                )}
                <button onClick={loadHistory} disabled={pending} className="px-3 py-1.5 rounded border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                  Vezi Istoric
                </button>
                {canTake && (
                  <button onClick={() => onTake(task.id)} disabled={pending} className="px-4 py-1.5 rounded bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50">
                    {pending ? "Se procesează..." : "Preia Task"}
                  </button>
                )}
              </div>
            </>
          ) : (
            <form 
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                onSave(task.id, {
                  description: fd.get("description"),
                  specialRequest: fd.get("specialRequest"),
                  deadline: fd.get("deadline"),
                  priority: fd.get("priority"),
                  status: fd.get("status")
                });
              }}
            >
              <div className="p-3 bg-blue-50 text-blue-800 rounded mb-2">
                Ești în modul editare. Poți actualiza detaliile și progresul.
              </div>
              
              <label className="flex flex-col">
                <span className="mb-1 font-medium text-slate-700">Descriere</span>
                <textarea name="description" defaultValue={task.description} rows={3} className="rounded border border-slate-300 px-3 py-2" />
              </label>
              
              <label className="flex flex-col">
                <span className="mb-1 font-medium text-slate-700">Special Request</span>
                <textarea name="specialRequest" defaultValue={task.specialRequest || ""} rows={2} className="rounded border border-slate-300 px-3 py-2" />
              </label>
              
              <div className="flex gap-4">
                <label className="flex flex-1 flex-col">
                  <span className="mb-1 font-medium text-slate-700">Deadline</span>
                  <input type="date" name="deadline" defaultValue={new Date(task.deadline).toISOString().split('T')[0]} required className="rounded border border-slate-300 px-3 py-2" />
                </label>
                <label className="flex flex-1 flex-col">
                  <span className="mb-1 font-medium text-slate-700">Prioritate</span>
                  <select name="priority" defaultValue={task.priority} className="rounded border border-slate-300 px-3 py-2">
                    <option value="Scazuta">Scăzută</option>
                    <option value="Medie">Medie</option>
                    <option value="Ridicata">Ridicată</option>
                    <option value="Urgenta">Urgentă</option>
                  </select>
                </label>
              </div>

              <label className="flex flex-col">
                <span className="mb-1 font-medium text-slate-700">Status</span>
                <select name="status" defaultValue={task.status} className="rounded border border-slate-300 px-3 py-2">
                  <option value="Nepreluat">Nepreluat</option>
                  <option value="In lucru">În Lucru</option>
                  <option value="Finalizat">Finalizat</option>
                  {isAdmin && <option value="Canceled">Anulat (Canceled)</option>}
                </select>
              </label>

              <div className="mt-4 flex gap-3 justify-end border-t border-slate-200 pt-4">
                <button type="button" onClick={() => setEditMode(false)} disabled={pending} className="px-4 py-2 rounded text-slate-600 hover:bg-slate-100">
                  Înapoi
                </button>
                <button type="submit" disabled={pending} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                  {pending ? "Se salvează..." : "Salvează Modificări"}
                </button>
              </div>
            </form>
          )}
        </div>
        
        {showHistory && (
          <div className="absolute inset-0 bg-white z-10 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowHistory(false)} className="text-slate-500 hover:text-slate-700 flex items-center gap-1 font-medium text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  Înapoi
                </button>
                <h2 className="text-lg font-bold text-slate-800 border-l border-slate-300 pl-3">Istoric Modificări</h2>
              </div>
              <button onClick={() => { setShowHistory(false); onClose(); }} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {loadingHistory ? (
                <p className="text-slate-500 text-center">Se încarcă istoricul...</p>
              ) : historyLogs && historyLogs.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {historyLogs.map(log => (
                    <div key={log.id} className="border-l-2 border-blue-400 pl-4 py-1">
                      <div className="text-xs text-slate-500 mb-1">
                        {new Date(log.createdAt).toLocaleString("ro-RO")}
                      </div>
                      <div className="font-medium text-sm text-slate-800">
                        {log.user?.firstName} {log.user?.lastName} <span className="text-slate-500 font-normal">({log.user?.username})</span>
                      </div>
                      <div className="text-sm mt-1">
                        <span className="font-semibold">{log.action}</span>
                        {log.changes && <p className="text-slate-600 mt-1 whitespace-pre-wrap">{log.changes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center">Nu există istoric pentru acest task.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";

import {
  CalendarDays,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Factory,
  ImagePlus,
  KeyRound,
  LockKeyhole,
  LogOut,
  Plus,
  RefreshCw,
  Settings,
  Snowflake,
  Trash2,
  UserCog,
  Users,
  X
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Booking, CalendarPayload, Equipment, Role, User, UserRole, Permission } from "@/lib/types";

type ViewMode = "dashboard" | "admin";
type AdminTab = "users" | "equipment" | "roles";

type DialogState = {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm?: () => Promise<void> | void;
};

type BookingDraft = {
  id?: number;
  equipmentId: number;
  dateStart: string;
  dateEnd: string;
  ecrRef: string;
  notes: string;
  error: string;
};

type NewUserForm = {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  badgeId: string;
  email: string;
  role: Role;
};

type NewEquipmentForm = {
  name: string;
  type: string;
  description: string;
};

const blankUserForm: NewUserForm = {
  username: "",
  password: "",
  firstName: "",
  lastName: "",
  badgeId: "",
  email: "",
  role: "User"
};

const blankEquipmentForm: NewEquipmentForm = {
  name: "",
  type: "",
  description: ""
};

async function apiJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers
    }
  });

  let data: unknown = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = data as { error?: string };
    throw new Error(error.error || "A apărut o eroare.");
  }

  return data as T;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function dateKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

function todayKey(): string {
  const now = new Date();
  return dateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

function isoToKey(iso: string): string {
  return iso.slice(0, 10);
}

function displayDate(iso: string): string {
  const [year, month, day] = isoToKey(iso).split("-");
  return `${day}.${month}.${year}`;
}

function isWeekend(year: number, monthIndex: number, day: number): boolean {
  const date = new Date(year, monthIndex, day);
  return date.getDay() === 0 || date.getDay() === 6;
}

function bookingMatchesDay(booking: Booking, key: string): boolean {
  return key >= isoToKey(booking.dateStart) && key <= isoToKey(booking.dateEnd);
}

function getInitialMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function HomeContent() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "admin" ? "admin" : "dashboard";
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => getInitialMonth());
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);
  const [adminTab, setAdminTab] = useState<AdminTab>("users");
  const [newUser, setNewUser] = useState<NewUserForm>(blankUserForm);
  const [newEquipment, setNewEquipment] = useState<NewEquipmentForm>(blankEquipmentForm);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [busy, setBusy] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{
    entity: "equipment" | "user";
    id: number;
    field: string;
    value: string;
  } | null>(null);

  const year = currentMonth.getFullYear();
  const monthIndex = currentMonth.getMonth();
  const monthNumber = monthIndex + 1;
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, index) => index + 1),
    [daysInMonth]
  );
  const monthLabel = useMemo(
    () =>
      currentMonth
        .toLocaleDateString("ro-RO", { month: "long", year: "numeric" })
        .toUpperCase(),
    [currentMonth]
  );

  const showAlert = useCallback((title: string, message: string) => {
    setDialog({ title, message });
  }, []);

  const refreshCalendar = useCallback(async () => {
    const data = await apiJson<CalendarPayload>(
      `/api/calendar?year=${year}&month=${monthNumber}`
    );
    setEquipment(data.equipment);
    setBookings(data.bookings);
  }, [monthNumber, year]);

  const hasPermission = useCallback(
    (p: Permission) => {
      if (!currentUser) return p === "calendar_view" || p === "gantt_view";
      return currentUser.permissions?.includes(p) ?? false;
    },
    [currentUser]
  );

  const refreshAdmin = useCallback(async () => {
    if (!currentUser || !currentUser.permissions?.includes("admin")) return;

    const [usersData, equipmentData, rolesData] = await Promise.all([
      apiJson<{ users: User[] }>("/api/users"),
      apiJson<{ equipment: Equipment[] }>("/api/equipment?activeOnly=false"),
      apiJson<{ roles: UserRole[] }>("/api/roles")
    ]);

    setUsers(usersData.users);
    setAllEquipment(equipmentData.equipment);
    setRoles(rolesData.roles);
  }, [currentUser]);

  useEffect(() => {
    if (!zoomedImage) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomedImage(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [zoomedImage]);

  useEffect(() => {
    apiJson<{ user: User | null }>("/api/auth/me")
      .then((data) => setCurrentUser(data.user))
      .catch((error: Error) => showAlert("Eroare", error.message));
  }, [showAlert]);

  useEffect(() => {
    refreshCalendar().catch((error: Error) => showAlert("Eroare", error.message));
  }, [refreshCalendar, showAlert]);

  useEffect(() => {
    if (view === "admin") {
      refreshAdmin().catch((error: Error) => showAlert("Eroare", error.message));
    }
  }, [refreshAdmin, showAlert, view]);


  const handleLogout = async () => {
    setBusy(true);
    try {
      await apiJson<{ ok: true }>("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      setUsers([]);
      setAllEquipment([]);
      await refreshCalendar();
    } catch (error) {
      showAlert("Eroare", error instanceof Error ? error.message : "A apărut o eroare.");
    } finally {
      setBusy(false);
    }
  };

  const openBooking = (preselectedEquipment?: Equipment, selectedDate?: string) => {
    if (!currentUser) return;

    const firstEquipment = preselectedEquipment ?? equipment[0];
    if (!firstEquipment) {
      showAlert("Eroare", "Nu există echipamente active pentru rezervare.");
      return;
    }

    const selected = selectedDate ?? todayKey();
    setBookingDraft({
      equipmentId: firstEquipment.id,
      dateStart: selected,
      dateEnd: selected,
      ecrRef: "",
      notes: "",
      error: ""
    });
  };

  const submitBooking = async (event: FormEvent) => {
    event.preventDefault();
    if (!bookingDraft) return;

    setBusy(true);
    setBookingDraft({ ...bookingDraft, error: "" });

    try {
      const isEdit = !!bookingDraft.id;
      const url = isEdit ? `/api/bookings/${bookingDraft.id}` : "/api/bookings";
      const method = isEdit ? "PATCH" : "POST";
      
      await apiJson<{ ok: true }>(url, {
        method,
        body: JSON.stringify(bookingDraft)
      });
      setBookingDraft(null);
      await refreshCalendar();
    } catch (error) {
      setBookingDraft({
        ...bookingDraft,
        error: error instanceof Error ? error.message : "A apărut o eroare."
      });
    } finally {
      setBusy(false);
    }
  };

  const deleteBooking = async (booking: Booking) => {
    setBusy(true);
    try {
      await apiJson<{ ok: true }>(`/api/bookings/${booking.id}`, { method: "DELETE" });
      setDetailBooking(null);
      await refreshCalendar();
    } catch (error) {
      showAlert("Eroare", error instanceof Error ? error.message : "A apărut o eroare.");
    } finally {
      setBusy(false);
    }
  };

  const handleAddUser = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);

    try {
      await apiJson<{ ok: true }>("/api/users", {
        method: "POST",
        body: JSON.stringify(newUser)
      });
      setNewUser(blankUserForm);
      await refreshAdmin();
    } catch (error) {
      showAlert("Eroare", error instanceof Error ? error.message : "A apărut o eroare.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    setDialog({
      title: "Confirmare",
      message: "Sigur dorești să ștergi acest utilizator?",
      confirmLabel: "Da",
      danger: true,
      onConfirm: async () => {
        await apiJson<{ ok: true }>(`/api/users/${user.id}`, { method: "DELETE" });
        await refreshAdmin();
      }
    });
  };

  const handleResetPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!resetUser) return;

    setBusy(true);
    try {
      await apiJson<{ ok: true }>(`/api/users/${resetUser.id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ password: resetPassword })
      });
      setResetUser(null);
      setResetPassword("");
      showAlert("Succes", "Parola a fost resetată.");
    } catch (error) {
      showAlert("Eroare", error instanceof Error ? error.message : "A apărut o eroare.");
    } finally {
      setBusy(false);
    }
  };

  const handleAddEquipment = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);

    try {
      await apiJson<{ ok: true }>("/api/equipment", {
        method: "POST",
        body: JSON.stringify(newEquipment)
      });
      setNewEquipment(blankEquipmentForm);
      await Promise.all([refreshAdmin(), refreshCalendar()]);
    } catch (error) {
      showAlert("Eroare", error instanceof Error ? error.message : "A apărut o eroare.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteImage = (item: Equipment) => {
    setDialog({
      title: "Confirmare",
      message: "Sigur dorești să ștergi imaginea acestui echipament?",
      confirmLabel: "Da",
      danger: true,
      onConfirm: async () => {
        await apiJson<{ ok: true }>(`/api/equipment/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify({ imageDataUrl: null })
        });
        await Promise.all([refreshAdmin(), refreshCalendar()]);
      }
    });
  };

  const saveEditingCell = async () => {
    if (!editingCell) return;
    const { entity, id, field, value } = editingCell;
    setEditingCell(null);
    setBusy(true);
    try {
      const url = entity === "equipment" ? `/api/equipment/${id}` : `/api/users/${id}`;
      await apiJson<{ ok: true }>(url, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value })
      });
      await (entity === "equipment"
        ? Promise.all([refreshAdmin(), refreshCalendar()])
        : refreshAdmin());
    } catch (error) {
      showAlert("Eroare", error instanceof Error ? error.message : "A apărut o eroare.");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (entity: "equipment" | "user", id: number, field: string, value: string) => {
    setEditingCell({ entity, id, field, value });
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); saveEditingCell(); }
    if (e.key === "Escape") setEditingCell(null);
  };

  const toggleEquipmentActive = async (item: Equipment) => {
    setBusy(true);
    try {
      await apiJson<{ ok: true }>(`/api/equipment/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !item.isActive })
      });
      await Promise.all([refreshAdmin(), refreshCalendar()]);
    } catch (error) {
      showAlert("Eroare", error instanceof Error ? error.message : "A apărut o eroare.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteEquipment = (item: Equipment) => {
    setDialog({
      title: "Confirmare",
      message: "Sigur dorești să ștergi acest echipament?\nToate rezervările asociate vor fi șterse.",
      confirmLabel: "Da",
      danger: true,
      onConfirm: async () => {
        await apiJson<{ ok: true }>(`/api/equipment/${item.id}`, { method: "DELETE" });
        await Promise.all([refreshAdmin(), refreshCalendar()]);
      }
    });
  };

  const handleImageUpload = async (item: Equipment, file: File | undefined) => {
    if (!file) return;
    if (file.size > 2_500_000) {
      showAlert("Eroare", "Imaginea este prea mare pentru upload pe Vercel.");
      return;
    }

    const imageDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Eroare la citirea imaginii."));
      reader.readAsDataURL(file);
    });

    setBusy(true);
    try {
      await apiJson<{ ok: true }>(`/api/equipment/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ imageDataUrl })
      });
      await Promise.all([refreshAdmin(), refreshCalendar()]);
      showAlert("Succes", "Imaginea a fost salvată.");
    } catch (error) {
      showAlert("Eroare", error instanceof Error ? error.message : "A apărut o eroare.");
    } finally {
      setBusy(false);
    }
  };

  const runDialogConfirm = async () => {
    if (!dialog?.onConfirm) {
      setDialog(null);
      return;
    }

    setBusy(true);
    try {
      await dialog.onConfirm();
      setDialog(null);
    } catch (error) {
      setDialog(null);
      showAlert("Eroare", error instanceof Error ? error.message : "A apărut o eroare.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="app-shell">

      {view === "dashboard" ? (
        <section className="dashboard-view">
          <div className="monthbar">
            <div className="month-actions">
              <button
                className="button secondary square"
                onClick={() => setCurrentMonth(new Date(year, monthIndex - 1, 1))}
                type="button"
                aria-label="Luna precedentă"
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <button
                className="button secondary square"
                onClick={() => setCurrentMonth(new Date(year, monthIndex + 1, 1))}
                type="button"
                aria-label="Luna următoare"
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
              <button
                className="button secondary"
                onClick={() => setCurrentMonth(getInitialMonth())}
                type="button"
              >
                Azi
              </button>
            </div>

            <h1>{monthLabel}</h1>

            <div className="month-actions right">
              <button
                className="button secondary"
                onClick={() =>
                  refreshCalendar().catch((error: Error) =>
                    showAlert("Eroare", error.message)
                  )
                }
                type="button"
              >
                <RefreshCw size={16} aria-hidden="true" />
                Refresh
              </button>
              {currentUser && (
                <button className="button primary" onClick={() => openBooking()} type="button">
                  <Plus size={16} aria-hidden="true" />
                  Booking
                </button>
              )}
            </div>
          </div>

          <div className="calendar-wrap">
            <div
              className="calendar-grid"
              style={{
                gridTemplateColumns: `220px repeat(${daysInMonth}, minmax(28px, 1fr))`
              }}
            >
              <div className="calendar-corner" />
              {days.map((day) => {
                const key = dateKey(year, monthIndex, day);
                const weekend = isWeekend(year, monthIndex, day);
                const today = key === todayKey();
                return (
                  <div
                    className={`day-header ${weekend ? "weekend" : ""} ${
                      today ? "today" : ""
                    }`}
                    key={`day-${day}`}
                  >
                    {day}
                  </div>
                );
              })}

              {equipment.map((item, equipmentIndex) => {
                const alternate = equipmentIndex % 2 === 1;
                return (
                  <div className="calendar-row-fragment" key={item.id}>
                    <div className={`equipment-cell ${alternate ? "alternate" : ""}`}>
                      <div
                        className={`equipment-thumb${item.imageDataUrl ? " has-image" : ""}`}
                        onClick={item.imageDataUrl ? () => setZoomedImage(item.imageDataUrl!) : undefined}
                        onKeyDown={item.imageDataUrl ? (e) => { if (e.key === "Enter" || e.key === " ") setZoomedImage(item.imageDataUrl!); } : undefined}
                        role={item.imageDataUrl ? "button" : undefined}
                        tabIndex={item.imageDataUrl ? 0 : undefined}
                        aria-label={item.imageDataUrl ? `Mărire imagine ${item.name}` : undefined}
                      >
                        {item.imageDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageDataUrl} alt="" />
                        ) : (
                          <Camera size={22} aria-hidden="true" />
                        )}
                      </div>
                      <div className="equipment-copy">
                        <strong>{item.name}</strong>
                        <span>{item.type}</span>
                        {item.description && (
                          <span className="equipment-desc">{item.description}</span>
                        )}
                      </div>
                    </div>

                    {days.map((day) => {
                      const key = dateKey(year, monthIndex, day);
                      const weekend = isWeekend(year, monthIndex, day);
                      const booking = bookings.find(
                        (candidate) =>
                          candidate.equipmentId === item.id &&
                          bookingMatchesDay(candidate, key)
                      );

                      if (booking) {
                        return (
                          <button
                            className="calendar-cell booked"
                            key={`${item.id}-${day}`}
                            onClick={() => setDetailBooking(booking)}
                            title={`${booking.userName}\n${booking.ecrRef}\n${displayDate(
                              booking.dateStart
                            )} - ${displayDate(booking.dateEnd)}\n${booking.notes}`}
                            type="button"
                          >
                            {booking.ecrRef.slice(0, 4)}
                          </button>
                        );
                      }

                      return (
                        <button
                          className={`calendar-cell ${alternate ? "alternate" : ""} ${
                            weekend ? "weekend" : ""
                          } ${hasPermission("calendar_book") ? "clickable" : ""}`}
                          key={`${item.id}-${day}`}
                          onClick={() => openBooking(item, key)}
                          disabled={!hasPermission("calendar_book")}
                          type="button"
                          aria-label={`Rezervare ${item.name}, ${day}`}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : (
        <section className="admin-view">
          <div className="admin-header">
            <Settings size={20} aria-hidden="true" />
            <h1>Admin Panel</h1>
          </div>

          <div className="tabs" role="tablist" aria-label="Admin">
            <button
              className={`tab-button ${adminTab === "users" ? "active" : ""}`}
              onClick={() => setAdminTab("users")}
              role="tab"
              type="button"
            >
              <Users size={16} aria-hidden="true" />
              Utilizatori
            </button>
            <button
              className={`tab-button ${adminTab === "equipment" ? "active" : ""}`}
              onClick={() => setAdminTab("equipment")}
              role="tab"
              type="button"
            >
              <Factory size={16} aria-hidden="true" />
              Echipamente
            </button>
            <button
              className={`tab-button ${adminTab === "roles" ? "active" : ""}`}
              onClick={() => setAdminTab("roles")}
              role="tab"
              type="button"
            >
              <LockKeyhole size={16} aria-hidden="true" />
              Permisiuni
            </button>
          </div>

          {adminTab === "users" ? (
            <div className="admin-panel">
              <form className="inline-form user-form" onSubmit={handleAddUser}>
                <input
                  value={newUser.username || ""}
                  onChange={(event) =>
                    setNewUser((value) => ({ ...value, username: event.target.value }))
                  }
                  placeholder="Username"
                />
                <input
                  value={newUser.password || ""}
                  onChange={(event) =>
                    setNewUser((value) => ({ ...value, password: event.target.value }))
                  }
                  placeholder="Parola"
                  type="password"
                />
                <input
                  value={newUser.firstName || ""}
                  onChange={(event) =>
                    setNewUser((value) => ({ ...value, firstName: event.target.value }))
                  }
                  placeholder="Nume"
                />
                <input
                  value={newUser.lastName || ""}
                  onChange={(event) =>
                    setNewUser((value) => ({ ...value, lastName: event.target.value }))
                  }
                  placeholder="Prenume"
                />
                <input
                  value={newUser.badgeId || ""}
                  onChange={(event) =>
                    setNewUser((value) => ({ ...value, badgeId: event.target.value }))
                  }
                  placeholder="Marca"
                />
                <input
                  value={newUser.email || ""}
                  onChange={(event) =>
                    setNewUser((value) => ({ ...value, email: event.target.value }))
                  }
                  placeholder="Email"
                  type="email"
                />
                <select
                  value={newUser.role || "User"}
                  onChange={(event) =>
                    setNewUser((value) => ({
                      ...value,
                      role: event.target.value
                    }))
                  }
                >
                  {roles.map(r => (
                    <option key={r.name} value={r.name}>{r.name}</option>
                  ))}
                </select>
                <button className="button primary" disabled={busy} type="submit">
                  <Plus size={16} aria-hidden="true" />
                  Adaugă User
                </button>
              </form>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Username</th>
                      <th>Nume</th>
                      <th>Prenume</th>
                      <th>Marca</th>
                      <th>Email</th>
                      <th>Rol</th>
                      <th>Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.id}</td>
                        <td className="editable-cell" onClick={() => startEdit("user", user.id, "username", user.username)}>
                          {editingCell?.entity === "user" && editingCell.id === user.id && editingCell.field === "username" ? (
                            <input autoFocus className="inline-edit" value={editingCell.value}
                              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                              onBlur={saveEditingCell} onKeyDown={handleCellKeyDown} />
                          ) : user.username}
                        </td>
                        <td className="editable-cell" onClick={() => startEdit("user", user.id, "firstName", user.firstName)}>
                          {editingCell?.entity === "user" && editingCell.id === user.id && editingCell.field === "firstName" ? (
                            <input autoFocus className="inline-edit" value={editingCell.value}
                              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                              onBlur={saveEditingCell} onKeyDown={handleCellKeyDown} />
                          ) : user.firstName}
                        </td>
                        <td className="editable-cell" onClick={() => startEdit("user", user.id, "lastName", user.lastName)}>
                          {editingCell?.entity === "user" && editingCell.id === user.id && editingCell.field === "lastName" ? (
                            <input autoFocus className="inline-edit" value={editingCell.value}
                              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                              onBlur={saveEditingCell} onKeyDown={handleCellKeyDown} />
                          ) : user.lastName}
                        </td>
                        <td className="editable-cell" onClick={() => startEdit("user", user.id, "badgeId", user.badgeId)}>
                          {editingCell?.entity === "user" && editingCell.id === user.id && editingCell.field === "badgeId" ? (
                            <input autoFocus className="inline-edit" value={editingCell.value}
                              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                              onBlur={saveEditingCell} onKeyDown={handleCellKeyDown} />
                          ) : user.badgeId}
                        </td>
                        <td className="editable-cell" onClick={() => startEdit("user", user.id, "email", user.email)}>
                          {editingCell?.entity === "user" && editingCell.id === user.id && editingCell.field === "email" ? (
                            <input autoFocus className="inline-edit" value={editingCell.value}
                              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                              onBlur={saveEditingCell} onKeyDown={handleCellKeyDown} />
                          ) : user.email}
                        </td>
                        <td className="editable-cell" onClick={() => startEdit("user", user.id, "role", user.role)}>
                          {editingCell?.entity === "user" && editingCell.id === user.id && editingCell.field === "role" ? (
                            <select autoFocus className="inline-edit" value={editingCell.value}
                              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                              onBlur={saveEditingCell} onKeyDown={handleCellKeyDown}>
                              {roles.map((r) => (
                                <option key={r.name} value={r.name}>{r.name}</option>
                              ))}
                            </select>
                          ) : user.role}
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="button secondary compact"
                              onClick={() => setResetUser(user)}
                              type="button"
                            >
                              <LockKeyhole size={15} aria-hidden="true" />
                              Reset Parolă
                            </button>
                            <button
                              className="button danger compact"
                              onClick={() => handleDeleteUser(user)}
                              type="button"
                            >
                              <Trash2 size={15} aria-hidden="true" />
                              Șterge
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : adminTab === "equipment" ? (
            <div className="admin-panel">
              <form className="inline-form equipment-form" onSubmit={handleAddEquipment}>
                <input
                  value={newEquipment.name || ""}
                  onChange={(event) =>
                    setNewEquipment((value) => ({ ...value, name: event.target.value }))
                  }
                  placeholder="Nume"
                />
                <input
                  value={newEquipment.type || ""}
                  onChange={(event) =>
                    setNewEquipment((value) => ({ ...value, type: event.target.value }))
                  }
                  placeholder="Tip"
                />
                <input
                  value={newEquipment.description || ""}
                  onChange={(event) =>
                    setNewEquipment((value) => ({
                      ...value,
                      description: event.target.value
                    }))
                  }
                  placeholder="Descriere"
                />
                <button className="button primary" disabled={busy} type="submit">
                  <Plus size={16} aria-hidden="true" />
                  Adaugă Echipament
                </button>
              </form>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Poză</th>
                      <th>Nume</th>
                      <th>Tip</th>
                      <th>Descriere</th>
                      <th>Activ</th>
                      <th>Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allEquipment.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>
                          <div className="admin-thumb-wrap">
                            {item.imageDataUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                className="admin-thumb"
                                src={item.imageDataUrl}
                                alt=""
                                onClick={() => setZoomedImage(item.imageDataUrl!)}
                              />
                            ) : (
                              <div className="admin-thumb-empty">
                                <Camera size={18} aria-hidden="true" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="editable-cell" onClick={() => startEdit("equipment", item.id, "name", item.name)}>
                          {editingCell?.entity === "equipment" && editingCell.id === item.id && editingCell.field === "name" ? (
                            <input autoFocus className="inline-edit" value={editingCell.value}
                              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                              onBlur={saveEditingCell} onKeyDown={handleCellKeyDown} />
                          ) : item.name}
                        </td>
                        <td className="editable-cell" onClick={() => startEdit("equipment", item.id, "type", item.type)}>
                          {editingCell?.entity === "equipment" && editingCell.id === item.id && editingCell.field === "type" ? (
                            <input autoFocus className="inline-edit" value={editingCell.value}
                              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                              onBlur={saveEditingCell} onKeyDown={handleCellKeyDown} />
                          ) : item.type}
                        </td>
                        <td className="editable-cell" onClick={() => startEdit("equipment", item.id, "description", item.description)}>
                          {editingCell?.entity === "equipment" && editingCell.id === item.id && editingCell.field === "description" ? (
                            <input autoFocus className="inline-edit" value={editingCell.value}
                              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                              onBlur={saveEditingCell} onKeyDown={handleCellKeyDown} />
                          ) : item.description}
                        </td>
                        <td>
                          <button
                            className={`status-dot-btn ${item.isActive ? "on" : ""}`}
                            onClick={() => toggleEquipmentActive(item)}
                            type="button"
                            title={item.isActive ? "Dezactivează" : "Activează"}
                          />
                        </td>
                        <td>
                          <div className="row-actions">
                            <label className="button secondary compact file-button">
                              <ImagePlus size={15} aria-hidden="true" />
                              Poză
                              <input
                                accept="image/png,image/jpeg,image/bmp"
                                onChange={(event) => {
                                  handleImageUpload(item, event.target.files?.[0]).catch(
                                    (error: Error) => showAlert("Eroare", error.message)
                                  );
                                  event.currentTarget.value = "";
                                }}
                                type="file"
                              />
                            </label>
                            {item.imageDataUrl && (
                              <button
                                className="button secondary compact"
                                onClick={() => handleDeleteImage(item)}
                                type="button"
                              >
                                <Trash2 size={15} aria-hidden="true" />
                                Șterge Poză
                              </button>
                            )}
                            <button
                              className="button danger compact"
                              onClick={() => handleDeleteEquipment(item)}
                              type="button"
                            >
                              <Trash2 size={15} aria-hidden="true" />
                              Șterge
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : adminTab === "roles" ? (
            <div className="admin-panel">
              <form 
                className="inline-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  try {
                    const form = e.target as HTMLFormElement;
                    const input = form.elements.namedItem("roleName") as HTMLInputElement;
                    const name = input.value.trim();
                    if (!name) return;
                    await apiJson("/api/roles", { method: "POST", body: JSON.stringify({ name, permissions: ["calendar_view", "gantt_view"] }) as unknown as BodyInit });
                    input.value = "";
                    await refreshAdmin();
                  } catch (err) {
                    showAlert("Eroare", (err as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <input name="roleName" placeholder="Nume Rol Nou" />
                <button className="button primary" disabled={busy} type="submit">
                  <Plus size={16} aria-hidden="true" />
                  Adaugă Rol
                </button>
              </form>

              <div className="table-wrap" style={{ marginTop: "16px" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Nume Rol</th>
                      <th>Calendar View</th>
                      <th>Calendar Book</th>
                      <th>Gantt View</th>
                      <th>Gantt Edit</th>
                      <th>Lab View</th>
                      <th>Lab Create</th>
                      <th>Lab Engineer</th>
                      <th>Admin</th>
                      <th>Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((r) => (
                      <tr key={r.name}>
                        <td><strong>{r.name}</strong></td>
                        {(["calendar_view", "calendar_book", "gantt_view", "gantt_edit", "lab_view", "lab_create", "lab_engineer", "admin"] as Permission[]).map((p) => (
                          <td key={p} style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={r.permissions.includes(p)}
                              onChange={async (e) => {
                                const checked = e.target.checked;
                                const newPerms = checked
                                  ? [...r.permissions, p]
                                  : r.permissions.filter((x) => x !== p);

                                try {
                                  await apiJson("/api/roles", {
                                    method: "POST",
                                    body: JSON.stringify({ name: r.name, permissions: newPerms }) as unknown as BodyInit
                                  });
                                  await refreshAdmin();
                                } catch (err) {
                                  showAlert("Eroare", (err as Error).message);
                                }
                              }}
                            />
                          </td>
                        ))}
                        <td>
                          {r.name !== "Admin" && (
                            <button
                              className="button danger compact"
                              onClick={async () => {
                                setDialog({
                                  title: "Șterge rol",
                                  message: `Sigur ștergi rolul ${r.name}? Această acțiune este ireversibilă.`,
                                  confirmLabel: "Șterge",
                                  danger: true,
                                  onConfirm: async () => {
                                    await apiJson(`/api/roles?name=${encodeURIComponent(r.name)}`, { method: "DELETE" });
                                    await refreshAdmin();
                                  }
                                });
                              }}
                              type="button"
                            >
                              <Trash2 size={15} aria-hidden="true" />
                              Șterge
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      )}

      {bookingDraft && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-card booking-card" onSubmit={submitBooking}>
            <button
              className="modal-close"
              onClick={() => setBookingDraft(null)}
              type="button"
              aria-label="Închide"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <h2>
              <CalendarDays size={20} aria-hidden="true" />
              {bookingDraft.id ? "Editare Rezervare" : "Rezervare Nouă"}
            </h2>
            <label>
              Echipament
              <select
                value={bookingDraft.equipmentId}
                onChange={(event) =>
                  setBookingDraft((value) =>
                    value ? { ...value, equipmentId: Number(event.target.value) } : value
                  )
                }
              >
                {equipment.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.type})
                  </option>
                ))}
              </select>
            </label>
            <div className="date-pair">
              <label>
                Data Start
                <input
                  value={bookingDraft.dateStart}
                  onChange={(event) =>
                    setBookingDraft((value) =>
                      value ? { ...value, dateStart: event.target.value } : value
                    )
                  }
                  type="date"
                />
              </label>
              <label>
                Data End
                <input
                  value={bookingDraft.dateEnd}
                  onChange={(event) =>
                    setBookingDraft((value) =>
                      value ? { ...value, dateEnd: event.target.value } : value
                    )
                  }
                  type="date"
                />
              </label>
            </div>
            <label>
              ECR Reference
              <input
                value={bookingDraft.ecrRef}
                onChange={(event) =>
                  setBookingDraft((value) =>
                    value ? { ...value, ecrRef: event.target.value } : value
                  )
                }
              />
            </label>
            <label>
              Note
              <textarea
                value={bookingDraft.notes}
                onChange={(event) =>
                  setBookingDraft((value) =>
                    value ? { ...value, notes: event.target.value } : value
                  )
                }
              />
            </label>
            {bookingDraft.error && <p className="form-error">{bookingDraft.error}</p>}
            <div className="modal-actions">
              <button
                className="button secondary"
                onClick={() => setBookingDraft(null)}
                type="button"
              >
                Anulează
              </button>
              <button className="button primary" disabled={busy} type="submit">
                <Check size={16} aria-hidden="true" />
                Confirmă Rezervarea
              </button>
            </div>
          </form>
        </div>
      )}

      {detailBooking && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card detail-card">
            <button
              className="modal-close"
              onClick={() => setDetailBooking(null)}
              type="button"
              aria-label="Închide"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <h2>Detalii Booking</h2>
            <dl className="detail-list">
              <div>
                <dt>Echipament</dt>
                <dd>{detailBooking.equipmentName}</dd>
              </div>
              <div>
                <dt>Utilizator</dt>
                <dd>
                  <strong>
                    {detailBooking.userFirstName || detailBooking.userLastName
                      ? `${detailBooking.userFirstName} ${detailBooking.userLastName}`.trim()
                      : detailBooking.userName}
                  </strong>
                  <span>Username: {detailBooking.userName}</span>
                  <span>Marca: {detailBooking.userBadgeId}</span>
                  <span>Email: {detailBooking.userEmail}</span>
                </dd>
              </div>
              <div>
                <dt>Perioadă</dt>
                <dd>
                  {displayDate(detailBooking.dateStart)} - {displayDate(detailBooking.dateEnd)}
                </dd>
              </div>
              <div>
                <dt>ECR</dt>
                <dd>{detailBooking.ecrRef}</dd>
              </div>
              <div>
                <dt>Note</dt>
                <dd>{detailBooking.notes}</dd>
              </div>
            </dl>
            <div className="modal-actions">
              <button
                className="button secondary"
                onClick={() => setDetailBooking(null)}
                type="button"
              >
                OK
              </button>
              {currentUser &&
                (currentUser.role === "Admin" || currentUser.id === detailBooking.userId) && (
                  <>
                    <button
                      className="button primary"
                      onClick={() => {
                        setBookingDraft({
                          id: detailBooking.id,
                          equipmentId: detailBooking.equipmentId,
                          dateStart: isoToKey(detailBooking.dateStart),
                          dateEnd: isoToKey(detailBooking.dateEnd),
                          ecrRef: detailBooking.ecrRef,
                          notes: detailBooking.notes,
                          error: ""
                        });
                        setDetailBooking(null);
                      }}
                      type="button"
                    >
                      Editează
                    </button>
                    <button
                      className="button danger"
                      onClick={() => deleteBooking(detailBooking)}
                      type="button"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                      Șterge
                    </button>
                  </>
                )}
            </div>
          </div>
        </div>
      )}

      {resetUser && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-card input-card" onSubmit={handleResetPassword}>
            <h2>Resetare Parolă</h2>
            <label>
              Parolă nouă:
              <input
                autoFocus
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
                type="password"
              />
            </label>
            <div className="modal-actions">
              <button
                className="button secondary"
                onClick={() => {
                  setResetUser(null);
                  setResetPassword("");
                }}
                type="button"
              >
                Anulează
              </button>
              <button className="button primary" disabled={busy} type="submit">
                OK
              </button>
            </div>
          </form>
        </div>
      )}

      {dialog && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card message-card">
            <h2>{dialog.title}</h2>
            <p>{dialog.message}</p>
            <div className="modal-actions">
              {dialog.onConfirm ? (
                <>
                  <button
                    className="button secondary"
                    onClick={() => setDialog(null)}
                    type="button"
                  >
                    Nu
                  </button>
                  <button
                    className={`button ${dialog.danger ? "danger" : "primary"}`}
                    disabled={busy}
                    onClick={runDialogConfirm}
                    type="button"
                  >
                    {dialog.confirmLabel ?? "Da"}
                  </button>
                </>
              ) : (
                <button className="button primary" onClick={() => setDialog(null)} type="button">
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {zoomedImage && (
        <div
          className="modal-backdrop"
          onClick={() => setZoomedImage(null)}
          role="presentation"
        >
          <div className="image-lightbox" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setZoomedImage(null)}
              type="button"
              aria-label="Închide"
            >
              <X size={18} aria-hidden="true" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoomedImage} alt="Echipament" />
          </div>
        </div>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}

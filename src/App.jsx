import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Download,
  Plus,
  Trash2,
  Copy,
  CalendarDays,
  Database,
  Wind,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  Package,
  Boxes,
  Fan,
  Thermometer,
  ClipboardList,
  Circle,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const POSITIONS = [1, 2, 3, 4, 5, 6, 7, 8];
const STORAGE_KEY = "buzzfly_bsf_multi_container_daily_reviews_v4_clean";
const SUPABASE_STATE_ID = "buzzfly-bsf-main";
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || "";
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const DEFAULT_CONTAINERS = Array.from({ length: 17 }, (_, i) => ({
  id: `CT-${i + 1}`,
  number: String(i + 1),
  name: `CT ${i + 1}`,
}));

const BRAND = {
  navy: "#07354A",
  navyDark: "#05293A",
  text: "#12222B",
  muted: "#64727A",
  line: "#DDE5E8",
  soft: "#F6F8F9",
  softBlue: "#EEF5F8",
  white: "#FFFFFF",
  pallet: "#C9B89E",
  palletDark: "#9A876E",
  crateBlue: "#1685C0",
  crateBlack: "#252D33",
  ok: "#2F7D4D",
  warn: "#C98716",
  danger: "#B83232",
  empty: "#8A96A0",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateBR(value) {
  if (!value) return "-";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

function emptyPosition(pos) {
  return {
    position: pos,
    lote: "",
    caixas: "",
    dieta: "",
    dietaKgPorCaixa: "",
    uso: "Produção",
    status: "OK",
    observacoes: "",
  };
}

function emptyContainerReview(container) {
  return {
    containerId: container.id,
    ct: container.number,
    name: container.name,
    ventilacao: "Manual",
    recirculacao: "OFF",
    setpoint: "",
    observacoesGerais: "",
    positions: POSITIONS.map(emptyPosition),
  };
}

function makeDayReview(date, containers) {
  return {
    id: crypto.randomUUID(),
    date,
    responsavel: "",
    containers: containers.map(emptyContainerReview),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (stored?.containers?.length && stored?.dailyReviews) return stored;
  } catch {}
  const initial = { containers: DEFAULT_CONTAINERS, dailyReviews: [] };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function persist(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function loadStateFromSupabase() {
  if (!supabase) return loadState();

  const localState = loadState();
  const { data, error } = await supabase
    .from("app_state")
    .select("data")
    .eq("id", SUPABASE_STATE_ID)
    .maybeSingle();

  if (error) {
    console.error("Erro ao carregar Supabase:", error);
    return localState;
  }

  if (data?.data?.containers?.length && Array.isArray(data.data.dailyReviews)) {
    persist(data.data);
    return data.data;
  }

  const initial = localState?.containers?.length ? localState : { containers: DEFAULT_CONTAINERS, dailyReviews: [] };
  const { error: insertError } = await supabase
    .from("app_state")
    .upsert({ id: SUPABASE_STATE_ID, data: initial, updated_at: new Date().toISOString() });

  if (insertError) console.error("Erro ao criar estado inicial no Supabase:", insertError);
  return initial;
}

async function persistToSupabase(state) {
  persist(state);
  if (!supabase) return;

  const { error } = await supabase
    .from("app_state")
    .upsert({ id: SUPABASE_STATE_ID, data: state, updated_at: new Date().toISOString() });

  if (error) console.error("Erro ao salvar no Supabase:", error);
}

function clonePreviousDayReview(previous, targetDate, containers) {
  const previousMap = new Map(previous.containers.map((c) => [c.containerId, c]));
  return {
    id: crypto.randomUUID(),
    date: targetDate,
    responsavel: previous.responsavel || "",
    containers: containers.map((container) => {
      const prev = previousMap.get(container.id);
      if (!prev) return emptyContainerReview(container);
      return { ...JSON.parse(JSON.stringify(prev)), ct: container.number, name: container.name };
    }),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    clonedFrom: previous.date,
  };
}

function statusMeta(status) {
  if (status === "Crítico") return { bg: "#FDECEC", color: BRAND.danger, icon: AlertTriangle, label: "Crítico" };
  if (status === "Atenção") return { bg: "#FFF6DF", color: BRAND.warn, icon: AlertTriangle, label: "Atenção" };
  if (status === "Vazio") return { bg: "#F1F5F7", color: BRAND.empty, icon: Circle, label: "Vazio" };
  return { bg: "#EAF7EF", color: BRAND.ok, icon: CheckCircle2, label: "OK" };
}

function LarvaYellowIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <ellipse cx="32" cy="14" rx="5.5" ry="4.5" fill="#E7B52E" />
      <ellipse cx="32" cy="21" rx="7" ry="5.2" fill="#F0C13D" />
      <ellipse cx="32" cy="29" rx="8.8" ry="6" fill="#F4C542" />
      <ellipse cx="32" cy="38" rx="10.8" ry="6.8" fill="#F7CF59" />
      <ellipse cx="32" cy="48" rx="8.5" ry="5.5" fill="#E8B932" />
      <path d="M26 18 C29 19, 35 19, 38 18" stroke="#C9961E" strokeWidth="1.4" fill="none" />
      <path d="M24 26 C28 27.5, 36 27.5, 40 26" stroke="#C9961E" strokeWidth="1.4" fill="none" />
      <path d="M22 35 C27 36.5, 37 36.5, 42 35" stroke="#C9961E" strokeWidth="1.4" fill="none" />
      <path d="M24 45 C28 46.2, 36 46.2, 40 45" stroke="#B88618" strokeWidth="1.4" fill="none" />
      <circle cx="30" cy="13.2" r="0.9" fill="#5C4A12" />
      <circle cx="34" cy="13.2" r="0.9" fill="#5C4A12" />
    </svg>
  );
}

function SmallLarvaPinkIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <ellipse cx="32" cy="16" rx="4.8" ry="4" fill="#E78FAA" />
      <ellipse cx="32" cy="23" rx="6.2" ry="4.8" fill="#F0A7BE" />
      <ellipse cx="32" cy="31" rx="7.8" ry="5.5" fill="#F6B6CA" />
      <ellipse cx="32" cy="40" rx="9.2" ry="6.2" fill="#F2A7BF" />
      <ellipse cx="32" cy="49" rx="7.2" ry="4.8" fill="#DC7F9F" />
      <path d="M27 20 C29.5 21, 34.5 21, 37 20" stroke="#BE6D8C" strokeWidth="1.2" fill="none" />
      <path d="M25 28 C28.5 29.2, 35.5 29.2, 39 28" stroke="#BE6D8C" strokeWidth="1.2" fill="none" />
      <path d="M23.5 37 C28 38.2, 36 38.2, 40.5 37" stroke="#BE6D8C" strokeWidth="1.2" fill="none" />
      <path d="M25.5 46 C28.5 47, 35.5 47, 38.5 46" stroke="#A85B79" strokeWidth="1.2" fill="none" />
      <circle cx="30.3" cy="15.2" r="0.8" fill="#7C3A55" />
      <circle cx="33.7" cy="15.2" r="0.8" fill="#7C3A55" />
    </svg>
  );
}

function PupaBlackIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <ellipse cx="32" cy="32" rx="12" ry="20" fill="#1A1A1A" />
      <path d="M32 14 L32 50" stroke="#3A3A3A" strokeWidth="2" />
      <path d="M24 20 C28 22, 36 22, 40 20" stroke="#3A3A3A" strokeWidth="2" fill="none" />
      <path d="M22 28 C27 30, 37 30, 42 28" stroke="#3A3A3A" strokeWidth="2" fill="none" />
      <path d="M22 36 C27 38, 37 38, 42 36" stroke="#3A3A3A" strokeWidth="2" fill="none" />
      <path d="M24 44 C28 46, 36 46, 40 44" stroke="#3A3A3A" strokeWidth="2" fill="none" />
    </svg>
  );
}

function usageMeta(uso) {
  if (uso === "Produção") return { bg: "#FFF7D6", color: "#8A6A00", icon: LarvaYellowIcon, label: "Produção" };
  if (uso === "Colônia") return { bg: "#F1F3F5", color: "#1F2933", icon: PupaBlackIcon, label: "Colônia" };
  if (uso === "Maternidade") return { bg: "#FDEDF3", color: "#A64D6C", icon: SmallLarvaPinkIcon, label: "Maternidade" };
  if (uso === "Vazio") return { bg: "#F1F5F7", color: BRAND.empty, icon: Boxes, label: "Vazio" };
  return { bg: "#FFF7D6", color: "#8A6A00", icon: LarvaYellowIcon, label: uso || "Produção" };
}

function normalizeContainerUse(uso) {
  if (uso === "Maternidade") return "Maternidade";
  if (uso === "Colônia") return "Colônia";
  if (uso === "Produção" || uso === "Engorda") return "Produção";
  return "Vazio";
}

function getContainerUseBadges(container) {
  const totalsByUse = {
    Produção: 0,
    Colônia: 0,
    Maternidade: 0,
  };

  (container.positions || []).forEach((p) => {
    const normalized = normalizeContainerUse(p.uso);
    const caixas = Number(p.caixas) || 0;
    if (normalized !== "Vazio" && caixas > 0) totalsByUse[normalized] += caixas;
  });

  const badges = [];

  if (totalsByUse["Produção"] > 0) badges.push({ label: "Produção", value: totalsByUse["Produção"], bg: "#FFF7D6", color: "#8A6A00", border: "#F2DE8A", icon: LarvaYellowIcon });
  if (totalsByUse["Colônia"] > 0) badges.push({ label: "Colônia", value: totalsByUse["Colônia"], bg: "#F1F3F5", color: "#1F2933", border: "#D4DADF", icon: PupaBlackIcon });
  if (totalsByUse["Maternidade"] > 0) badges.push({ label: "Maternidade", value: totalsByUse["Maternidade"], bg: "#FDEDF3", color: "#A64D6C", border: "#F4BDD3", icon: SmallLarvaPinkIcon });

  if (badges.length === 0) return [{ label: "Vazio", value: 0, bg: "#F1F5F7", color: BRAND.empty, border: "#D8E1E6", icon: Boxes }];

  return badges.sort((a, b) => b.value - a.value).slice(0, 2);
}

function computeContainerTotals(c) {
  return c.positions.reduce(
    (acc, p) => {
      const caixas = Number(p.caixas) || 0;
      const dietaKgPorCaixa = Number(p.dietaKgPorCaixa) || 0;
      const dietaTotal = caixas * dietaKgPorCaixa;
      const emUso = p.status !== "Vazio" && (p.lote || caixas > 0);

      acc.boxes += caixas;
      acc.dietKg += dietaTotal;

      if (p.status === "Crítico") acc.critical += 1;
      if (p.status === "Atenção") acc.attention += 1;
      if (p.status === "OK") acc.ok += 1;
      if (p.status === "Vazio") acc.empty += 1;
      if (emUso) acc.filled += 1;

      if (p.uso === "Produção" || p.uso === "Engorda" || p.uso === "Colônia") {
        // Engorda operacional = Produção + Colônia
        acc.fatteningBoxes += caixas;
        if (emUso) acc.fatteningPositions += 1;
      }

      if (p.uso === "Maternidade") {
        acc.maternityBoxes += caixas;
        if (emUso) acc.maternityPositions += 1;
      }

      if (p.uso === "Colônia") {
        acc.colonyBoxes += caixas;
        if (emUso) acc.colonyPositions += 1;
      }

      acc[p.uso] = (acc[p.uso] || 0) + 1;
      return acc;
    },
    {
      boxes: 0,
      dietKg: 0,
      critical: 0,
      attention: 0,
      ok: 0,
      empty: 0,
      filled: 0,
      fatteningBoxes: 0,
      maternityBoxes: 0,
      colonyBoxes: 0,
      fatteningPositions: 0,
      maternityPositions: 0,
      colonyPositions: 0,
    }
  );
}

function BsfIcon({ size = 52, color = BRAND.navy }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M26 10 L22 4" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M38 10 L42 4" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="32" cy="14" r="5" stroke={color} strokeWidth="2.4" />
      <ellipse cx="32" cy="27" rx="7" ry="9" stroke={color} strokeWidth="2.4" />
      <ellipse cx="32" cy="43" rx="6" ry="12" stroke={color} strokeWidth="2.4" />
      <path d="M27 22 C16 16, 10 20, 9 30 C9 38, 16 40, 26 33" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M37 22 C48 16, 54 20, 55 30 C55 38, 48 40, 38 33" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M27 31 L20 38" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M37 31 L44 38" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M27 39 L20 48" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M37 39 L44 48" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M28 47 L23 57" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M36 47 L41 57" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function BuzzLogo() {
  return (
    <div className="flex items-center select-none" aria-label="Buzz Fly">
      <div className="flex items-end gap-3 leading-none">
        <span
          className="text-4xl md:text-5xl font-light tracking-[0.38em]"
          style={{ color: BRAND.navy }}
        >
          BUZZ
        </span>
        <span
          className="text-lg md:text-xl font-light tracking-[0.24em] mb-1.5"
          style={{ color: BRAND.navy }}
        >
          FLY
        </span>
      </div>
    </div>
  );
}

function StatusDot({ status }) {
  const meta = statusMeta(status);
  return <span className="h-3 w-3 rounded-full" style={{ backgroundColor: meta.color }} />;
}

function UsePill({ uso, small = false }) {
  const meta = usageMeta(uso);
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${small ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"}`}
      style={{ backgroundColor: meta.bg, color: meta.color }}
    >
      <span className={small ? "h-3.5 w-3.5" : "h-4 w-4"}>
        <Icon className="h-full w-full" />
      </span>
      {meta.label}
    </span>
  );
}

function StatusPill({ status, small = false }) {
  const meta = statusMeta(status);
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${small ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"}`} style={{ backgroundColor: meta.bg, color: meta.color }}>
      <Icon className={small ? "h-3 w-3" : "h-4 w-4"} /> {meta.label}
    </span>
  );
}

export default function BSFContainerReviewSystem() {
  const [state, setState] = useState(() => ({ containers: DEFAULT_CONTAINERS, dailyReviews: [] }));
  const [isLoadingOnline, setIsLoadingOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState(supabase ? "Conectando ao Supabase..." : "Modo local");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [selectedContainerId, setSelectedContainerId] = useState(state.containers[0]?.id || "");
  const [newContainerNumber, setNewContainerNumber] = useState("");
  const [selected3DPosition, setSelected3DPosition] = useState(null);
  const [activePage, setActivePage] = useState("gestao");
  const [lastResetBackup, setLastResetBackup] = useState(null);

  useEffect(() => {
    let active = true;
    async function start() {
      setIsLoadingOnline(true);
      const loaded = await loadStateFromSupabase();
      if (!active) return;
      setState(loaded);
      setSelectedContainerId(loaded.containers?.[0]?.id || "");
      const latest = [...(loaded.dailyReviews || [])].sort((a, b) => b.date.localeCompare(a.date))[0];
      if (latest) setSelectedDate(latest.date);
      setSyncStatus(supabase ? "Online · Supabase" : "Modo local · sem Supabase");
      setIsLoadingOnline(false);
    }
    start();
    return () => { active = false; };
  }, []);

  const currentReview = useMemo(() => state.dailyReviews.find((r) => r.date === selectedDate) || null, [state.dailyReviews, selectedDate]);

  const latestReview = useMemo(() => {
    return [...state.dailyReviews].sort((a, b) => b.date.localeCompare(a.date))[0] || null;
  }, [state.dailyReviews]);

  const selectedContainerReview = useMemo(() => {
    if (!currentReview) return null;
    return currentReview.containers.find((c) => c.containerId === selectedContainerId) || currentReview.containers[0] || null;
  }, [currentReview, selectedContainerId]);

  const dayTotals = useMemo(() => {
    if (!currentReview) return { boxes: 0, dietKg: 0, critical: 0, attention: 0, filledPositions: 0, totalPositions: 136, occupancyRate: 0, ok: 0, empty: 0, fatteningBoxes: 0, maternityBoxes: 0, colonyBoxes: 0, fatteningPositions: 0, maternityPositions: 0, colonyPositions: 0 };
    const totals = currentReview.containers.reduce(
      (acc, c) => {
        const t = computeContainerTotals(c);
        acc.boxes += t.boxes;
        acc.dietKg += t.dietKg;
        acc.fatteningBoxes += t.fatteningBoxes;
        acc.maternityBoxes += t.maternityBoxes;
        acc.colonyBoxes += t.colonyBoxes;
        acc.fatteningPositions += t.fatteningPositions;
        acc.maternityPositions += t.maternityPositions;
        acc.colonyPositions += t.colonyPositions;
        acc.critical += t.critical;
        acc.attention += t.attention;
        acc.ok += t.ok;
        acc.empty += t.empty;
        acc.filledPositions += t.filled;
        return acc;
      },
      { boxes: 0, dietKg: 0, critical: 0, attention: 0, filledPositions: 0, totalPositions: currentReview.containers.length * POSITIONS.length, occupancyRate: 0, ok: 0, empty: 0, fatteningBoxes: 0, maternityBoxes: 0, colonyBoxes: 0, fatteningPositions: 0, maternityPositions: 0, colonyPositions: 0 }
    );
    totals.occupancyRate = totals.totalPositions > 0 ? Math.round((totals.filledPositions / totals.totalPositions) * 100) : 0;
    return totals;
  }, [currentReview]);

  function updateState(next) {
    setState(next);
    setSyncStatus(supabase ? "Salvando..." : "Modo local");
    persistToSupabase(next)
      .then(() => setSyncStatus(supabase ? "Online · salvo" : "Modo local · salvo"))
      .catch((error) => {
        console.error(error);
        setSyncStatus("Erro ao salvar online");
      });
  }

  function createEmptyDay() {
    if (state.dailyReviews.find((r) => r.date === selectedDate)) return;
    const day = makeDayReview(selectedDate, state.containers);
    updateState({ ...state, dailyReviews: [day, ...state.dailyReviews] });
    setSelectedContainerId(state.containers[0]?.id || "");
  }

  function createDayFromPrevious() {
    if (state.dailyReviews.find((r) => r.date === selectedDate)) {
      alert("Já existe revisão para esta data. Edite a revisão existente ou exclua antes de copiar.");
      return;
    }
    const previous = [...state.dailyReviews].filter((r) => r.date < selectedDate).sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!previous) {
      alert("Não há revisão anterior para copiar. Crie uma revisão vazia primeiro.");
      return;
    }
    const day = clonePreviousDayReview(previous, selectedDate, state.containers);
    updateState({ ...state, dailyReviews: [day, ...state.dailyReviews] });
    setSelectedContainerId(state.containers[0]?.id || "");
  }

  function deleteDay(date) {
    if (!confirm(`Excluir a revisão do dia ${formatDateBR(date)}?`)) return;
    updateState({ ...state, dailyReviews: state.dailyReviews.filter((r) => r.date !== date) });
  }

  function updateDay(mutator) {
    if (!currentReview) return;
    const updated = state.dailyReviews.map((r) => {
      if (r.id !== currentReview.id) return r;
      const next = JSON.parse(JSON.stringify(r));
      mutator(next);
      next.updatedAt = new Date().toISOString();
      return next;
    });
    updateState({ ...state, dailyReviews: updated });
  }

  function updateContainerField(field, value) {
    updateDay((day) => {
      const c = day.containers.find((x) => x.containerId === selectedContainerId);
      if (c) c[field] = value;
    });
  }

  function resetSelectedContainer() {
    if (!currentReview || !selectedContainerId) return;

    let backupForUndo = null;

    setState((prev) => {
      const nextState = JSON.parse(JSON.stringify(prev));
      const dayIndex = nextState.dailyReviews.findIndex((r) => r.date === selectedDate);
      if (dayIndex === -1) return prev;

      const containerIndex = nextState.dailyReviews[dayIndex].containers.findIndex(
        (c) => c.containerId === selectedContainerId
      );
      if (containerIndex === -1) return prev;

      backupForUndo = JSON.parse(JSON.stringify(nextState.dailyReviews[dayIndex].containers[containerIndex]));

      nextState.dailyReviews[dayIndex].containers[containerIndex] = {
        ...nextState.dailyReviews[dayIndex].containers[containerIndex],
        observacoesGerais: "",
        positions: POSITIONS.map((position) => ({
          position,
          lote: "",
          caixas: "0",
          dieta: "",
          dietaKgPorCaixa: "0",
          uso: "Vazio",
          status: "Vazio",
          observacoes: "",
        })),
      };

      nextState.dailyReviews[dayIndex].updatedAt = new Date().toISOString();
      persistToSupabase(nextState);
      return nextState;
    });

    if (backupForUndo) {
      setLastResetBackup({
        reviewId: currentReview.id,
        date: selectedDate,
        containerId: selectedContainerId,
        container: backupForUndo,
      });
    }

    setSelected3DPosition(null);
  }

  function undoResetSelectedContainer() {
    if (!lastResetBackup || !currentReview) return;
    if (lastResetBackup.reviewId !== currentReview.id || lastResetBackup.containerId !== selectedContainerId) {
      alert("A reversão disponível é de outro container ou de outra data. Selecione o container/data correspondente para restaurar.");
      return;
    }
    updateDay((day) => {
      const idx = day.containers.findIndex((x) => x.containerId === selectedContainerId);
      if (idx === -1) return;
      day.containers[idx] = JSON.parse(JSON.stringify(lastResetBackup.container));
    });
    setSelected3DPosition(null);
    setLastResetBackup(null);
  }

  function updatePosition(index, field, value) {
    updateDay((day) => {
      const c = day.containers.find((x) => x.containerId === selectedContainerId);
      if (!c) return;
      if (field === "caixas") {
        const parsed = Number(value);
        const isMaternidade = c.positions[index].uso === "Maternidade";
        const maxBoxes = isMaternidade ? 150 : 15;
        if (value === "") {
          c.positions[index][field] = "";
        } else {
          c.positions[index][field] = String(Math.max(0, Math.min(maxBoxes, Number.isNaN(parsed) ? 0 : parsed)));
        }
      } else {
        c.positions[index][field] = value;
        if (field === "uso" && value === "Maternidade") {
          const parsed = Number(c.positions[index].caixas);
          if (!Number.isNaN(parsed) && parsed > 150) c.positions[index].caixas = "150";
        }
        if (field === "uso" && value !== "Maternidade") {
          const parsed = Number(c.positions[index].caixas);
          if (!Number.isNaN(parsed) && parsed > 15) c.positions[index].caixas = "15";
        }
      }
      if ((field === "status" && value === "Vazio") || (field === "uso" && value === "Vazio")) {
        c.positions[index].uso = "Vazio";
        c.positions[index].status = "Vazio";
        c.positions[index].lote = "";
        c.positions[index].caixas = "";
        c.positions[index].dieta = "";
        c.positions[index].dietaKgPorCaixa = "";
      }
    });
  }

  function updateResponsible(value) {
    updateDay((day) => {
      day.responsavel = value;
    });
  }

  function addContainer() {
    const number = newContainerNumber.trim();
    if (!number) return;
    const id = `CT-${number}-${Date.now()}`;
    const container = { id, number, name: `CT ${number}` };
    const nextContainers = [...state.containers, container];
    const nextReviews = state.dailyReviews.map((day) => ({ ...day, containers: [...day.containers, emptyContainerReview(container)], updatedAt: new Date().toISOString() }));
    updateState({ containers: nextContainers, dailyReviews: nextReviews });
    setSelectedContainerId(id);
    setNewContainerNumber("");
  }

  function removeContainer(containerId) {
    if (!confirm("Remover este container do sistema e dos relatórios históricos?")) return;
    const nextContainers = state.containers.filter((c) => c.id !== containerId);
    const nextReviews = state.dailyReviews.map((day) => ({ ...day, containers: day.containers.filter((c) => c.containerId !== containerId), updatedAt: new Date().toISOString() }));
    updateState({ containers: nextContainers, dailyReviews: nextReviews });
    setSelectedContainerId(nextContainers[0]?.id || "");
  }

  function generatePDF() {
    if (!currentReview) {
      alert("Crie ou selecione uma revisão diária antes de exportar o PDF.");
      return;
    }

    const source = document.getElementById("daily-report") || document.getElementById("daily-report-pdf");
    if (!source) {
      alert("Relatório não encontrado. Abra a Página 2 · Relatório e tente novamente.");
      return;
    }

    const reportHtml = source.outerHTML;
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join("\n");

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) {
      alert("O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente novamente.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Relatório Buzz Fly BSF - ${currentReview.date}</title>
          ${styles}
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
            html, body { margin: 0; padding: 0; background: #ffffff !important; color: ${BRAND.text}; }
            body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
            #daily-report, #daily-report-pdf {
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
            }
            .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
            table { width: 100%; border-collapse: collapse; }
            tr { break-inside: avoid; page-break-inside: avoid; }
            button { border: none; background: transparent; }
          </style>
        </head>
        <body>
          ${reportHtml}
          <script>
            window.onload = function () {
              setTimeout(function () {
                window.focus();
                window.print();
              }, 350);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  function exportJSON() {
    try {
      const safeState = state?.containers?.length
        ? state
        : { containers: DEFAULT_CONTAINERS, dailyReviews: [] };

      const blob = new Blob([JSON.stringify(safeState, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-buzzfly-bsf-${todayISO()}.json`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 250);
    } catch (error) {
      console.error("Erro ao gerar backup:", error);
      alert("Não foi possível gerar o backup. Tente novamente ou abra o console para ver o erro.");
    }
  }

  function importJSON() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        if (!imported?.containers?.length || !Array.isArray(imported.dailyReviews)) {
          alert("Arquivo inválido. Selecione um backup JSON gerado pelo sistema Buzz Fly BSF.");
          return;
        }
        persistToSupabase(imported);
        setState(imported);
        const latest = [...imported.dailyReviews].sort((a, b) => b.date.localeCompare(a.date))[0];
        if (latest) {
          setSelectedDate(latest.date);
          setSelectedContainerId(latest.containers?.[0]?.containerId || imported.containers?.[0]?.id || "");
        }
        setSelected3DPosition(null);
        setLastResetBackup(null);
        alert("Backup importado com sucesso.");
      } catch (error) {
        console.error("Erro ao importar backup:", error);
        alert("Não foi possível importar o backup. Verifique se o arquivo é um JSON válido.");
      }
    };
    input.click();
  }

  const sortedDays = [...state.dailyReviews].sort((a, b) => b.date.localeCompare(a.date));
  const selectedTotals = selectedContainerReview ? computeContainerTotals(selectedContainerReview) : { boxes: 0, dietKg: 0, critical: 0, attention: 0, ok: 0, fatteningBoxes: 0, maternityBoxes: 0 };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: BRAND.soft, color: BRAND.text }}>
      <style>{`
        .bsf-action-row button,
        .bsf-nowrap-button {
          white-space: nowrap;
          min-width: max-content;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .bsf-container-door-line {
          pointer-events: none;
        }
      `}</style>
      <div className="mx-auto max-w-7xl space-y-6">
        {isLoadingOnline && (
          <Card className="rounded-[1.25rem] border bg-white shadow-sm" style={{ borderColor: BRAND.line }}>
            <CardContent className="p-4 text-sm font-semibold" style={{ color: BRAND.muted }}>
              Carregando dados online...
            </CardContent>
          </Card>
        )}

        <header className="rounded-[1.75rem] border bg-white shadow-sm" style={{ borderColor: BRAND.line }}>
          <div className="p-5 md:p-7">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
              <div className="space-y-4">
                <BuzzLogo />
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight" style={{ color: BRAND.text }}>Sistema de Gestão e Controle da Criação - BSF</h1>
                  <p className="text-sm md:text-base max-w-3xl" style={{ color: BRAND.muted }}>Controle geral dos containers de criação - BSF.</p>
                </div>
              </div>
              <div className="bsf-action-row flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-xl border px-3 py-2 text-sm font-semibold" style={{ borderColor: BRAND.line, color: supabase ? BRAND.ok : BRAND.warn, backgroundColor: "#FFFFFF" }}>
                  <Database className="h-4 w-4 mr-2" /> {syncStatus}
                </span>
                <Button variant="outline" onClick={exportJSON} className="rounded-xl"><Database className="h-4 w-4 mr-2" /> Backup</Button>
                <Button variant="outline" onClick={importJSON} className="rounded-xl"><Database className="h-4 w-4 mr-2" /> Importar backup</Button>
                <Button onClick={generatePDF} disabled={!currentReview} className="rounded-xl text-white" style={{ backgroundColor: BRAND.navy }}><Download className="h-4 w-4 mr-2" /> PDF dos containers</Button>
              </div>
            </div>
          </div>
        </header>

        <Card className="rounded-[1.25rem] border bg-white shadow-sm" style={{ borderColor: BRAND.line }}>
          <CardContent className="p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: BRAND.muted }}>navegação</p>
              <h2 className="text-lg font-semibold" style={{ color: BRAND.text }}>Fluxo do sistema</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActivePage("gestao")}
                className="rounded-xl px-4 py-2 text-sm font-semibold transition"
                style={{
                  backgroundColor: activePage === "gestao" ? BRAND.navy : "#FFFFFF",
                  color: activePage === "gestao" ? "#FFFFFF" : BRAND.text,
                  border: `1px solid ${activePage === "gestao" ? BRAND.navy : BRAND.line}`,
                }}
              >
                Página 1 · Gestão / Preenchimento
              </button>
              <button
                type="button"
                onClick={() => setActivePage("relatorio")}
                className="rounded-xl px-4 py-2 text-sm font-semibold transition"
                style={{
                  backgroundColor: activePage === "relatorio" ? BRAND.navy : "#FFFFFF",
                  color: activePage === "relatorio" ? "#FFFFFF" : BRAND.text,
                  border: `1px solid ${activePage === "relatorio" ? BRAND.navy : BRAND.line}`,
                }}
              >
                Página 2 · Relatório
              </button>
            </div>
          </CardContent>
        </Card>

        {activePage === "gestao" && (
          <>
        <Card className="rounded-[1.5rem] border bg-white shadow-sm" style={{ borderColor: BRAND.line }}>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <label className="space-y-1">
                <span className="text-sm font-semibold" style={{ color: BRAND.text }}>Data operacional</span>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full border rounded-xl px-3 py-2 bg-white" style={{ borderColor: BRAND.line }} />
              </label>
              <div className="bsf-action-row md:col-span-2 flex flex-wrap gap-2">
                <Button onClick={createEmptyDay} variant="outline" className="rounded-xl"><CalendarDays className="h-4 w-4 mr-2" /> Criar dia vazio</Button>
                <Button onClick={createDayFromPrevious} className="rounded-xl text-white" style={{ backgroundColor: BRAND.navy }}><Copy className="h-4 w-4 mr-2" /> Copiar última data</Button>
              </div>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-semibold" style={{ color: BRAND.text }}>Responsável pela revisão</span>
                <input disabled={!currentReview} value={currentReview?.responsavel || ""} onChange={(e) => updateResponsible(e.target.value)} placeholder="Nome do responsável" className="w-full border rounded-xl px-3 py-2 bg-white disabled:bg-slate-100" style={{ borderColor: BRAND.line }} />
              </label>
            </div>
            {!currentReview && <p className="text-sm rounded-xl p-3" style={{ backgroundColor: "#FFF8E8", border: "1px solid #F0DCA6", color: "#6B4A00" }}>Ainda não existe revisão para {formatDateBR(selectedDate)}. Crie um dia vazio ou copie a última data para manter as posições anteriores e atualizar apenas o que mudou.</p>}
            {currentReview && (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-8 gap-3 text-sm">
                <Metric label="Containers" value={currentReview.containers.length} icon={ClipboardList} />
                <Metric label="Ocupação" value={`${dayTotals.occupancyRate}%`} icon={Package} tone="ok" sublabel={`${dayTotals.filledPositions}/${dayTotals.totalPositions} posições`} />
                <Metric label="Caixas totais" value={dayTotals.boxes} icon={Boxes} />
                <Metric label="Dieta em bioconversão" value={`${dayTotals.dietKg.toFixed(1)} kg`} icon={Package} />
                <Metric label="Caixas engorda" value={dayTotals.fatteningBoxes} icon={Boxes} />
                <Metric label="Caixas maternidade" value={dayTotals.maternityBoxes} icon={Boxes} />
                <Metric label="Atenção" value={dayTotals.attention} icon={AlertTriangle} tone="warn" />
                <Metric label="Críticas" value={dayTotals.critical} icon={AlertTriangle} tone="danger" />
              </div>
            )}
          </CardContent>
        </Card>

        {latestReview && (
          <ContainerYardOverview
            review={latestReview}
            selectedContainerId={selectedContainerId}
            selectedPosition={selected3DPosition}
            onSelectContainer={(containerId) => {
              setSelectedDate(latestReview.date);
              setSelectedContainerId(containerId);
              setSelected3DPosition(null);
            }}
            onSelectPosition={(containerId, position) => {
              setSelectedDate(latestReview.date);
              setSelectedContainerId(containerId);
              setSelected3DPosition(position);
            }}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="space-y-6">
            <Card className="rounded-[1.5rem] border bg-white shadow-sm" style={{ borderColor: BRAND.line }}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold" style={{ color: BRAND.text }}>Containers</h2>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: BRAND.softBlue, color: BRAND.navy }}>{state.containers.length} CTs</span>
                </div>
                <div className="flex gap-2">
                  <input value={newContainerNumber} onChange={(e) => setNewContainerNumber(e.target.value)} placeholder="Novo CT" className="w-full border rounded-xl px-3 py-2 bg-white" style={{ borderColor: BRAND.line }} />
                  <Button onClick={addContainer} className="rounded-xl text-white" style={{ backgroundColor: BRAND.navy }}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                  {state.containers.map((c) => {
                    const active = selectedContainerId === c.id;
                    const dayC = currentReview?.containers.find((x) => x.containerId === c.id);
                    const t = dayC ? computeContainerTotals(dayC) : null;
                    return (
                      <div key={c.id} className="border rounded-xl p-2 flex items-center gap-2 transition bg-white" style={{ borderColor: active ? BRAND.navy : BRAND.line, boxShadow: active ? "0 0 0 2px rgba(7,53,74,.08)" : "none" }}>
                        <button onClick={() => setSelectedContainerId(c.id)} className="flex-1 text-left px-2 py-1">
                          <div className="flex items-center gap-2"><MiniContainerIcon active={active} /><span className="font-semibold" style={{ color: active ? BRAND.navy : BRAND.text }}>{c.name}</span></div>
                          {t && <p className="text-[11px] mt-1" style={{ color: BRAND.muted }}>{t.boxes} cx · {t.attention} atenção · {t.critical} crítico</p>}
                        </button>
                        <button onClick={() => removeContainer(c.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.5rem] border bg-white shadow-sm" style={{ borderColor: BRAND.line }}>
              <CardContent className="p-5 space-y-4">
                <h2 className="text-lg font-semibold" style={{ color: BRAND.text }}>Histórico diário</h2>
                {sortedDays.length === 0 && <p className="text-sm" style={{ color: BRAND.muted }}>Nenhuma revisão salva.</p>}
                <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                  {sortedDays.map((r) => (
                    <div key={r.id} className="border rounded-xl p-3 bg-white" style={{ borderColor: r.date === selectedDate ? BRAND.navy : BRAND.line }}>
                      <div className="flex justify-between gap-2">
                        <button className="text-left flex-1" onClick={() => setSelectedDate(r.date)}>
                          <p className="font-semibold" style={{ color: r.date === selectedDate ? BRAND.navy : BRAND.text }}>{formatDateBR(r.date)}</p>
                          <p className="text-xs" style={{ color: BRAND.muted }}>{r.containers.length} CTs · {r.clonedFrom ? `copiado de ${formatDateBR(r.clonedFrom)}` : "revisão original"}</p>
                        </button>
                        <button onClick={() => deleteDay(r.date)} className="p-2 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>

          <main className="lg:col-span-3 space-y-6">
            {selectedContainerReview && currentReview ? (
              <>
                <Card className="rounded-[1.5rem] border bg-white shadow-sm overflow-hidden" style={{ borderColor: BRAND.line }}>
                  <div className="p-5 border-b" style={{ borderColor: BRAND.line }}>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <p className="uppercase tracking-[0.22em] text-xs font-semibold" style={{ color: BRAND.muted }}>container selecionado</p>
                        <h2 className="text-2xl font-semibold" style={{ color: BRAND.text }}>{selectedContainerReview.name} — {formatDateBR(currentReview.date)}</h2>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <InfoChip icon={Boxes} label={`${selectedTotals.boxes} caixas`} />
                        <InfoChip icon={Package} label={`${selectedTotals.dietKg.toFixed(1)} kg dieta`} />
                        <InfoChip icon={AlertTriangle} label={`${selectedTotals.critical} críticas`} tone="danger" />
                        <Button variant="outline" onClick={resetSelectedContainer} className="rounded-xl text-red-700 border-red-200 hover:bg-red-50">
                          <Trash2 className="h-4 w-4 mr-2" /> Zerar container
                        </Button>
                        {lastResetBackup?.reviewId === currentReview.id && lastResetBackup?.containerId === selectedContainerId && (
                          <Button variant="outline" onClick={undoResetSelectedContainer} className="rounded-xl text-slate-700 border-slate-200 hover:bg-slate-50">
                            <RotateCw className="h-4 w-4 mr-2" /> Voltar opção anterior
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-5 space-y-5">
                    <InternalTowerLayout
                      container={selectedContainerReview}
                      selectedPosition={selected3DPosition}
                      onSelectPosition={(position) => setSelected3DPosition(position)}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <ControlSelect label="Ventilação" value={selectedContainerReview.ventilacao} onChange={(v) => updateContainerField("ventilacao", v)} options={["Manual", "Automático"]} />
                      <ControlSelect label="Recirculação" value={selectedContainerReview.recirculacao} onChange={(v) => updateContainerField("recirculacao", v)} options={["OFF", "ON"]} />
                      <label className="space-y-1"><span className="text-sm font-semibold" style={{ color: BRAND.text }}>Setpoint °C</span><input value={selectedContainerReview.setpoint} onChange={(e) => updateContainerField("setpoint", e.target.value)} placeholder="Ex.: 41" className="w-full border rounded-xl px-3 py-2 bg-white" style={{ borderColor: BRAND.line }} /></label>
                      <label className="space-y-1"><span className="text-sm font-semibold" style={{ color: BRAND.text }}>Observação geral CT</span><input value={selectedContainerReview.observacoesGerais} onChange={(e) => updateContainerField("observacoesGerais", e.target.value)} placeholder="Resumo do CT" className="w-full border rounded-xl px-3 py-2 bg-white" style={{ borderColor: BRAND.line }} /></label>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedContainerReview.positions.map((p, idx) => (
                    <Card key={p.position} className="rounded-[1.25rem] border bg-white shadow-sm overflow-hidden" style={{ borderColor: BRAND.line }}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3"><PalletIcon /><h3 className="text-lg font-semibold" style={{ color: BRAND.text }}>Posição {p.position}</h3></div>
                          <div className="flex items-center gap-2"><StatusDot status={p.status} /><StatusPill status={p.status} /></div>
                        </div>
                        <div className="rounded-xl border p-3" style={{ borderColor: BRAND.line, backgroundColor: BRAND.soft }}><PalletIllustration caixas={p.caixas} uso={p.uso} /></div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <label className="space-y-1"><span className="text-sm font-semibold" style={{ color: BRAND.muted }}>Lote</span><input value={p.lote} onChange={(e) => updatePosition(idx, "lote", e.target.value)} className="w-full border rounded-xl px-3 py-2" style={{ borderColor: BRAND.line }} /></label>
                          <label className="space-y-1"><span className="text-sm font-semibold" style={{ color: BRAND.muted }}>Caixas</span><input type="number" min="0" max={p.uso === "Maternidade" ? "150" : "15"} value={p.caixas} onChange={(e) => updatePosition(idx, "caixas", e.target.value)} className="w-full border rounded-xl px-3 py-2" style={{ borderColor: BRAND.line }} /></label>
                          <label className="space-y-1"><span className="text-sm font-semibold" style={{ color: BRAND.muted }}>Dieta</span><input value={p.dieta || ""} onChange={(e) => updatePosition(idx, "dieta", e.target.value.toUpperCase())} placeholder="Ex.: A, B, C" className="w-full border rounded-xl px-3 py-2" style={{ borderColor: BRAND.line }} /></label>
                          <label className="space-y-1"><span className="text-sm font-semibold" style={{ color: BRAND.muted }}>Dieta / caixa (kg)</span><input type="number" min="0" step="0.1" value={p.dietaKgPorCaixa || ""} onChange={(e) => updatePosition(idx, "dietaKgPorCaixa", e.target.value)} placeholder="Ex.: 12" className="w-full border rounded-xl px-3 py-2" style={{ borderColor: BRAND.line }} /></label>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <ControlSelect label="Uso" value={p.uso} onChange={(v) => updatePosition(idx, "uso", v)} options={["Produção", "Colônia", "Maternidade", "Vazio"]} muted />
                          <ControlSelect label="Status" value={p.status} onChange={(v) => updatePosition(idx, "status", v)} options={["OK", "Atenção", "Crítico", "Vazio"]} muted />
                        </div>
                        <div className="flex flex-wrap gap-2"><UsePill uso={p.uso} /><StatusPill status={p.status} /></div>
                        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: BRAND.line, backgroundColor: BRAND.soft }}>
                          <div className="flex justify-between"><span style={{ color: BRAND.muted }}>Dieta</span><b>{p.dieta || "-"}</b></div>
                          <div className="flex justify-between mt-1"><span style={{ color: BRAND.muted }}>Dieta por caixa</span><b>{Number(p.dietaKgPorCaixa || 0).toFixed(1)} kg</b></div>
                          <div className="flex justify-between mt-1"><span style={{ color: BRAND.muted }}>Dieta total da posição</span><b>{((Number(p.caixas) || 0) * (Number(p.dietaKgPorCaixa) || 0)).toFixed(1)} kg</b></div>
                        </div>
                        <label className="space-y-1 block"><span className="text-sm font-semibold" style={{ color: BRAND.muted }}>Observações</span><textarea value={p.observacoes} onChange={(e) => updatePosition(idx, "observacoes", e.target.value)} rows={2} className="w-full border rounded-xl px-3 py-2" style={{ borderColor: BRAND.line }} /></label>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <Card className="rounded-[1.5rem] border bg-white shadow-sm" style={{ borderColor: BRAND.line }}><CardContent className="p-8 text-center" style={{ color: BRAND.muted }}>Crie ou selecione uma revisão diária para editar os containers.</CardContent></Card>
            )}
          </main>
        </div>
          </>
        )}

        {activePage === "relatorio" && (
          <Card className="rounded-[1.5rem] border bg-white shadow-sm overflow-hidden" style={{ borderColor: BRAND.line }}>
            <CardContent className="p-5 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="uppercase tracking-[0.22em] text-xs font-semibold" style={{ color: BRAND.muted }}>relatório consolidado</p>
                  <h2 className="text-2xl font-semibold" style={{ color: BRAND.text }}>Relatório do dia</h2>
                  <p className="text-sm" style={{ color: BRAND.muted }}>Visualização consolidada para conferência e exportação em PDF.</p>
                </div>
                <Button onClick={generatePDF} disabled={!currentReview} className="rounded-xl text-white" style={{ backgroundColor: BRAND.navy }}>
                  <Download className="h-4 w-4 mr-2" /> Exportar PDF
                </Button>
              </div>

              {currentReview ? (
                <DailyReport review={currentReview} totals={dayTotals} />
              ) : (
                <div className="rounded-xl border p-6 text-center" style={{ borderColor: BRAND.line, color: BRAND.muted }}>
                  Crie ou selecione uma revisão diária para visualizar o relatório.
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {currentReview && (
          <div
            id="daily-report-pdf"
            className="absolute top-0 left-[-10000px] w-[1200px] bg-white"
            aria-hidden="true"
          >
            <DailyReport review={currentReview} totals={dayTotals} />
          </div>
        )}
      </div>
    </div>
  );
}

function PositionReferenceCard() {
  const [open, setOpen] = useState(true);
  const top = [1, 3, 5, 7];
  const bottom = [2, 4, 6, 8];

  return (
    <Card className="rounded-[1.5rem] border bg-white shadow-sm overflow-hidden" style={{ borderColor: BRAND.line }}>
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="uppercase tracking-[0.22em] text-xs font-semibold" style={{ color: BRAND.muted }}>referência operacional</p>
            <h2 className="text-xl md:text-2xl font-semibold" style={{ color: BRAND.text }}>Mapa de posições do container</h2>
            <p className="text-sm" style={{ color: BRAND.muted }}>
              Referência rápida para evitar dúvidas no preenchimento das posições 1 a 8.
            </p>
          </div>
          <Button variant="outline" onClick={() => setOpen((v) => !v)} className="rounded-xl">
            {open ? "Ocultar referência" : "Mostrar referência"}
          </Button>
        </div>

        {open && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
            <div className="xl:col-span-2 rounded-[1.25rem] border p-4" style={{ borderColor: BRAND.line, background: "linear-gradient(180deg, #FFFFFF 0%, #F6F8F9 100%)" }}>
              <div className="relative rounded-[1rem] border bg-white overflow-hidden" style={{ borderColor: BRAND.line }}>
                <div className="absolute left-0 top-0 bottom-0 w-12" style={{ backgroundColor: "#EEF2F4" }} />
                <div className="absolute right-0 top-0 bottom-0 w-5" style={{ backgroundColor: "#EEF2F4" }} />
                <div className="absolute left-0 top-0 bottom-0 w-2" style={{ backgroundColor: BRAND.navy }} />
                <div className="absolute left-2 top-0 bottom-0 w-10 bg-white border-r" style={{ borderColor: BRAND.line }}>
                  <div className="absolute left-2 top-12 h-8 w-6 rounded-sm" style={{ backgroundColor: "#1E2429" }} />
                  <div className="absolute left-2 bottom-12 h-8 w-6 rounded-sm" style={{ backgroundColor: "#1E2429" }} />
                </div>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold tracking-widest" style={{ color: BRAND.navy }}>
                  PORTAS / ENTRADA DE AR
                </div>

                <div className="relative z-10 p-5 pl-16">
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    {top.map((position) => <ReferencePosition key={position} position={position} tone="top" />)}
                    {bottom.map((position) => <ReferencePosition key={position} position={position} tone="bottom" />)}
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-semibold" style={{ color: BRAND.muted }}>
                    <span>Porta à esquerda</span>
                    <span>Fundo do container à direita</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.25rem] border p-4 space-y-3" style={{ borderColor: BRAND.line, backgroundColor: BRAND.soft }}>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: BRAND.softBlue, color: BRAND.navy }}>
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: BRAND.text }}>Numeração oficial</h3>
                  <p className="text-sm" style={{ color: BRAND.muted }}>
                    Use sempre esta ordem para preencher lote, caixas, uso, dieta e status.
                  </p>
                </div>
              </div>
              <div className="rounded-xl border bg-white p-3 text-sm" style={{ borderColor: BRAND.line }}>
                <p className="font-semibold" style={{ color: BRAND.text }}>Fileira superior</p>
                <p className="text-2xl font-semibold tracking-wider" style={{ color: BRAND.navy }}>1 · 3 · 5 · 7</p>
              </div>
              <div className="rounded-xl border bg-white p-3 text-sm" style={{ borderColor: BRAND.line }}>
                <p className="font-semibold" style={{ color: BRAND.text }}>Fileira inferior</p>
                <p className="text-2xl font-semibold tracking-wider" style={{ color: BRAND.crateBlue }}>2 · 4 · 6 · 8</p>
              </div>
              <div className="rounded-xl border px-3 py-2 text-xs" style={{ borderColor: BRAND.line, color: BRAND.muted, backgroundColor: "#FFFFFF" }}>
                A referência considera a visualização com as <b>portas à esquerda</b>.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReferencePosition({ position, tone }) {
  const color = tone === "top" ? BRAND.navy : BRAND.crateBlue;
  return (
    <div className="rounded-xl border bg-white p-2 shadow-sm" style={{ borderColor: BRAND.line }}>
      <div className="h-20 md:h-24 rounded-lg border flex items-center justify-center relative overflow-hidden" style={{ borderColor: BRAND.line, backgroundColor: "#F4F1EA" }}>
        <div className="absolute inset-0 opacity-40" style={{ background: "repeating-linear-gradient(0deg, transparent 0px, transparent 8px, rgba(154,135,110,.45) 8px, rgba(154,135,110,.45) 9px), repeating-linear-gradient(90deg, transparent 0px, transparent 14px, rgba(154,135,110,.35) 14px, rgba(154,135,110,.35) 15px)" }} />
        <div className="absolute bottom-1 left-3 right-3 h-2 rounded-sm" style={{ backgroundColor: BRAND.pallet }} />
        <div className="relative h-12 w-12 md:h-14 md:w-14 rounded-full border-4 flex items-center justify-center text-2xl md:text-3xl font-black text-white" style={{ backgroundColor: color, borderColor: "#FFFFFF", boxShadow: "0 8px 18px rgba(7,53,74,.18)" }}>
          {position}
        </div>
      </div>
    </div>
  );
}

function ContainerYardOverview({ review, selectedContainerId, selectedPosition, onSelectContainer, onSelectPosition }) {
  const [hoveredContainerId, setHoveredContainerId] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTvMode, setIsTvMode] = useState(false);
  const [fullscreenPanelContainerId, setFullscreenPanelContainerId] = useState(null);
  const highlightedContainerId = hoveredContainerId;
  const selectedContainer = review.containers.find((c) => c.containerId === selectedContainerId) || review.containers[0];
  const selectedTotals = selectedContainer ? computeContainerTotals(selectedContainer) : null;
  const previewContainer = isFullscreen && fullscreenPanelContainerId ? review.containers.find((c) => c.containerId === fullscreenPanelContainerId) : null;
  const previewTotals = previewContainer ? computeContainerTotals(previewContainer) : null;

  function handleContainerClick(containerId) {
    onSelectContainer(containerId);
    if (!isFullscreen) return;
    setFullscreenPanelContainerId((current) => (current === containerId ? null : containerId));
  }

  function toggleFullscreen() {
    setIsFullscreen((current) => {
      const next = !current;
      if (!next) setFullscreenPanelContainerId(null);
      return next;
    });
  }

  if (isTvMode) {
    return (
      <TVContainerWall
        review={review}
        selectedContainerId={selectedContainerId}
        onSelectContainer={onSelectContainer}
        onExit={() => setIsTvMode(false)}
      />
    );
  }

  return (
    <Card
      className={`${isFullscreen ? "fixed inset-3 z-50 rounded-[1.5rem]" : "rounded-[1.5rem]"} border bg-white shadow-sm overflow-hidden`}
      style={{ borderColor: BRAND.line }}
    >
      <CardContent className={`${isFullscreen ? "p-5 h-full overflow-auto" : "p-5"} space-y-5`}>
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <p className="uppercase tracking-[0.22em] text-xs font-semibold" style={{ color: BRAND.muted }}>visual operacional</p>
            <h2 className="text-2xl font-semibold" style={{ color: BRAND.text }}>Pátio dos containers</h2>
            <p className="text-sm" style={{ color: BRAND.muted }}>
              Última atualização: {formatDateBR(review.date)} · {isFullscreen ? "em tela cheia, clique em um CT para abrir/fechar os detalhes laterais." : "passe o mouse para ver um resumo e clique para abrir a visão interna."}
            </p>
          </div>
          <div className="bsf-action-row flex flex-wrap gap-2 text-xs">
            <InfoChip icon={ClipboardList} label={`${review.containers.length} containers`} />
            <InfoChip icon={Boxes} label={`${review.containers.reduce((s, c) => s + computeContainerTotals(c).boxes, 0)} caixas`} />
            <InfoChip icon={Package} label={`${review.containers.reduce((s, c) => s + computeContainerTotals(c).dietKg, 0).toFixed(1)} kg dieta`} />
            <InfoChip icon={Package} label={`${review.containers.reduce((s, c) => s + computeContainerTotals(c).filled, 0)}/${review.containers.length * 8} posições`} />
            <Button variant="outline" onClick={toggleFullscreen} className="rounded-xl h-8 px-3">
              {isFullscreen ? <Minimize2 className="h-4 w-4 mr-2" /> : <Maximize2 className="h-4 w-4 mr-2" />}
              {isFullscreen ? "Sair" : "Tela cheia"}
            </Button>
            <Button
              onClick={() => {
                setIsTvMode(true);
                setTimeout(() => {
                  const el = document.getElementById("tv-container-wall");
                  if (el?.requestFullscreen) el.requestFullscreen().catch(() => {});
                }, 50);
              }}
              className="rounded-xl h-8 px-3 text-white"
              style={{ backgroundColor: BRAND.navy }}
            >
              <Maximize2 className="h-4 w-4 mr-2" /> Modo TV
            </Button>
          </div>
        </div>

        <div className={`rounded-[1.25rem] border overflow-hidden ${isFullscreen && previewContainer ? "grid grid-cols-[minmax(0,1fr)_430px]" : ""}`} style={{ borderColor: BRAND.line }}>
          <div className="overflow-auto">
            <div
              className={isFullscreen ? "relative h-[calc(100vh-120px)] min-h-[760px]" : "relative h-[760px]"}
              style={{
                minWidth: Math.max(isFullscreen ? 2100 : 2100, review.containers.length * 132 + 220),
                background: "linear-gradient(180deg, #EAF6FF 0%, #F8FBFD 42%, #F1F4F5 42%, #F1F4F5 100%)",
              }}
            >
              <div
                className="absolute left-0 right-0 bottom-0 h-[210px]"
                style={{
                  background: "linear-gradient(180deg, #E6D7BA 0%, #D7C2A0 100%)",
                  borderTop: `1px solid ${BRAND.line}`,
                }}
              />
              <div
                className="absolute left-0 right-0 bottom-[50px] h-[56px] opacity-45"
                style={{
                  background: "repeating-linear-gradient(90deg, rgba(7,53,74,.08) 0px, rgba(7,53,74,.08) 2px, transparent 2px, transparent 46px)",
                }}
              />
              <div
                className="absolute left-0 right-0 bottom-[118px] h-[28px] opacity-20"
                style={{ background: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,.15) 24%, rgba(0,0,0,.10) 70%, transparent 100%)" }}
              />

              <div className="absolute left-8 top-6 flex items-center gap-3 rounded-full px-4 py-2 text-xs font-semibold bg-white/85 border" style={{ color: BRAND.muted, borderColor: BRAND.line }}>
                <Wind className="h-4 w-4" /> Vista limpa do pátio · portas com entradas de ar
              </div>

              <div className="absolute left-8 top-20 w-[980px] max-w-[calc(100%-4rem)] rounded-2xl border bg-white/95 shadow-sm p-3" style={{ borderColor: BRAND.line }}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] font-semibold" style={{ color: BRAND.muted }}>resumo geral da atualização</p>
                    <p className="text-sm font-semibold" style={{ color: BRAND.text }}>
                      {isFullscreen ? "Clique em um container para abrir os detalhes laterais. Clique novamente no mesmo CT para ocultar." : "Passe o mouse em um container para ver o resumo rápido. Clique para selecionar o CT."}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 min-w-[520px]">
                    <LargeInfo label="Containers" value={review.containers.length} />
                    <LargeInfo label="Caixas totais" value={review.containers.reduce((s, c) => s + computeContainerTotals(c).boxes, 0)} />
                    <LargeInfo label="Dieta total" value={`${review.containers.reduce((s, c) => s + computeContainerTotals(c).dietKg, 0).toFixed(1)} kg`} />
                    <LargeInfo label="Posições em uso" value={`${review.containers.reduce((s, c) => s + computeContainerTotals(c).filled, 0)}/${review.containers.length * 8}`} />
                  </div>
                </div>
              </div>

              <div className={isFullscreen ? "absolute left-8 bottom-[120px] flex items-end gap-3 pr-10" : "absolute left-8 bottom-[120px] flex items-end gap-3 pr-10"}>
                {review.containers.map((container, idx) => (
                  <ExteriorContainer20ft
                    key={container.containerId}
                    container={container}
                    index={idx}
                    active={container.containerId === selectedContainerId}
                    hovered={container.containerId === hoveredContainerId}
                    showPopover={!!highlightedContainerId && container.containerId === highlightedContainerId}
                    fullscreen={isFullscreen}
                    onMouseEnter={() => setHoveredContainerId(container.containerId)}
                    onMouseLeave={() => setHoveredContainerId(null)}
                    onClick={() => handleContainerClick(container.containerId)}
                  />
                ))}
              </div>
            </div>
          </div>
          {isFullscreen && previewContainer && previewTotals && (
            <FullscreenContainerPanel
              container={previewContainer}
              totals={previewTotals}
              status={previewTotals.critical > 0 ? "Crítico" : previewTotals.attention > 0 ? "Atenção" : previewTotals.filled === 0 ? "Vazio" : "OK"}
              onSelectPosition={(position) => onSelectPosition(previewContainer.containerId, position)}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TVContainerWall({ review, selectedContainerId, onSelectContainer, onExit }) {
  const [hoveredContainerId, setHoveredContainerId] = useState(null);
  const [clickedContainerId, setClickedContainerId] = useState(null);
  const activePreviewId = hoveredContainerId;
  const selectedPanelContainer = clickedContainerId ? review.containers.find((c) => c.containerId === clickedContainerId) : null;
  const selectedPanelTotals = selectedPanelContainer ? computeContainerTotals(selectedPanelContainer) : null;
  const totalBoxes = review.containers.reduce((s, c) => s + computeContainerTotals(c).boxes, 0);
  const totalDiet = review.containers.reduce((s, c) => s + computeContainerTotals(c).dietKg, 0);
  const filled = review.containers.reduce((s, c) => s + computeContainerTotals(c).filled, 0);
  const totalPositions = review.containers.length * 8;

  function handleTvClick(containerId) {
    onSelectContainer(containerId);
    setClickedContainerId((current) => (current === containerId ? null : containerId));
  }

  function exitTvMode() {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    onExit();
  }

  return (
    <div id="tv-container-wall" className="fixed inset-0 z-[70] bg-white" style={{ color: BRAND.text }}>
      <div className="h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #EAF6FF 0%, #F8FBFD 38%, #F1F4F5 38%, #F1F4F5 100%)" }}>
        <div className="shrink-0 px-8 py-5 flex items-center justify-between gap-6 bg-white/90 border-b" style={{ borderColor: BRAND.line }}>
          <div>
            <p className="uppercase tracking-[0.22em] text-xs font-semibold" style={{ color: BRAND.muted }}>modo tv · visual operacional</p>
            <h1 className="text-3xl font-semibold" style={{ color: BRAND.text }}>Pátio dos containers — {formatDateBR(review.date)}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden lg:grid grid-cols-4 gap-2 w-[720px]">
              <LargeInfo label="Containers" value={review.containers.length} />
              <LargeInfo label="Caixas" value={totalBoxes} />
              <LargeInfo label="Dieta total" value={`${totalDiet.toFixed(1)} kg`} />
              <LargeInfo label="Ocupação" value={`${filled}/${totalPositions}`} />
            </div>
            <Button variant="outline" onClick={exitTvMode} className="rounded-xl h-10 px-4">
              <Minimize2 className="h-4 w-4 mr-2" /> Sair do modo TV
            </Button>
          </div>
        </div>

        <div className={`flex-1 min-h-0 ${selectedPanelContainer ? "grid grid-cols-[minmax(0,1fr)_460px]" : ""}`}>
          <div className="overflow-auto">
            <div
              className="relative min-h-[calc(100vh-108px)]"
              style={{
                minWidth: Math.max(3300, review.containers.length * 198 + 320),
              }}
            >
              <div
                className="absolute left-0 right-0 bottom-0 h-[260px]"
                style={{ background: "linear-gradient(180deg, #E6D7BA 0%, #D7C2A0 100%)", borderTop: `1px solid ${BRAND.line}` }}
              />
              <div
                className="absolute left-0 right-0 bottom-[70px] h-[70px] opacity-45"
                style={{ background: "repeating-linear-gradient(90deg, rgba(7,53,74,.08) 0px, rgba(7,53,74,.08) 2px, transparent 2px, transparent 54px)" }}
              />
              <div className="absolute left-12 top-8 rounded-2xl border bg-white/90 px-5 py-3 shadow-sm" style={{ borderColor: BRAND.line }}>
                <p className="text-sm font-semibold" style={{ color: BRAND.text }}>Passe o mouse para resumo rápido. Clique em um CT para abrir/fechar o painel lateral.</p>
              </div>
              <div className="absolute left-12 bottom-[155px] flex items-end gap-8 pr-20">
                {review.containers.map((container, idx) => (
                  <div key={container.containerId} style={{ width: 176, height: 430 }}>
                    <ExteriorContainer20ft
                      container={container}
                      index={idx}
                      active={container.containerId === clickedContainerId}
                      hovered={container.containerId === hoveredContainerId}
                      showPopover={!!activePreviewId && container.containerId === activePreviewId}
                      fullscreen={false}
                      tv
                      onMouseEnter={() => setHoveredContainerId(container.containerId)}
                      onMouseLeave={() => setHoveredContainerId(null)}
                      onClick={() => handleTvClick(container.containerId)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          {selectedPanelContainer && selectedPanelTotals && (
            <FullscreenContainerPanel
              container={selectedPanelContainer}
              totals={selectedPanelTotals}
              status={selectedPanelTotals.critical > 0 ? "Crítico" : selectedPanelTotals.attention > 0 ? "Atenção" : selectedPanelTotals.filled === 0 ? "Vazio" : "OK"}
              onSelectPosition={() => {}}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ExteriorContainer20ft({ container, index, active, hovered, showPopover, fullscreen = false, tv = false, onMouseEnter, onMouseLeave, onClick }) {
  const totals = computeContainerTotals(container);
  const status = totals.critical > 0 ? "Crítico" : totals.attention > 0 ? "Atenção" : totals.filled === 0 ? "Vazio" : "OK";
  const meta = statusMeta(status);
  const number = String(container.ct || container.name.replace("CT ", "")).padStart(2, "0");
  const occupancy = Math.round((totals.filled / 8) * 100);
  const occColor = occupancy === 100 ? BRAND.danger : occupancy >= 75 ? BRAND.ok : occupancy >= 40 ? BRAND.warn : "#E4572E";
  const useBadges = getContainerUseBadges(container);

  return (
    <div
      className="relative shrink-0"
      style={{
        width: tv ? 176 : 132,
        height: useBadges.length > 1 ? (tv ? 470 : 410) : (tv ? 430 : 360),
        zIndex: active || hovered ? 80 : 10 + index,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {showPopover && <ContainerInfoBalloon container={container} totals={totals} status={status} fullscreen={fullscreen} />}

      <button
        type="button"
        onClick={onClick}
        className="absolute left-0 bottom-0 text-left transition-all"
        style={{
          width: tv ? 158 : 122,
          height: tv ? 360 : 278,
          transform: active || hovered ? "translateY(-8px)" : "translateY(0px)",
        }}
        title={`${container.name} · ${totals.boxes} caixas · ${totals.filled}/8 posições`}
      >
        <div
          className={
            tv
              ? (useBadges.length > 1
                ? "absolute -top-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-[180px] pointer-events-none"
                : "absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-[180px] pointer-events-none")
              : (useBadges.length > 1
                ? "absolute -top-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 w-[140px] pointer-events-none"
                : "absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 w-[140px] pointer-events-none")
          }
        >
          {useBadges.map((badge, idx) => {
            const Icon = badge.icon;
            return (
              <div
                key={`${badge.label}-${idx}`}
                className={
                  tv
                    ? "rounded-full px-3 py-1.5 text-[12px] font-bold border flex items-center justify-center gap-1.5 shadow-sm min-w-[120px]"
                    : "rounded-full px-2.5 py-1 text-[10px] font-bold border flex items-center justify-center gap-1 shadow-sm min-w-[96px]"
                }
                style={{ backgroundColor: badge.bg, color: badge.color, borderColor: badge.border }}
              >
                <span className={tv ? "h-5 w-5 shrink-0" : "h-4 w-4 shrink-0"}><Icon className="h-full w-full" /></span>
                <span className="leading-none text-center">{badge.label}</span>
              </div>
            );
          })}
        </div>

        <div className="absolute -bottom-3 left-2 right-1 h-5 rounded-full blur-md opacity-18" style={{ backgroundColor: "#000000" }} />

        <div
          className="absolute inset-0 overflow-hidden border bg-white"
          style={{
            borderColor: active ? BRAND.navy : hovered ? "#9CB0B8" : "#C8D2D7",
            borderWidth: active ? 2 : 1,
            borderRadius: "8px 8px 4px 4px",
            background: "linear-gradient(90deg, #FFFFFF 0%, #F1F5F7 48%, #FFFFFF 100%)",
            boxShadow: active
              ? "0 16px 30px rgba(7,53,74,.16)"
              : hovered
                ? "0 14px 26px rgba(7,53,74,.14)"
                : "0 8px 16px rgba(40,50,55,.08)",
          }}
        >
          <div className="absolute left-0 right-0 top-0 h-4" style={{ backgroundColor: "#E8EDF0", borderBottom: "1px solid #D4DEE3" }} />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="absolute top-4 bottom-5 w-[2px]" style={{ left: 12 + i * 17, backgroundColor: i % 2 ? "#E7EDF0" : "#D9E2E6" }} />
          ))}
          <div className="absolute top-4 bottom-5 left-1/2 -translate-x-1/2 w-[2px]" style={{ backgroundColor: "#CBD6DB" }} />
          <div className={tv ? "absolute left-3 top-9 px-2.5 py-1 text-[17px] font-black tracking-widest bg-white border rounded-sm" : "absolute left-2 top-7 px-1.5 py-0.5 text-[12px] font-black tracking-widest bg-white border rounded-sm"} style={{ color: BRAND.text, borderColor: "#D4DEE3" }}>{number}</div>

          <DoorAirInlet x={tv ? 24 : 18} y={tv ? 110 : 82} tv={tv} />
          <DoorAirInlet x={tv ? 24 : 18} y={tv ? 192 : 146} tv={tv} />
          <DoorAirInlet x={tv ? 98 : 74} y={tv ? 110 : 82} tv={tv} />
          <DoorAirInlet x={tv ? 98 : 74} y={tv ? 192 : 146} tv={tv} />

          <div className={tv ? "absolute left-[77px] top-[96px] bottom-[42px] w-[3px]" : "absolute left-[58px] top-[72px] bottom-[34px] w-[2px]"} style={{ backgroundColor: "#BFCBD1" }} />
          <div className={tv ? "absolute left-[68px] top-[170px] h-5 w-[28px] rounded-full" : "absolute left-[52px] top-[128px] h-4 w-[20px] rounded-full"} style={{ border: "2px solid #B9C6CC" }} />
          <div className={tv ? "absolute right-3 top-10 h-4 w-4 rounded-full" : "absolute right-2 top-8 h-3 w-3 rounded-full"} style={{ backgroundColor: meta.color, boxShadow: "0 0 0 3px rgba(255,255,255,.88)" }} />
          <div className="absolute left-0 right-0 bottom-0 h-5" style={{ backgroundColor: "#F1F5F7", borderTop: "1px solid #DFE7EA" }} />
        </div>

        <div className={tv ? "absolute left-2 right-2 bottom-3 rounded-xl px-2.5 py-2 text-[13px] font-semibold" : "absolute left-1 right-1 bottom-2 rounded-lg px-1.5 py-1 text-[10px] font-semibold"} style={{ backgroundColor: "rgba(255,255,255,.97)", border: `1px solid ${BRAND.line}`, color: BRAND.muted }}>
          <div className="flex items-center justify-between mb-1">
            <span>{container.name}</span><span>{totals.filled}/8</span>
          </div>
          <div className={tv ? "h-[8px] rounded-full overflow-hidden" : "h-[5px] rounded-full overflow-hidden"} style={{ backgroundColor: "#DCE5E9" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${occupancy}%`, backgroundColor: occColor }} />
          </div>
          <div className={tv ? "mt-1 text-[12px] text-right font-bold" : "mt-0.5 text-[9px] text-right font-bold"} style={{ color: BRAND.text }}>{occupancy}%</div>
        </div>
      </button>
    </div>
  );
}

function ContainerInfoBalloon({ container, totals, status }) {
  const meta = statusMeta(status);
  const ocupacao = Math.round((totals.filled / 8) * 100);

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 top-0 -translate-y-[88%] w-[560px] rounded-xl border bg-white shadow-xl p-3"
      style={{ borderColor: BRAND.line, zIndex: 120 }}
    >
      <div
        className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 rotate-45 border"
        style={{ backgroundColor: "#FFFFFF", borderColor: BRAND.line, borderLeft: "none", borderTop: "none" }}
      />
      <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-3 items-start">
        <div className="space-y-2">
          <div>
            <p className="text-[9px] uppercase tracking-[0.14em] font-semibold leading-none" style={{ color: BRAND.muted }}>resumo</p>
            <h4 className="text-base font-semibold leading-tight mt-1" style={{ color: BRAND.text }}>{container.name}</h4>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: meta.bg, color: meta.color }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} /> {status}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          <MiniBalloonInfo label="Caixas" value={totals.boxes} />
          <MiniBalloonInfo label="Posições" value={`${totals.filled}/8`} />
          <MiniBalloonInfo label="Ocupação" value={`${ocupacao}%`} />
          <MiniBalloonInfo label="Dieta" value={`${totals.dietKg.toFixed(1)} kg`} />
          <MiniBalloonInfo label="Alertas" value={`${totals.attention}/${totals.critical}`} tone={totals.critical ? "danger" : totals.attention ? "warn" : "default"} />
          <MiniBalloonInfo label="Engorda" value={`${totals.fatteningBoxes} cx`} />
          <MiniBalloonInfo label="Mater." value={`${totals.maternityBoxes} cx`} />
          <MiniBalloonInfo label="Vent." value={container.ventilacao || "-"} />
          <MiniBalloonInfo label="Recirc." value={container.recirculacao || "-"} />
          <MiniBalloonInfo label="Setpoint" value={`${container.setpoint || "-"} °C`} />
        </div>
      </div>
    </div>
  );
}

function MiniBalloonInfo({ label, value, tone = "default" }) {
  const color = tone === "danger" ? BRAND.danger : tone === "warn" ? BRAND.warn : BRAND.text;
  return (
    <div className="rounded-lg border bg-white px-2 py-1.5" style={{ borderColor: BRAND.line }}>
      <p className="text-[9px] font-semibold leading-none" style={{ color: BRAND.muted }}>{label}</p>
      <p className="text-[10px] font-bold mt-1 leading-none truncate" style={{ color }}>{value}</p>
    </div>
  );
}

function FullscreenContainerPanel({ container, totals, status, onSelectPosition }) {
  const meta = statusMeta(status);
  const ocupacao = Math.round((totals.filled / 8) * 100);
  const orderedPositions = [0, 2, 4, 6, 1, 3, 5, 7].map((idx) => container.positions[idx]).filter(Boolean);

  return (
    <aside className="border-l bg-white h-[calc(100vh-210px)] min-h-[680px] overflow-y-auto" style={{ borderColor: BRAND.line }}>
      <div className="sticky top-0 z-10 bg-white border-b p-5" style={{ borderColor: BRAND.line }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] font-semibold" style={{ color: BRAND.muted }}>painel do container</p>
            <h3 className="text-2xl font-semibold" style={{ color: BRAND.text }}>{container.name}</h3>
            <p className="text-sm" style={{ color: BRAND.muted }}>Clique novamente no mesmo CT para ocultar este painel.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold" style={{ backgroundColor: meta.bg, color: meta.color }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} /> {status}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <LargeInfo label="Caixas em uso" value={totals.boxes} fullscreen />
          <LargeInfo label="Posições em uso" value={`${totals.filled}/8`} fullscreen />
          <LargeInfo label="Ocupação" value={`${ocupacao}%`} fullscreen />
          <LargeInfo label="Peso total / dieta" value={`${totals.dietKg.toFixed(1)} kg`} fullscreen />
          <LargeInfo label="Caixas engorda" value={`${totals.fatteningBoxes} cx`} fullscreen />
          <LargeInfo label="Caixas maternidade" value={`${totals.maternityBoxes} cx`} fullscreen />
          <LargeInfo label="Caixas colônia" value={`${totals.colonyBoxes || 0} cx`} fullscreen />
          <LargeInfo label="Alertas" value={`${totals.attention} atenção / ${totals.critical} críticas`} tone={totals.critical ? "danger" : totals.attention ? "warn" : "default"} fullscreen />
        </div>

        <div className="rounded-2xl border p-3 space-y-2" style={{ borderColor: BRAND.line, backgroundColor: BRAND.soft }}>
          <InfoLine icon={Wind} label="Ventilação" value={container.ventilacao || "-"} />
          <InfoLine icon={ClipboardList} label="Modo" value={container.ventilacao || "-"} />
          <InfoLine icon={RotateCw} label="Recirculação" value={container.recirculacao || "-"} />
          <InfoLine icon={Thermometer} label="Setpoint" value={`${container.setpoint || "-"} °C`} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-[0.18em] font-semibold" style={{ color: BRAND.muted }}>torres internas</p>
            <p className="text-[11px] font-semibold" style={{ color: BRAND.muted }}>1/3/5/7 acima · 2/4/6/8 abaixo</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {orderedPositions.map((p) => (
              <button key={p.position} type="button" onClick={() => onSelectPosition(p.position)} className="text-left">
                <BalloonTowerCard p={p} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

function LargeInfo({ label, value, tone = "default", fullscreen = false }) {
  const color = tone === "danger" ? BRAND.danger : tone === "warn" ? BRAND.warn : BRAND.text;
  return (
    <div className="rounded-xl border bg-white px-3 py-2" style={{ borderColor: BRAND.line }}>
      <p className={`${fullscreen ? "text-xs" : "text-[11px]"} font-semibold leading-none`} style={{ color: BRAND.muted }}>{label}</p>
      <p className={`${fullscreen ? "text-xl" : "text-base"} font-bold mt-1 leading-tight truncate`} style={{ color }}>{value}</p>
    </div>
  );
}

function BalloonTowerCard({ p }) {
  if (!p) return null;
  const dietTotal = ((Number(p.caixas) || 0) * (Number(p.dietaKgPorCaixa) || 0)).toFixed(1);
  return (
    <div className="rounded-xl border bg-white p-2" style={{ borderColor: BRAND.line }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold" style={{ color: BRAND.text }}>P{p.position}</span>
        <StatusDot status={p.status} />
      </div>
      <div className="rounded-lg border flex items-center justify-center h-24 mb-2 overflow-hidden px-2 py-1" style={{ backgroundColor: BRAND.soft, borderColor: BRAND.line }}>
        <PalletIllustration caixas={p.caixas} uso={p.uso} compact />
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
        <span style={{ color: BRAND.muted }}>Lote</span><b className="text-right truncate">{p.lote || "-"}</b>
        <span style={{ color: BRAND.muted }}>Cx</span><b className="text-right">{p.caixas || "-"}</b>
        <span style={{ color: BRAND.muted }}>Dieta</span><b className="text-right truncate">{p.dieta || "-"}</b>
        <span style={{ color: BRAND.muted }}>Kg dieta</span><b className="text-right">{dietTotal} kg</b>
      </div>
      <div className="mt-2"><UsePill uso={p.uso} small /></div>
    </div>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div className="rounded-lg border bg-white px-1.5 py-1" style={{ borderColor: BRAND.line }}>
      <p className="text-[9px] font-semibold leading-none" style={{ color: BRAND.muted }}>{label}</p>
      <p className="text-[10px] font-bold mt-1 leading-none truncate" style={{ color: BRAND.text }}>{value}</p>
    </div>
  );
}

function MiniContainerPreview({ container }) {
  const top = [0, 2, 4, 6];
  const bottom = [1, 3, 5, 7];
  return (
    <div className="rounded-xl border p-2" style={{ borderColor: BRAND.line, backgroundColor: BRAND.soft }}>
      <div className="grid grid-cols-4 gap-2 mb-2">{top.map((idx) => <MiniPositionPreview key={container.positions[idx].position} p={container.positions[idx]} />)}</div>
      <div className="grid grid-cols-4 gap-2">{bottom.map((idx) => <MiniPositionPreview key={container.positions[idx].position} p={container.positions[idx]} />)}</div>
    </div>
  );
}

function MiniPositionPreview({ p }) {
  const meta = statusMeta(p.status);
  const count = Number(p.caixas) || 0;
  const bars = p.uso === "Maternidade" ? Math.min(6, Math.ceil(count / 25)) : Math.min(6, count);
  return (
    <div className="rounded-lg border p-1.5 text-[9px]" style={{ borderColor: BRAND.line, backgroundColor: "#FFFFFF" }} title={`P${p.position} · ${p.uso} · ${p.caixas || 0} caixas · ${p.status}`}>
      <div className="flex items-center justify-between mb-1"><span className="font-bold" style={{ color: BRAND.text }}>P{p.position}</span><span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} /></div>
      <div className="rounded-md border p-1 flex flex-col-reverse gap-[2px] min-h-[36px]" style={{ borderColor: BRAND.line, backgroundColor: BRAND.soft }}>
        {Array.from({ length: bars || 1 }).map((_, i) => (
          <div key={i} className="h-[4px] rounded-sm" style={{ backgroundColor: count === 0 ? "#DDE5E9" : p.uso === "Maternidade" ? "#11181D" : i % 2 === 0 ? BRAND.crateBlack : BRAND.crateBlue }} />
        ))}
      </div>
      <div className="mt-1"><div className="truncate font-semibold" style={{ color: BRAND.muted }}>{p.lote || "-"}</div><div className="font-bold" style={{ color: BRAND.text }}>{p.caixas || 0} cx</div></div>
    </div>
  );
}

function DoorAirInlet({ x = 0, y = 0, tv = false }) {
  const width = tv ? 44 : 34;
  const height = tv ? 48 : 36;
  return (
    <div
      className="absolute rounded-sm border overflow-hidden bsf-container-door-line"
      style={{
        left: x,
        top: y,
        width,
        height,
        background: "linear-gradient(180deg, #20282E 0%, #11181D 100%)",
        borderColor: "#CAD6DC",
        boxShadow: "inset 0 0 0 2px rgba(255,255,255,.10), 0 1px 2px rgba(0,0,0,.18)",
      }}
    >
      <div className="absolute left-1 right-1 top-1/2 -translate-y-1/2 h-[2px]" style={{ backgroundColor: "rgba(255,255,255,.16)" }} />
      <div className="absolute top-1 bottom-1 left-1/2 -translate-x-1/2 w-[2px]" style={{ backgroundColor: "rgba(255,255,255,.16)" }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(255,255,255,.10) 0%, transparent 45%)" }} />
    </div>
  );
}

function InternalTowerLayout({ container, selectedPosition, onSelectPosition }) {
  const top = [0, 2, 4, 6];
  const bottom = [1, 3, 5, 7];

  return (
    <div className="rounded-[1.25rem] border p-4" style={{ borderColor: BRAND.line, background: "linear-gradient(180deg, #FFFFFF 0%, #F4F8FA 100%)" }}>
      <div className="relative rounded-[1rem] border bg-white overflow-hidden" style={{ borderColor: BRAND.line }}>
        <div className="absolute left-0 top-0 bottom-0 w-6" style={{ backgroundColor: "#EEF2F4" }} />
        <div className="absolute right-0 top-0 bottom-0 w-6" style={{ backgroundColor: "#EEF2F4" }} />
        <div className="absolute left-10 right-10 top-4 h-4 rounded-full" style={{ backgroundColor: "#DCE4E7" }}>
          <div className="absolute left-2 -top-1 h-6 w-6 rounded-full bg-white border flex items-center justify-center" style={{ borderColor: BRAND.line }}><Fan className="h-3.5 w-3.5" style={{ color: BRAND.navy }} /></div>
          <div className="absolute right-2 -top-1 h-6 w-6 rounded-full bg-white border flex items-center justify-center" style={{ borderColor: BRAND.line }}><Fan className="h-3.5 w-3.5" style={{ color: BRAND.navy }} /></div>
        </div>
        <div className="relative z-10 p-6 pt-12">
          <div className="grid grid-cols-4 gap-3 items-stretch">
            {top.map((idx) => <InternalTowerCard key={idx} p={container.positions[idx]} active={selectedPosition === container.positions[idx].position} onClick={() => onSelectPosition(container.positions[idx].position)} />)}
            {bottom.map((idx) => <InternalTowerCard key={idx} p={container.positions[idx]} active={selectedPosition === container.positions[idx].position} onClick={() => onSelectPosition(container.positions[idx].position)} />)}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold" style={{ color: BRAND.muted }}>
            <span className="inline-flex items-center gap-1"><Wind className="h-3 w-3" /> entrada de ar / portas</span>
            <span className="inline-flex items-center gap-1"><RotateCw className="h-3 w-3" /> recirculação: {container.recirculacao}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InternalTowerCard({ p, active, onClick }) {
  const dietTotal = ((Number(p.caixas) || 0) * (Number(p.dietaKgPorCaixa) || 0)).toFixed(1);
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border bg-white p-3 shadow-sm text-left transition h-full"
      style={{ borderColor: active ? BRAND.navy : BRAND.line, boxShadow: active ? "0 0 0 2px rgba(7,53,74,.14)" : "none" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm" style={{ color: BRAND.text }}>P{p.position}</span>
        <StatusDot status={p.status} />
      </div>
      <div className="rounded-lg border flex items-center justify-center h-32 mb-2 overflow-hidden px-2 py-2" style={{ backgroundColor: BRAND.soft, borderColor: BRAND.line }}>
        <PalletIllustration caixas={p.caixas} uso={p.uso} compact />
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
        <span style={{ color: BRAND.muted }}>Lote</span><b className="text-right truncate">{p.lote || "-"}</b>
        <span style={{ color: BRAND.muted }}>Cx</span><b className="text-right">{p.caixas || "-"}</b>
        <span style={{ color: BRAND.muted }}>Dieta</span><b className="text-right truncate">{p.dieta || "-"}</b>
        <span style={{ color: BRAND.muted }}>Kg dieta</span><b className="text-right">{dietTotal} kg</b>
      </div>
      <div className="mt-2"><UsePill uso={p.uso} small /></div>
    </button>
  );
}

function InfoBox({ label, value, tone = "default" }) {
  const color = tone === "danger" ? BRAND.danger : tone === "warn" ? BRAND.warn : BRAND.text;
  return (
    <div className="rounded-xl border bg-white p-2" style={{ borderColor: BRAND.line }}>
      <p className="text-[11px] font-semibold" style={{ color: BRAND.muted }}>{label}</p>
      <p className="text-sm font-semibold truncate" style={{ color }}>{value}</p>
    </div>
  );
}

function InfoLine({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-white p-2" style={{ borderColor: BRAND.line }}>
      <span className="inline-flex items-center gap-2 font-semibold" style={{ color: BRAND.muted }}>
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <b style={{ color: BRAND.text }}>{value}</b>
    </div>
  );
}

function DailyReport({ review, totals }) {
  return (
    <section id="daily-report" className="bg-white rounded-[1.5rem] border shadow-sm p-6 md:p-8 space-y-8 print:shadow-none" style={{ borderColor: BRAND.line }}>
      <div className="flex flex-col md:flex-row justify-between gap-4 border-b pb-5" style={{ borderColor: BRAND.line }}>
        <div className="space-y-3">
          <BuzzLogo />
          <div>
            <h2 className="text-2xl font-semibold" style={{ color: BRAND.text }}>Relatório Diário Consolidado — Containers BSF</h2>
            <p style={{ color: BRAND.muted }}>Controle geral dos containers de criação - BSF.</p>
          </div>
        </div>
        <div className="text-right"><p className="text-sm" style={{ color: BRAND.muted }}>Data operacional</p><p className="text-2xl font-semibold" style={{ color: BRAND.navy }}>{formatDateBR(review.date)}</p><p className="text-sm mt-1" style={{ color: BRAND.muted }}>Responsável: {review.responsavel || "-"}</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-8 gap-3">
        <Metric label="Containers" value={review.containers.length} icon={ClipboardList} />
        <Metric label="Ocupação" value={`${totals.occupancyRate}%`} icon={Package} tone="ok" sublabel={`${totals.filledPositions}/${totals.totalPositions} posições`} />
        <Metric label="Total de caixas" value={totals.boxes} icon={Boxes} />
        <Metric label="Dieta em bioconversão" value={`${totals.dietKg.toFixed(1)} kg`} icon={Package} />
        <Metric label="Caixas engorda" value={totals.fatteningBoxes} icon={Boxes} />
        <Metric label="Caixas maternidade" value={totals.maternityBoxes} icon={Boxes} />
        <Metric label="Atenção" value={totals.attention} icon={AlertTriangle} tone="warn" />
        <Metric label="Críticas" value={totals.critical} icon={AlertTriangle} tone="danger" />
      </div>

      <div className="space-y-6">
        {review.containers.map((c) => {
          const cTotals = computeContainerTotals(c);
          return (
            <div key={c.containerId} className="break-inside-avoid border rounded-[1.25rem] p-4 space-y-4" style={{ borderColor: BRAND.line }}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-3"><MiniContainerIcon /><h3 className="text-xl font-semibold" style={{ color: BRAND.text }}>{c.name}</h3></div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <InfoChip icon={Wind} label={`Ventilação: ${c.ventilacao}`} />
                  <InfoChip icon={RotateCw} label={`Recirc.: ${c.recirculacao}`} />
                  <InfoChip icon={Thermometer} label={`Setpoint: ${c.setpoint || "-"} °C`} />
                  <InfoChip icon={Boxes} label={`${cTotals.boxes} caixas`} />
                  <InfoChip icon={Package} label={`${cTotals.dietKg.toFixed(1)} kg dieta`} />
                </div>
              </div>
              <ContainerIllustration container={c} />
              <table className="w-full text-xs border rounded-xl overflow-hidden" style={{ borderColor: BRAND.line }}>
                <thead style={{ backgroundColor: BRAND.soft }}><tr><th className="p-2 text-left">Pos.</th><th className="p-2 text-left">Lote</th><th className="p-2 text-left">Dieta</th><th className="p-2 text-left">Caixas</th><th className="p-2 text-left">Dieta/caixa</th><th className="p-2 text-left">Dieta total</th><th className="p-2 text-left">Uso</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Observações</th></tr></thead>
                <tbody>{c.positions.map((p) => <tr key={p.position} className="border-t" style={{ borderColor: BRAND.line }}><td className="p-2 font-semibold">{p.position}</td><td className="p-2">{p.lote || "-"}</td><td className="p-2">{p.dieta || "-"}</td><td className="p-2">{p.caixas || "-"}</td><td className="p-2">{p.dietaKgPorCaixa ? `${Number(p.dietaKgPorCaixa).toFixed(1)} kg` : "-"}</td><td className="p-2">{((Number(p.caixas) || 0) * (Number(p.dietaKgPorCaixa) || 0)).toFixed(1)} kg</td><td className="p-2"><UsePill uso={p.uso} small /></td><td className="p-2"><StatusPill status={p.status} small /></td><td className="p-2">{p.observacoes || "-"}</td></tr>)}</tbody>
              </table>
              {c.observacoesGerais && <div className="text-sm rounded-xl p-3" style={{ backgroundColor: BRAND.soft }}><b>Observações gerais:</b> {c.observacoesGerais}</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ContainerIllustration({ container, large = false }) {
  const top = [0, 2, 4, 6];
  const bottom = [1, 3, 5, 7];
  return (
    <div className="rounded-[1.25rem] border p-4" style={{ backgroundColor: BRAND.soft, borderColor: BRAND.line }}>
      <div className="relative rounded-[1rem] border bg-white overflow-hidden" style={{ borderColor: BRAND.line }}>
        <div className="absolute left-0 top-0 bottom-0 w-5" style={{ backgroundColor: "#ECF0F2" }} />
        <div className="absolute right-0 top-0 bottom-0 w-5" style={{ backgroundColor: "#ECF0F2" }} />
        <div className="absolute left-8 right-8 top-4 h-4 rounded-full" style={{ backgroundColor: "#DCE4E7" }}>
          <div className="absolute left-2 -top-1 h-6 w-6 rounded-full bg-white border flex items-center justify-center" style={{ borderColor: BRAND.line }}><Fan className="h-3.5 w-3.5" style={{ color: BRAND.navy }} /></div>
          <div className="absolute right-2 -top-1 h-6 w-6 rounded-full bg-white border flex items-center justify-center" style={{ borderColor: BRAND.line }}><Fan className="h-3.5 w-3.5" style={{ color: BRAND.navy }} /></div>
        </div>
        <div className="relative z-10 p-6 pt-12">
          <div className="grid grid-cols-4 gap-3">
            {top.map((idx) => <PalletPosition key={idx} p={container.positions[idx]} large={large} />)}
            {bottom.map((idx) => <PalletPosition key={idx} p={container.positions[idx]} large={large} />)}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold" style={{ color: BRAND.muted }}>
            <span className="inline-flex items-center gap-1"><Wind className="h-3 w-3" /> entrada de ar / portas</span>
            <span className="inline-flex items-center gap-1"><RotateCw className="h-3 w-3" /> recirculação: {container.recirculacao}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PalletPosition({ p, large = false }) {
  return (
    <div className="rounded-xl border bg-white p-2 shadow-sm" style={{ borderColor: BRAND.line }}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm" style={{ color: BRAND.text }}>P{p.position}</span>
        <StatusDot status={p.status} />
      </div>
      <div className={`rounded-lg border flex items-center justify-center ${large ? "h-28" : "h-20"}`} style={{ backgroundColor: BRAND.soft, borderColor: BRAND.line }}>
        <PalletIllustration caixas={p.caixas} uso={p.uso} compact={!large} />
      </div>
      <div className="mt-2 space-y-1 text-[11px]">
        <div className="flex justify-between gap-1"><span style={{ color: BRAND.muted }}>Lote</span><b>{p.lote || "-"}</b></div>
        <div className="flex justify-between gap-1"><span style={{ color: BRAND.muted }}>Cx</span><b>{p.caixas || "-"}</b></div>
        <div className="flex justify-between gap-1"><span style={{ color: BRAND.muted }}>Dieta</span><b>{p.dieta || "-"}</b></div>
        <div className="flex justify-between gap-1"><span style={{ color: BRAND.muted }}>Kg dieta</span><b>{((Number(p.caixas) || 0) * (Number(p.dietaKgPorCaixa) || 0)).toFixed(1)} kg</b></div>
        <UsePill uso={p.uso} small />
      </div>
    </div>
  );
}

function PalletIllustration({ caixas, uso = "Produção", compact = false }) {
  const count = Math.max(0, Number(caixas) || 0);
  const isMaternity = uso === "Maternidade";
  const trueLevels = isMaternity ? Math.ceil(count / 10) : count;
  const visibleLevels = compact ? Math.min(trueLevels, 8) : Math.min(trueLevels, 15);
  const stackWidth = compact ? 56 : 92;
  const boxHeight = compact ? 7 : 8;
  const gap = compact ? 2 : 3;
  const maxStackHeight = compact ? 86 : 150;

  return (
    <div className="w-full h-full flex items-end justify-center overflow-hidden">
      <div className="relative flex flex-col items-center justify-end" style={{ width: stackWidth, height: compact ? 116 : 176 }}>
        <div
          className="flex flex-col-reverse items-center justify-start overflow-hidden"
          style={{ width: stackWidth, maxHeight: maxStackHeight, gap }}
        >
          <PalletBase compact={compact} fit />
          {visibleLevels === 0 ? (
            <div
              className="rounded-lg border border-dashed flex items-center justify-center text-[10px] w-full"
              style={{ color: BRAND.empty, borderColor: "#C9D3D8", height: compact ? 34 : 46 }}
            >
              vazio
            </div>
          ) : isMaternity ? (
            Array.from({ length: visibleLevels }).map((_, i) => (
              <MaternityVisualLevel key={i} compact={compact} height={boxHeight} />
            ))
          ) : (
            Array.from({ length: visibleLevels }).map((_, i) => (
              <RealBox key={i} compact={compact} index={i} fit height={boxHeight} />
            ))
          )}
        </div>
        {count > 0 && (
          <div
            className="absolute -top-1 right-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold border bg-white"
            style={{ color: BRAND.navy, borderColor: BRAND.line }}
          >
            {count} cx
          </div>
        )}
      </div>
    </div>
  );
}

function MaternityVisualLevel({ compact = false, height = 5 }) {
  return (
    <div className="grid grid-cols-10 w-full relative" style={{ gap: compact ? 1 : 2, height }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[2px]"
          style={{
            background: "linear-gradient(180deg, #293138 0%, #11181D 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.10), 0 1px 1px rgba(0,0,0,.18)",
          }}
        />
      ))}
    </div>
  );
}

function MaternityPalletIllustration({ caixas, compact = false }) {
  const n = Math.max(0, Math.min(150, Number(caixas) || 0));
  const levels = Math.ceil(n / 10);
  const fullLevels = Math.floor(n / 10);
  const remainder = n % 10;

  return (
    <div className={`${compact ? "w-20" : "w-28"} mx-auto flex flex-col items-center justify-end`}>
      <div className={`flex flex-col-reverse ${compact ? "gap-[2px] min-h-[58px]" : "gap-[3px] min-h-[92px]"} w-full justify-end`}>
        {n === 0 ? (
          <div
            className="rounded-lg border border-dashed flex items-center justify-center text-[10px]"
            style={{ color: BRAND.empty, borderColor: "#C9D3D8", height: compact ? "42px" : "54px" }}
          >
            sem caixas
          </div>
        ) : (
          Array.from({ length: levels }).map((_, levelIndex) => {
            const boxesInLevel = levelIndex < fullLevels ? 10 : remainder || 10;
            return <MaternityLevel key={levelIndex} boxes={boxesInLevel} compact={compact} level={levelIndex} />;
          })
        )}
      </div>
      <PalletBase compact={compact} />
      {n > 0 && (
        <div className="mt-1 text-[10px] font-semibold" style={{ color: BRAND.muted }}>
          10 caixas/nível · {levels} nível{levels > 1 ? "is" : ""}
        </div>
      )}
    </div>
  );
}

function MaternityLevel({ boxes, compact = false, level = 0 }) {
  return (
    <div
      className={`mx-auto grid grid-cols-10 ${compact ? "gap-[1px] w-16" : "gap-[2px] w-24"}`}
      title={`Nível ${level + 1}: ${boxes} caixas de maternidade`}
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className={`${compact ? "h-[5px]" : "h-[7px]"} rounded-[1px]`}
          style={{ backgroundColor: i < boxes ? "#11181D" : "rgba(17,24,29,.12)" }}
        />
      ))}
    </div>
  );
}

function RealBox({ compact = false, index = 0, fit = false, height }) {
  const boxHeight = height || (compact ? 8 : 10);
  const sideWidth = compact ? 6 : 9;
  const topHeight = compact ? 3 : 5;
  return (
    <div
      className={`relative mx-auto ${fit ? "w-full" : compact ? "w-16" : "w-24"} rounded-[3px] overflow-visible`}
      title={`Caixa ${index + 1}`}
      style={{
        height: boxHeight,
        filter: "drop-shadow(0 1px 1px rgba(0,0,0,.22))",
      }}
    >
      <div
        className="absolute inset-x-0 bottom-0 rounded-[3px] overflow-hidden"
        style={{
          height: boxHeight,
          background: `linear-gradient(90deg, ${BRAND.crateBlue} 0px, ${BRAND.crateBlue} ${sideWidth}px, ${BRAND.crateBlack} ${sideWidth}px, ${BRAND.crateBlack} calc(100% - ${sideWidth}px), ${BRAND.crateBlue} calc(100% - ${sideWidth}px), ${BRAND.crateBlue} 100%)`,
          border: "1px solid rgba(0,0,0,.20)",
          boxShadow: "inset 0 -2px 0 rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.15)",
        }}
      >
        <span
          className="absolute left-1/2 -translate-x-1/2 bottom-0 rounded-t-sm"
          style={{
            width: compact ? "16px" : "26px",
            height: compact ? "2px" : "3px",
            backgroundColor: "rgba(255,255,255,.09)",
          }}
        />
      </div>
      <div
        className="absolute left-[4px] right-[4px] rounded-t-[3px]"
        style={{
          top: -topHeight + 1,
          height: topHeight,
          background: "linear-gradient(180deg, #3B4850 0%, #252D33 100%)",
          transform: "skewX(-18deg)",
          transformOrigin: "bottom left",
          border: "1px solid rgba(0,0,0,.12)",
          borderBottom: "none",
          opacity: 0.98,
        }}
      />
      <div
        className="absolute right-[-3px] top-[1px] bottom-[1px] rounded-r-[2px]"
        style={{
          width: compact ? 3 : 4,
          background: "linear-gradient(180deg, #0E5D89 0%, #0B4769 100%)",
          transform: "skewY(28deg)",
          transformOrigin: "top left",
          opacity: 0.95,
        }}
      />
    </div>
  );
}

function PalletBase({ compact = false, fit = false }) {
  return (
    <div className={`${fit ? "w-full" : compact ? "w-20" : "w-28"} mt-1 mx-auto shrink-0`}>
      <div
        className={`${compact ? "h-[5px]" : "h-[6px]"} rounded-sm`}
        style={{ backgroundColor: BRAND.pallet }}
      />
      <div className="grid grid-cols-3 gap-1 mt-1">
        <div
          className={`${compact ? "h-[6px]" : "h-[8px]"} rounded-sm`}
          style={{ backgroundColor: BRAND.palletDark }}
        />
        <div
          className={`${compact ? "h-[6px]" : "h-[8px]"} rounded-sm`}
          style={{ backgroundColor: BRAND.palletDark }}
        />
        <div
          className={`${compact ? "h-[6px]" : "h-[8px]"} rounded-sm`}
          style={{ backgroundColor: BRAND.palletDark }}
        />
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon = ClipboardList, tone = "default", sublabel = "" }) {
  const palette = tone === "danger" ? { bg: "#FDECEC", color: BRAND.danger } : tone === "warn" ? { bg: "#FFF6DF", color: BRAND.warn } : tone === "ok" ? { bg: "#EAF7EF", color: BRAND.ok } : { bg: BRAND.softBlue, color: BRAND.navy };
  return (
    <div className="border rounded-xl p-3 bg-white flex items-center gap-3" style={{ borderColor: BRAND.line }}>
      <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: palette.bg, color: palette.color }}><Icon className="h-5 w-5" /></div>
      <div><p className="text-xs font-semibold" style={{ color: BRAND.muted }}>{label}</p><p className="text-2xl font-semibold" style={{ color: BRAND.text }}>{value}</p>{sublabel && <p className="text-[11px] font-semibold" style={{ color: BRAND.muted }}>{sublabel}</p>}</div>
    </div>
  );
}

function InfoChip({ icon: Icon, label, tone = "default" }) {
  const color = tone === "danger" ? BRAND.danger : BRAND.navy;
  const bg = tone === "danger" ? "#FDECEC" : BRAND.softBlue;
  return <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold" style={{ backgroundColor: bg, color }}><Icon className="h-3.5 w-3.5" />{label}</span>;
}

function ControlSelect({ label, value, onChange, options, muted = false }) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-semibold" style={{ color: muted ? BRAND.muted : BRAND.text }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full border rounded-xl px-3 py-2 bg-white" style={{ borderColor: BRAND.line }}>
        {options.map((op) => <option key={op}>{op}</option>)}
      </select>
    </label>
  );
}

function MiniContainerIcon({ active = false }) {
  const stroke = active ? BRAND.navy : BRAND.muted;
  return (
    <svg width="30" height="22" viewBox="0 0 60 44" aria-hidden="true">
      <rect x="4" y="8" width="52" height="26" rx="4" fill="none" stroke={stroke} strokeWidth="3" />
      <path d="M14 12V30M26 12V30M38 12V30M50 12V30" stroke={stroke} strokeWidth="2" opacity="0.55" />
      <circle cx="16" cy="36" r="2" fill={stroke} />
      <circle cx="44" cy="36" r="2" fill={stroke} />
    </svg>
  );
}

function PalletIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="10" y="19" width="44" height="7" rx="2" fill={BRAND.navy} />
      <rect x="10" y="31" width="44" height="7" rx="2" fill={BRAND.navy} opacity="0.75" />
      <rect x="12" y="44" width="10" height="8" rx="1.5" fill={BRAND.palletDark} />
      <rect x="27" y="44" width="10" height="8" rx="1.5" fill={BRAND.palletDark} />
      <rect x="42" y="44" width="10" height="8" rx="1.5" fill={BRAND.palletDark} />
    </svg>
  );
}

import { useEffect, useMemo, useState, useRef } from 'react';
import { Appointment, Patient, Therapist } from '../types';
import { ConfirmModal, Modal, showToast } from '../components/ui';
import { apiFetch } from '../utils/api.js';
import { addDays, addMonths, getTodayStr, toLocalDateStr } from '../utils/date';

type ViewMode = 'day' | 'week' | 'month';

interface CalendarProps {
  initialModal: string | null;
  onModalConsumed: () => void;
}

const treatmentTypes = ['Physiotherapie', 'Massage', 'Training', 'Beratung', 'Folgekontrolle'];

const HOUR_HEIGHT = 60; // px per hour
const START_HOUR = 7;
const END_HOUR = 20;

function formatViewLabel(viewMode: ViewMode, selectedDate: string): string {
  const date = new Date(`${selectedDate}T12:00:00`);
  if (viewMode === 'month') {
    return date.toLocaleDateString('de-AT', { month: 'long', year: 'numeric' });
  }
  if (viewMode === 'week') {
    const start = new Date(`${selectedDate}T12:00:00`);
    const day = start.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + offset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString('de-AT', { day: '2-digit', month: 'short' })} – ${end.toLocaleDateString('de-AT', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }
  return date.toLocaleDateString('de-AT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number) {
  const safeMinutes = Math.max(0, minutes);
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function getWeekDays(dateStr: string): Date[] {
  const base = new Date(`${dateStr}T12:00:00`);
  const day = base.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  const start = new Date(base);
  start.setDate(base.getDate() + offset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function getMonthGrid(dateStr: string): Array<{ date: Date; currentMonth: boolean }> {
  const [year, month] = dateStr.slice(0, 7).split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    return { date, currentMonth: date.getMonth() === month - 1 };
  });
}

function getEventStyle(timeStart: string, timeEnd: string, column: number, totalColumns: number) {
  const startMin = timeToMinutes(timeStart);
  const endMin = timeToMinutes(timeEnd);
  const top = (startMin - START_HOUR * 60) * (HOUR_HEIGHT / 60);
  const height = Math.max((endMin - startMin) * (HOUR_HEIGHT / 60), 20);
  const widthPct = totalColumns > 1 ? `${((1 / totalColumns) * 100).toFixed(2)}%` : '100%';
  const leftPct = totalColumns > 1 ? `${((column / totalColumns) * 100).toFixed(2)}%` : '0%';
  return { top, height, width: widthPct, left: leftPct };
}

// Layout overlapping events into columns
function layoutEvents(appointments: Appointment[]): Array<Appointment & { _col: number; _cols: number }> {
  if (appointments.length === 0) return [];

  const sorted = [...appointments].sort((a, b) => {
    const startDiff = timeToMinutes(a.time_start) - timeToMinutes(b.time_start);
    return startDiff !== 0 ? startDiff : timeToMinutes(a.time_end) - timeToMinutes(b.time_end);
  });

  const columns: Array<typeof sorted> = [];
  const result: Array<Appointment & { _col: number; _cols: number }> = [];

  for (const apt of sorted) {
    const aptStart = timeToMinutes(apt.time_start);
    let placed = false;
    for (let c = 0; c < columns.length; c++) {
      const lastInCol = columns[c][columns[c].length - 1];
      if (timeToMinutes(lastInCol.time_end) <= aptStart) {
        columns[c].push(apt);
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([apt]);
    }
  }

  // Assign column indices and compute total overlapping columns per event
  for (let c = 0; c < columns.length; c++) {
    for (const apt of columns[c]) {
      // Find max overlapping columns for this event's time span
      const aptStart = timeToMinutes(apt.time_start);
      const aptEnd = timeToMinutes(apt.time_end);

      // Simple: total columns = number of columns that have at least one event overlapping
      let overlappingCols = 0;
      for (let oc = 0; oc < columns.length; oc++) {
        const overlaps = columns[oc].some(other =>
          timeToMinutes(other.time_start) < aptEnd && timeToMinutes(other.time_end) > aptStart
        );
        if (overlaps) overlappingCols++;
      }
      result.push({ ...apt, _col: c, _cols: overlappingCols });
    }
  }

  return result;
}

export default function Calendar({ initialModal, onModalConsumed }: CalendarProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [therapistsLoading, setTherapistsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState('');
  const [therapistsError, setTherapistsError] = useState('');
  const [pendingInitialAppointmentModal, setPendingInitialAppointmentModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    patient_id: '',
    therapist_id: '',
    date: selectedDate,
    time_start: '09:00',
    time_end: '09:50',
    treatment_type: treatmentTypes[0],
    notes: '',
    sms_reminder: 0 as 0 | 1 | 2 | 3,
  });

  // Auto-scroll to current time on mount / date change
  useEffect(() => {
    if (dayScrollRef.current && viewMode === 'day') {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const scrollTo = Math.max(0, (currentMin - START_HOUR * 60) * (HOUR_HEIGHT / 60) - 100);
      dayScrollRef.current.scrollTop = scrollTo;
    }
  }, [viewMode, selectedDate]);

  // Mobile: force day view
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    if (mq.matches && viewMode !== 'day') setViewMode('day');
    const listener = (e: MediaQueryListEvent) => { if (e.matches && viewMode !== 'day') setViewMode('day'); };
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [viewMode]);

  useEffect(() => { void Promise.all([fetchPatients(), fetchTherapists()]); }, []);

  useEffect(() => {
    const canOpen = !patientsLoading && !therapistsLoading && !patientsError && !therapistsError && patients.length > 0;
    if (initialModal !== 'appointment') return;
    if (patientsLoading || therapistsLoading) { setPendingInitialAppointmentModal(true); onModalConsumed(); return; }
    if (canOpen) { openCreateModal(selectedDate); onModalConsumed(); return; }
    setPendingInitialAppointmentModal(false);
    if (patientsError || therapistsError) showToast('Termin kann erst geöffnet werden, wenn Patient:innen und Therapeut:innen geladen sind.', 'error');
    else if (patients.length === 0) showToast('Bitte zuerst mindestens eine/n Patient:in anlegen.', 'warning');
    onModalConsumed();
  }, [initialModal, onModalConsumed, patients.length, patientsError, patientsLoading, selectedDate, therapistsError, therapistsLoading]);

  useEffect(() => {
    if (!pendingInitialAppointmentModal || patientsLoading || therapistsLoading) return;
    const canOpen = !patientsError && !therapistsError && patients.length > 0;
    setPendingInitialAppointmentModal(false);
    if (canOpen) { openCreateModal(selectedDate); return; }
    if (patientsError || therapistsError) showToast('Termin kann erst geöffnet werden, wenn Patient:innen und Therapeut:innen geladen sind.', 'error');
    else if (patients.length === 0) showToast('Bitte zuerst mindestens eine/n Patient:in anlegen.', 'warning');
  }, [patients.length, patientsError, patientsLoading, pendingInitialAppointmentModal, selectedDate, therapistsError, therapistsLoading]);

  useEffect(() => { void fetchAppointments(); }, [selectedDate, viewMode, selectedTherapistId]);

  async function fetchPatients() {
    setPatientsLoading(true); setPatientsError('');
    try {
      const res = await apiFetch('/api/patients', { credentials: 'include' });
      const data = await res.json();
      if (data.success) { setPatients(data.data); return; }
      setPatients([]); setPatientsError(data.error || 'Patient:innen konnten nicht geladen werden.');
    } catch { setPatients([]); setPatientsError('Patient:innen konnten nicht geladen werden.'); }
    finally { setPatientsLoading(false); }
  }

  async function fetchTherapists() {
    setTherapistsLoading(true); setTherapistsError('');
    try {
      const res = await apiFetch('/api/therapists', { credentials: 'include' });
      const data = await res.json();
      if (data.success) { setTherapists(data.data); setFormData(c => ({ ...c, therapist_id: c.therapist_id || (data.data[0]?.id ? String(data.data[0].id) : '') })); return; }
      setTherapists([]); setTherapistsError(data.error || 'Therapeut:innen konnten nicht geladen werden.');
    } catch { setTherapists([]); setTherapistsError('Therapeut:innen konnten nicht geladen werden.'); }
    finally { setTherapistsLoading(false); }
  }

  async function fetchAppointments() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date: selectedDate, view: viewMode });
      if (selectedTherapistId !== 'all') params.set('therapist_id', selectedTherapistId);
      const res = await apiFetch(`/api/appointments?${params.toString()}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setAppointments(data.data);
      else showToast(data.error || 'Termine konnten nicht geladen werden', 'error');
    } catch { showToast('Termine konnten nicht geladen werden', 'error'); }
    finally { setLoading(false); }
  }

  const today = getTodayStr();
  const canCreate = !patientsLoading && !therapistsLoading && !patientsError && !therapistsError && patients.length > 0;
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const monthGrid = useMemo(() => getMonthGrid(selectedDate), [selectedDate]);

  // Active appointments (non-cancelled)
  const activeAppointments = useMemo(() => appointments.filter(a => a.status !== 'cancelled'), [appointments]);

  function getAppointmentsForDate(dateStr: string) {
    return activeAppointments.filter(a => a.date === dateStr);
  }

  function openCreateModal(date?: string, time?: string, therapistId?: string) {
    setEditingAppointment(null);
    setFormData({
      patient_id: '',
      therapist_id: therapistId || (therapists[0]?.id ? String(therapists[0].id) : ''),
      date: date || selectedDate,
      time_start: time || '09:00',
      time_end: time ? minutesToTime(timeToMinutes(time) + 50) : '09:50',
      treatment_type: treatmentTypes[0],
      notes: '',
      sms_reminder: 0,
    });
    setShowModal(true);
  }

  function openEditModal(appointment: Appointment) {
    setEditingAppointment(appointment);
    setFormData({
      patient_id: String(appointment.patient_id),
      therapist_id: appointment.therapist_id ? String(appointment.therapist_id) : '',
      date: appointment.date,
      time_start: appointment.time_start,
      time_end: appointment.time_end,
      treatment_type: appointment.treatment_type,
      notes: appointment.notes || '',
      sms_reminder: appointment.sms_reminder,
    });
    setShowModal(true);
  }

  async function submitAppointment(e: React.FormEvent) {
    e.preventDefault();
    try {
      const body = { ...formData, patient_id: Number(formData.patient_id), therapist_id: formData.therapist_id ? Number(formData.therapist_id) : null };
      const res = editingAppointment?.id
        ? await apiFetch(`/api/appointments/${editingAppointment.id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await apiFetch('/api/appointments', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.success) { showToast(data.error || 'Fehler beim Speichern', 'error'); return; }
      setShowModal(false);
      await fetchAppointments();
      showToast(editingAppointment ? 'Termin aktualisiert' : 'Termin erstellt', 'success');
    } catch { showToast('Termin konnte nicht gespeichert werden', 'error'); }
  }

  async function cancelAppointment(id: number) {
    try {
      const res = await apiFetch(`/api/appointments/${id}/cancel`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!data.success) { showToast(data.error || 'Termin konnte nicht abgesagt werden', 'error'); return; }
      await fetchAppointments(); showToast('Termin abgesagt', 'success');
    } catch { showToast('Termin konnte nicht abgesagt werden', 'error'); }
  }

  async function deleteAppointment(id: number) {
    try {
      const res = await apiFetch(`/api/appointments/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (!data.success) { showToast(data.error || 'Termin konnte nicht gelöscht werden', 'error'); return; }
      setShowModal(false); await fetchAppointments(); showToast('Termin gelöscht', 'success');
    } catch { showToast('Termin konnte nicht gelöscht werden', 'error'); }
  }

  function navigateDate(direction: number) {
    if (viewMode === 'month') { setSelectedDate(addMonths(selectedDate, direction)); return; }
    if (viewMode === 'week') { setSelectedDate(addDays(selectedDate, direction * 7)); return; }
    setSelectedDate(addDays(selectedDate, direction));
  }

  // ─── Time grid background (hour lines) ─────────────────────────
  function renderHourGrid() {
    const hours = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      hours.push(h);
    }
    return (
      <>
        {hours.map(h => (
          <div key={h} className="absolute left-0 right-0 border-t border-slate-100" style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}>
            <span className="absolute -left-1 -translate-x-full pr-2 text-[11px] text-slate-400 font-mono -mt-2">
              {String(h).padStart(2, '0')}:00
            </span>
          </div>
        ))}
      </>
    );
  }

  // ─── Compact event card ────────────────────────────────────────
  function renderEventCard(appointment: Appointment & { _col?: number; _cols?: number }, style: React.CSSProperties) {
    const color = appointment.therapist_color || '#2563EB';
    const firstName = appointment.patient_name?.split(' ')[0] || '?';
    const isSmall = Number(style.height ?? 0) < 35;

    return (
      <button
        key={appointment.id}
        type="button"
        onClick={() => openEditModal(appointment)}
        className="absolute rounded-lg text-left overflow-hidden transition hover:shadow-md hover:z-10 focus:outline-none focus:ring-2 focus:ring-blue-400"
        style={{
          ...style,
          borderLeft: `3px solid ${color}`,
          backgroundColor: `${color}12`,
          padding: isSmall ? '1px 6px' : '2px 6px',
        }}
      >
        <p className="truncate text-[11px] font-semibold text-slate-900 leading-tight">{firstName}</p>
        {!isSmall && <p className="truncate text-[10px] text-slate-500 leading-tight">{appointment.time_start}–{appointment.time_end}</p>}
        {!isSmall && appointment.treatment_type && <p className="truncate text-[10px] text-slate-400 leading-tight">{appointment.treatment_type}</p>}
      </button>
    );
  }

  // ─── Current time indicator ───────────────────────────────────
  function renderNowLine() {
    const now = new Date();
    const min = now.getHours() * 60 + now.getMinutes();
    if (min < START_HOUR * 60 || min > END_HOUR * 60) return null;
    const top = (min - START_HOUR * 60) * (HOUR_HEIGHT / 60);
    return <div className="absolute left-0 right-0 z-20 h-[2px] bg-red-500" style={{ top }}><div className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-red-500" /></div>;
  }

  // ─── Day View ──────────────────────────────────────────────────
  function renderDayView() {
    const dayApts = getAppointmentsForDate(selectedDate);
    const laid = layoutEvents(dayApts);
    const totalHeight = (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT;

    return (
      <div ref={dayScrollRef} className="overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ maxHeight: '75vh' }}>
        <div className="relative ml-14" style={{ height: totalHeight }}>
          {renderHourGrid()}
          {renderNowLine()}
          {laid.map(apt => {
            const style = getEventStyle(apt.time_start, apt.time_end, apt._col, apt._cols);
            return renderEventCard(apt, style);
          })}
          {/* Click-to-create on empty space */}
          <div
            className="absolute inset-0 z-0"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top + (dayScrollRef.current?.scrollTop ?? 0);
                const min = Math.round((y / (HOUR_HEIGHT / 60)) + START_HOUR * 60);
                const snapped = Math.floor(min / 15) * 15;
                openCreateModal(selectedDate, minutesToTime(Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - 50, snapped))));
              }
            }}
          />
        </div>
      </div>
    );
  }

  // ─── Week View ──────────────────────────────────────────────────
  function renderWeekView() {
    const totalHeight = (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT;

    return (
      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ maxHeight: '75vh' }}>
        <div className="md:min-w-[900px]">
          {/* Day headers */}
          <div className="sticky top-0 z-30 grid grid-cols-[56px_repeat(7,1fr)] border-b border-slate-200 bg-white">
            <div className="px-2 py-3" />
            {weekDays.map(day => {
              const ds = toLocalDateStr(day);
              const isToday = ds === today;
              const dayApts = getAppointmentsForDate(ds);
              return (
                <div key={ds} className={`px-2 py-2 text-center border-l border-slate-100 ${isToday ? 'bg-blue-50' : ''}`}>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">{day.toLocaleDateString('de-AT', { weekday: 'short' })}</p>
                  <p className={`text-lg font-semibold ${isToday ? 'text-blue-700' : 'text-slate-900'}`}>{day.getDate()}</p>
                  {dayApts.length > 0 && <p className="text-[10px] text-slate-400">{dayApts.length} Termin{dayApts.length > 1 ? 'e' : ''}</p>}
                </div>
              );
            })}
          </div>

          {/* Time grid + events */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)]">
            {/* Time column */}
            <div className="relative" style={{ height: totalHeight }}>
              {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR).map(h => (
                <div key={h} className="absolute left-0 right-0 -mt-2 pr-2 text-right text-[11px] text-slate-400 font-mono" style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}>
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map(day => {
              const ds = toLocalDateStr(day);
              const isToday = ds === today;
              const dayApts = layoutEvents(getAppointmentsForDate(ds));
              return (
                <div key={ds} className={`relative border-l border-slate-100 ${isToday ? 'bg-blue-50/30' : ''}`} style={{ height: totalHeight }}>
                  {/* Hour lines */}
                  {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR).map(h => (
                    <div key={h} className="absolute left-0 right-0 border-t border-slate-100" style={{ top: (h - START_HOUR) * HOUR_HEIGHT }} />
                  ))}
                  {/* Events */}
                  {dayApts.map(apt => {
                    const style = getEventStyle(apt.time_start, apt.time_end, apt._col, apt._cols);
                    return renderEventCard(apt, style);
                  })}
                  {ds === today && renderNowLine()}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── Month View ──────────────────────────────────────────────────
  function renderMonthView() {
    return (
      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="md:min-w-[900px]">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
              <div key={d} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {monthGrid.map(({ date, currentMonth }) => {
              const ds = toLocalDateStr(date);
              const dayApts = getAppointmentsForDate(ds);
              const isToday = ds === today;

              return (
                <div key={ds} className={`min-h-[120px] border-b border-r border-slate-100 p-2 ${currentMonth ? 'bg-white' : 'bg-slate-50/60'} ${isToday ? 'bg-blue-50/40' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <button
                      onClick={() => { setSelectedDate(ds); setViewMode('day'); }}
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                        isToday ? 'bg-blue-600 text-white' : currentMonth ? 'text-slate-800 hover:bg-slate-100' : 'text-slate-400'
                      }`}
                    >
                      {date.getDate()}
                    </button>
                    <button onClick={() => openCreateModal(ds)} className="rounded p-1 text-[10px] text-slate-300 hover:text-blue-600 hover:bg-blue-50" aria-label="Termin erstellen">+</button>
                  </div>
                  <div className="space-y-[2px]">
                    {dayApts.slice(0, 5).map(apt => {
                      const color = apt.therapist_color || '#2563EB';
                      return (
                        <button
                          key={apt.id}
                          onClick={() => openEditModal(apt)}
                          className="w-full text-left rounded px-1.5 py-[1px] text-[10px] truncate hover:bg-slate-100 transition"
                          style={{ borderLeft: `2px solid ${color}` }}
                        >
                          <span className="font-medium text-slate-800">{apt.time_start}</span> <span className="text-slate-500">{apt.patient_name?.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                    {dayApts.length > 5 && (
                      <button onClick={() => { setSelectedDate(ds); setViewMode('day'); }} className="text-[10px] text-blue-600 hover:underline px-1">
                        +{dayApts.length - 5} weitere
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Behandlungen</h2>
            <p className="text-sm text-slate-500">{activeAppointments.length} Termin{activeAppointments.length === 1 ? '' : 'e'} in der aktuellen Ansicht</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5">
              {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition min-h-[36px] ${
                    viewMode === mode ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  } ${mode !== 'day' ? 'hidden md:block' : ''}`}
                >
                  {mode === 'day' ? 'Tag' : mode === 'week' ? 'Woche' : 'Monat'}
                </button>
              ))}
            </div>

            <select
              value={selectedTherapistId}
              onChange={e => setSelectedTherapistId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
            >
              <option value="all">Alle Therapeut:innen</option>
              {therapists.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>

            <button onClick={() => window.open('/api/appointments/ical', '_blank')} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100">
              iCal
            </button>

            <button onClick={() => openCreateModal(selectedDate)} disabled={!canCreate} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed">
              + Termin
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <div className="flex items-center gap-1">
          <button onClick={() => navigateDate(-1)} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100" aria-label="Zurück">←</button>
          <button onClick={() => setSelectedDate(today)} className="rounded-lg px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100">Heute</button>
          <button onClick={() => navigateDate(1)} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100" aria-label="Weiter">→</button>
        </div>
        <p className="text-sm font-semibold text-slate-900">{formatViewLabel(viewMode, selectedDate)}</p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm">Kalender wird geladen…</div>
      ) : activeAppointments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          <span className="text-3xl block mb-2">📅</span>
          Keine Termine in diesem Zeitraum.
          <button onClick={() => openCreateModal(selectedDate)} className="ml-2 text-blue-600 hover:underline font-medium">Jetzt anlegen</button>
        </div>
      ) : viewMode === 'day' ? renderDayView() : viewMode === 'week' ? renderWeekView() : renderMonthView()}

      {/* Appointment Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingAppointment ? 'Termin bearbeiten' : 'Termin anlegen'} size="lg">
        <form onSubmit={submitAppointment} className="space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Patient/in</label>
              <select required value={formData.patient_id} onChange={e => setFormData(c => ({ ...c, patient_id: e.target.value }))} disabled={patientsLoading || !!patientsError} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
                <option value="">{patientsLoading ? 'Wird geladen…' : patientsError ? 'Fehler beim Laden' : 'Bitte wählen…'}</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
              </select>
              {patientsError && <p className="mt-1 text-xs text-red-600">{patientsError}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Therapeut/in</label>
              <select value={formData.therapist_id} onChange={e => setFormData(c => ({ ...c, therapist_id: e.target.value }))} disabled={therapistsLoading || !!therapistsError} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
                <option value="">{therapistsLoading ? 'Wird geladen…' : therapistsError ? 'Fehler beim Laden' : 'Nicht zugeordnet'}</option>
                {therapists.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {therapistsError && <p className="mt-1 text-xs text-red-600">{therapistsError}</p>}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Datum</label>
              <input type="date" required value={formData.date} onChange={e => setFormData(c => ({ ...c, date: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Von</label>
              <input type="time" required value={formData.time_start} onChange={e => setFormData(c => ({ ...c, time_start: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Bis</label>
              <input type="time" required value={formData.time_end} onChange={e => setFormData(c => ({ ...c, time_end: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Behandlungsart</label>
              <select value={formData.treatment_type} onChange={e => setFormData(c => ({ ...c, treatment_type: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
                {treatmentTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">SMS-Reminder</label>
              <select value={formData.sms_reminder} onChange={e => setFormData(c => ({ ...c, sms_reminder: Number(e.target.value) as 0 | 1 | 2 | 3 }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
                <option value={0}>Keine Erinnerung</option>
                <option value={2}>Automatisch planen</option>
                <option value={1}>Bereits versendet</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notizen</label>
            <textarea value={formData.notes} onChange={e => setFormData(c => ({ ...c, notes: e.target.value }))} rows={3} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Hinweise zur Behandlung, Raum, interne Notizen …" />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            {editingAppointment?.id && (
              <>
                <button type="button" onClick={() => setConfirmAction({ message: 'Termin wirklich löschen?', onConfirm: () => void deleteAppointment(editingAppointment.id!) })} className="rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800">Löschen</button>
                <button type="button" onClick={() => setConfirmAction({ message: 'Termin wirklich absagen?', onConfirm: () => void cancelAppointment(editingAppointment.id!) })} className="rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">Absagen</button>
              </>
            )}
            <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Abbrechen</button>
            <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">{editingAppointment ? 'Speichern' : 'Erstellen'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(confirmAction)}
        message={confirmAction?.message ?? ''}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => { const action = confirmAction?.onConfirm; setConfirmAction(null); action?.(); }}
        confirmText="Bestätigen"
      />
    </div>
  );
}
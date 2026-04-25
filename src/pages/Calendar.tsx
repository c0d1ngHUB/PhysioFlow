import { useEffect, useMemo, useState } from 'react';
import { Appointment, Patient, Therapist } from '../types';
import { ConfirmModal, Modal, showToast } from '../components/ui';
import { addDays, addMonths, getTodayStr, toLocalDateStr } from '../utils/date';

type ViewMode = 'day' | 'week' | 'month';

interface CalendarProps {
  initialModal: string | null;
  onModalConsumed: () => void;
}

interface TherapistLane {
  key: string;
  label: string;
  therapistId: string;
  color: string;
}

type AppointmentsByTherapist = Map<string, Appointment[]>;

const treatmentTypes = ['Physiotherapie', 'Massage', 'Training', 'Beratung', 'Folgekontrolle'];

function getWeekStart(dateStr: string): Date {
  const base = new Date(`${dateStr}T12:00:00`);
  const day = base.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  base.setDate(base.getDate() + offset);
  return base;
}

function getWeekDays(dateStr: string): Date[] {
  const start = getWeekStart(dateStr);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function getMonthGrid(dateStr: string): Array<{ date: Date; currentMonth: boolean }> {
  const [year, month] = dateStr.slice(0, 7).split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return { date, currentMonth: date.getMonth() === month - 1 };
  });
}

function formatViewLabel(viewMode: ViewMode, selectedDate: string): string {
  const date = new Date(`${selectedDate}T12:00:00`);

  if (viewMode === 'month') {
    return date.toLocaleDateString('de-AT', { month: 'long', year: 'numeric' });
  }

  if (viewMode === 'week') {
    const weekDays = getWeekDays(selectedDate);
    const start = weekDays[0];
    const end = weekDays[6];
    return `${start.toLocaleDateString('de-AT', { day: '2-digit', month: 'short' })} – ${end.toLocaleDateString('de-AT', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }

  return date.toLocaleDateString('de-AT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
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

function buildTimeSlots(startMinutes: number, endMinutes: number) {
  const slots: string[] = [];
  for (let minute = startMinutes; minute < endMinutes; minute += 30) {
    slots.push(minutesToTime(minute));
  }
  return slots;
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

  useEffect(() => {
    void Promise.all([fetchPatients(), fetchTherapists()]);
  }, []);

  useEffect(() => {
    const canOpenAppointmentModal = !patientsLoading && !therapistsLoading && !patientsError && !therapistsError && patients.length > 0;

    if (initialModal !== 'appointment') {
      return;
    }

    if (patientsLoading || therapistsLoading) {
      setPendingInitialAppointmentModal(true);
      onModalConsumed();
      return;
    }

    if (canOpenAppointmentModal) {
      openCreateModal(selectedDate);
      onModalConsumed();
      return;
    }

    setPendingInitialAppointmentModal(false);
    if (patientsError || therapistsError) {
      showToast('Termin kann erst geöffnet werden, wenn Patient:innen und Therapeut:innen geladen sind.', 'error');
    } else if (patients.length === 0) {
      showToast('Bitte zuerst mindestens eine/n Patient:in anlegen.', 'warning');
    }

    onModalConsumed();
  }, [
    initialModal,
    onModalConsumed,
    patients.length,
    patientsError,
    patientsLoading,
    selectedDate,
    therapistsError,
    therapistsLoading,
  ]);

  useEffect(() => {
    const canOpenAppointmentModal = !patientsLoading && !therapistsLoading && !patientsError && !therapistsError && patients.length > 0;

    if (!pendingInitialAppointmentModal || patientsLoading || therapistsLoading) {
      return;
    }

    if (canOpenAppointmentModal) {
      setPendingInitialAppointmentModal(false);
      openCreateModal(selectedDate);
      return;
    }

    setPendingInitialAppointmentModal(false);
    if (patientsError || therapistsError) {
      showToast('Termin kann erst geöffnet werden, wenn Patient:innen und Therapeut:innen geladen sind.', 'error');
    } else if (patients.length === 0) {
      showToast('Bitte zuerst mindestens eine/n Patient:in anlegen.', 'warning');
    }
  }, [
    patients.length,
    patientsError,
    patientsLoading,
    pendingInitialAppointmentModal,
    selectedDate,
    therapistsError,
    therapistsLoading,
  ]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const applyViewportMode = (matches: boolean) => {
      if (matches && viewMode !== 'day') {
        setViewMode('day');
      }
    };

    applyViewportMode(mediaQuery.matches);
    const listener = (event: MediaQueryListEvent) => applyViewportMode(event.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [viewMode]);

  useEffect(() => {
    void fetchAppointments();
  }, [selectedDate, viewMode, selectedTherapistId]);

  async function fetchPatients() {
    setPatientsLoading(true);
    setPatientsError('');
    try {
      const res = await fetch('/api/patients', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setPatients(data.data);
        return;
      }

      setPatients([]);
      setPatientsError(data.error || 'Patient:innen konnten nicht geladen werden.');
    } catch {
      setPatients([]);
      setPatientsError('Patient:innen konnten nicht geladen werden.');
    } finally {
      setPatientsLoading(false);
    }
  }

  async function fetchTherapists() {
    setTherapistsLoading(true);
    setTherapistsError('');
    try {
      const res = await fetch('/api/therapists', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setTherapists(data.data);
        setFormData((current) => ({
          ...current,
          therapist_id: current.therapist_id || (data.data[0]?.id ? String(data.data[0].id) : ''),
        }));
        return;
      }

      setTherapists([]);
      setTherapistsError(data.error || 'Therapeut:innen konnten nicht geladen werden.');
    } catch {
      setTherapists([]);
      setTherapistsError('Therapeut:innen konnten nicht geladen werden.');
    } finally {
      setTherapistsLoading(false);
    }
  }

  async function fetchAppointments() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date: selectedDate, view: viewMode });
      if (selectedTherapistId !== 'all') {
        params.set('therapist_id', selectedTherapistId);
      }

      const res = await fetch(`/api/appointments?${params.toString()}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setAppointments(data.data);
      } else {
        showToast(data.error || 'Termine konnten nicht geladen werden', 'error');
      }
    } catch {
      showToast('Termine konnten nicht geladen werden', 'error');
    } finally {
      setLoading(false);
    }
  }

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const monthGrid = useMemo(() => getMonthGrid(selectedDate), [selectedDate]);
  const today = getTodayStr();
  const isAllTherapistsView = selectedTherapistId === 'all';
  const canCreateAppointments = !patientsLoading && !therapistsLoading && !patientsError && !therapistsError && patients.length > 0;
  const therapistLanes = useMemo<TherapistLane[]>(() => {
    const lanes = therapists.map((therapist) => ({
      key: `therapist-${therapist.id}`,
      label: therapist.name,
      therapistId: String(therapist.id),
      color: therapist.color,
    }));

    const hasUnassignedAppointments = appointments.some((appointment) => !appointment.therapist_id);
    if (hasUnassignedAppointments) {
      lanes.push({
        key: 'therapist-unassigned',
        label: 'Nicht zugeordnet',
        therapistId: '',
        color: '#64748B',
      });
    }

    return lanes;
  }, [appointments, therapists]);
  const timeRange = useMemo(() => {
    const defaultStart = 7 * 60;
    const defaultEnd = 20 * 60;

    if (appointments.length === 0) {
      return {
        startMinutes: defaultStart,
        endMinutes: defaultEnd,
        hasEarlyAppointments: false,
        hasLateAppointments: false,
      };
    }

    const earliestStart = Math.min(...appointments.map((appointment) => timeToMinutes(appointment.time_start)));
    const latestEnd = Math.max(...appointments.map((appointment) => timeToMinutes(appointment.time_end)));

    return {
      startMinutes: Math.min(defaultStart, Math.floor(earliestStart / 30) * 30),
      endMinutes: Math.max(defaultEnd, Math.ceil(latestEnd / 30) * 30),
      hasEarlyAppointments: earliestStart < defaultStart,
      hasLateAppointments: latestEnd > defaultEnd,
    };
  }, [appointments]);
  const timeSlots = useMemo(
    () => buildTimeSlots(timeRange.startMinutes, timeRange.endMinutes),
    [timeRange.endMinutes, timeRange.startMinutes],
  );
  const appointmentsByDateAndTherapist = useMemo(() => {
    const lookup = new Map<string, AppointmentsByTherapist>();

    for (const appointment of appointments) {
      if (appointment.status === 'cancelled') {
        continue;
      }

      const therapistKey = appointment.therapist_id ? String(appointment.therapist_id) : '';
      const appointmentsByTherapist = lookup.get(appointment.date) ?? new Map<string, Appointment[]>();
      const therapistAppointments = appointmentsByTherapist.get(therapistKey) ?? [];

      therapistAppointments.push(appointment);
      appointmentsByTherapist.set(therapistKey, therapistAppointments);
      lookup.set(appointment.date, appointmentsByTherapist);
    }

    for (const appointmentsByTherapist of lookup.values()) {
      for (const therapistAppointments of appointmentsByTherapist.values()) {
        therapistAppointments.sort((left, right) => left.time_start.localeCompare(right.time_start));
      }
    }

    return lookup;
  }, [appointments]);

  function getAppointmentsForDate(dateStr: string) {
    const appointmentsByTherapist = appointmentsByDateAndTherapist.get(dateStr);
    if (!appointmentsByTherapist) {
      return [];
    }

    return Array.from(appointmentsByTherapist.values())
      .flat()
      .sort((left, right) => left.time_start.localeCompare(right.time_start));
  }

  function getAppointmentsForDateAndTherapist(dateStr: string, therapistId?: string) {
    const appointmentsByTherapist = appointmentsByDateAndTherapist.get(dateStr);
    if (!appointmentsByTherapist) {
      return [];
    }

    if (therapistId === undefined) {
      return getAppointmentsForDate(dateStr);
    }

    return appointmentsByTherapist.get(therapistId) ?? [];
  }

  function appointmentForSlot(dateStr: string, time: string, therapistId?: string) {
    return getAppointmentsForDateAndTherapist(dateStr, therapistId).find(
      (appointment) => appointment.time_start <= time && appointment.time_end > time,
    );
  }

  function openCreateModal(date: string, timeStart = '09:00', therapistIdOverride?: string) {
    if (patientsLoading || therapistsLoading) {
      showToast('Stammdaten werden noch geladen. Bitte kurz warten.', 'warning');
      return;
    }

    if (patientsError || therapistsError) {
      showToast('Termin kann erst erstellt werden, wenn Patient:innen und Therapeut:innen geladen sind.', 'error');
      return;
    }

    if (patients.length === 0) {
      showToast('Bitte zuerst mindestens eine/n Patient:in anlegen.', 'warning');
      return;
    }

    const therapistId = therapistIdOverride ?? (selectedTherapistId !== 'all' ? selectedTherapistId : therapists[0]?.id ? String(therapists[0].id) : '');
    const [hour, minute] = timeStart.split(':').map(Number);
    const endDate = new Date(2000, 0, 1, hour, minute + 50);

    setEditingAppointment(null);
    setFormData({
      patient_id: patients[0]?.id ? String(patients[0].id) : '',
      therapist_id: therapistId,
      date,
      time_start: timeStart,
      time_end: `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`,
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

  async function submitAppointment(event: React.FormEvent) {
    event.preventDefault();

    const url = editingAppointment ? `/api/appointments/${editingAppointment.id}` : '/api/appointments';
    const method = editingAppointment ? 'PUT' : 'POST';
    const payload = {
      ...formData,
      patient_id: Number(formData.patient_id),
      therapist_id: formData.therapist_id ? Number(formData.therapist_id) : null,
    };

    try {
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        showToast(data.error || 'Termin konnte nicht gespeichert werden', 'error');
        return;
      }

      setShowModal(false);
      await fetchAppointments();
      showToast(editingAppointment ? 'Termin aktualisiert' : 'Termin erstellt', 'success');
    } catch {
      showToast('Termin konnte nicht gespeichert werden', 'error');
    }
  }

  async function cancelAppointment(id: number) {
    try {
      const res = await fetch(`/api/appointments/${id}/cancel`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!data.success) {
        showToast(data.error || 'Termin konnte nicht abgesagt werden', 'error');
        return;
      }

      await fetchAppointments();
      showToast('Termin abgesagt', 'success');
    } catch {
      showToast('Termin konnte nicht abgesagt werden', 'error');
    }
  }

  async function deleteAppointment(id: number) {
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (!data.success) {
        showToast(data.error || 'Termin konnte nicht gelöscht werden', 'error');
        return;
      }

      setShowModal(false);
      await fetchAppointments();
      showToast('Termin gelöscht', 'success');
    } catch {
      showToast('Termin konnte nicht gelöscht werden', 'error');
    }
  }

  function navigateDate(direction: number) {
    if (viewMode === 'month') {
      setSelectedDate(addMonths(selectedDate, direction));
      return;
    }
    if (viewMode === 'week') {
      setSelectedDate(addDays(selectedDate, direction * 7));
      return;
    }
    setSelectedDate(addDays(selectedDate, direction));
  }

  function renderAppointmentCard(appointment: Appointment, compact = false) {
    const color = appointment.therapist_color || '#2563EB';
    const firstName = appointment.patient_name.split(' ')[0];

    return (
      <button
        type="button"
        onClick={() => openEditModal(appointment)}
        className={`w-full rounded-xl border border-slate-200 bg-white p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${compact ? 'min-h-[58px]' : 'min-h-[74px]'}`}
        style={{ borderLeft: `4px solid ${color}` }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{firstName}</p>
            <p className="truncate text-xs text-slate-500">{appointment.treatment_type}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {appointment.time_start}
          </span>
        </div>
        {!compact && (
          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
            <span>{appointment.time_start}–{appointment.time_end}</span>
            {appointment.therapist_name && <span>• {appointment.therapist_name}</span>}
            {appointment.sms_reminder === 1 && <span>• SMS gesendet</span>}
            {appointment.sms_reminder === 2 && <span>• SMS geplant</span>}
            {appointment.sms_reminder === 3 && <span className="text-red-600">• SMS fehlgeschlagen</span>}
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Kalender</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Behandlungen und Ressourcen</h2>
            <p className="mt-2 text-sm text-slate-600">
              {appointments.length} Termin{appointments.length === 1 ? '' : 'e'} in der aktuellen Ansicht
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    viewMode === mode ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  } ${mode !== 'day' ? 'hidden md:block' : ''}`}
                >
                  {mode === 'day' ? 'Tag' : mode === 'week' ? 'Woche' : 'Monat'}
                </button>
              ))}
            </div>

            <select
              value={selectedTherapistId}
              onChange={(event) => setSelectedTherapistId(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">Alle Therapeut:innen</option>
              {therapists.map((therapist) => (
                <option key={therapist.id} value={therapist.id}>
                  {therapist.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => window.open('/api/appointments/ical', '_blank')}
              className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
            >
              iCal exportieren
            </button>

            <button
              onClick={() => openCreateModal(selectedDate)}
              disabled={!canCreateAppointments}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              + Neuer Termin
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigateDate(-1)} className="rounded-xl border border-slate-200 px-3 py-2 text-slate-600 hover:bg-slate-50">
            ←
          </button>
          <button onClick={() => setSelectedDate(today)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Heute
          </button>
          <button onClick={() => navigateDate(1)} className="rounded-xl border border-slate-200 px-3 py-2 text-slate-600 hover:bg-slate-50">
            →
          </button>
        </div>
        <p className="text-lg font-semibold text-slate-900">{formatViewLabel(viewMode, selectedDate)}</p>
      </div>

      {!loading && appointments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Keine Termine in diesem Zeitraum. Mit den Pfeilen wechseln Sie zum vorherigen oder nächsten Zeitraum, oder Sie legen direkt einen neuen Termin an.
        </div>
      ) : null}

      {!loading && viewMode !== 'month' && (timeRange.hasEarlyAppointments || timeRange.hasLateAppointments) ? (
        <div className="flex flex-wrap gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {timeRange.hasEarlyAppointments ? <span>Frühe Termine sichtbar ab {minutesToTime(timeRange.startMinutes)}.</span> : null}
          {timeRange.hasLateAppointments ? <span>Späte Termine sichtbar bis {minutesToTime(timeRange.endMinutes)}.</span> : null}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[45vh] items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm">
          Kalender wird geladen…
        </div>
      ) : null}

      {!loading && viewMode === 'day' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {isAllTherapistsView ? (
            <div
              className="grid border-b border-slate-200 bg-slate-50"
              style={{ gridTemplateColumns: `88px repeat(${Math.max(therapistLanes.length, 1)}, minmax(0, 1fr))` }}
            >
              <span className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Zeit</span>
              {therapistLanes.map((lane) => (
                <span
                  key={lane.key}
                  className="border-l border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {lane.label}
                </span>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-[88px_1fr] border-b border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Zeit</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Terminplan</span>
            </div>
          )}
          <div className="divide-y divide-slate-100">
            {timeSlots.map((time) => {
              if (isAllTherapistsView) {
                return (
                  <div
                    key={time}
                    className="grid"
                    style={{ gridTemplateColumns: `88px repeat(${Math.max(therapistLanes.length, 1)}, minmax(0, 1fr))` }}
                  >
                    <div className="border-r border-slate-100 bg-slate-50 px-4 py-3 text-right font-mono text-sm text-slate-500">{time}</div>
                    {therapistLanes.map((lane) => {
                      const appointment = appointmentForSlot(selectedDate, time, lane.therapistId);
                      const isStart = appointment?.time_start === time;

                      return (
                        <div key={`${time}-${lane.key}`} className="min-h-[76px] border-l border-slate-100 p-2">
                          {appointment && isStart ? (
                            <div className="space-y-2">
                              {renderAppointmentCard(appointment)}
                              <div className="flex gap-2">
                                <button onClick={() => openEditModal(appointment)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 hover:bg-slate-200">
                                  Bearbeiten
                                </button>
                                <button
                                  onClick={() => setConfirmAction({ message: 'Termin wirklich absagen?', onConfirm: () => void cancelAppointment(appointment.id!) })}
                                  className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100"
                                >
                                  Absagen
                                </button>
                              </div>
                            </div>
                          ) : !appointment ? (
                            <button
                              onClick={() => openCreateModal(selectedDate, time, lane.therapistId)}
                              className="flex h-full min-h-[60px] w-full items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm font-medium text-slate-500 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                            >
                              + Termin um {time}
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                );
              }

              const appointment = appointmentForSlot(selectedDate, time);
              const isStart = appointment?.time_start === time;
              return (
                <div key={time} className="grid grid-cols-[88px_1fr]">
                  <div className="border-r border-slate-100 bg-slate-50 px-4 py-3 text-right font-mono text-sm text-slate-500">{time}</div>
                  <div className="min-h-[76px] p-2">
                    {appointment && isStart ? (
                      <div className="flex items-start gap-2">
                        <div className="flex-1">{renderAppointmentCard(appointment)}</div>
                        <button onClick={() => openEditModal(appointment)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 hover:bg-slate-200">
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => setConfirmAction({ message: 'Termin wirklich absagen?', onConfirm: () => void cancelAppointment(appointment.id!) })}
                          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100"
                        >
                          Absagen
                        </button>
                      </div>
                    ) : !appointment ? (
                      <button
                        onClick={() => openCreateModal(selectedDate, time)}
                        className="flex h-full min-h-[60px] w-full items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm font-medium text-slate-500 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                      >
                        + Termin um {time}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && viewMode === 'week' && (
        <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="min-w-[1100px]">
            {isAllTherapistsView ? (
              <>
                <div
                  className="grid border-b border-slate-200 bg-slate-50"
                  style={{ gridTemplateColumns: `88px repeat(${weekDays.length * Math.max(therapistLanes.length, 1)}, minmax(0, 1fr))` }}
                >
                  <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Zeit</div>
                  {weekDays.map((day) => {
                    const dateStr = toLocalDateStr(day);
                    const isToday = dateStr === today;
                    return (
                      <div
                        key={dateStr}
                        className={`border-l border-slate-200 px-4 py-3 ${isToday ? 'bg-blue-50' : ''}`}
                        style={{ gridColumn: `span ${Math.max(therapistLanes.length, 1)} / span ${Math.max(therapistLanes.length, 1)}` }}
                      >
                        <p className="text-sm font-semibold text-slate-900">{day.toLocaleDateString('de-AT', { weekday: 'long' })}</p>
                        <p className={`text-sm ${isToday ? 'font-semibold text-blue-700' : 'text-slate-500'}`}>
                          {day.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div
                  className="grid border-b border-slate-200 bg-slate-50/80"
                  style={{ gridTemplateColumns: `88px repeat(${weekDays.length * Math.max(therapistLanes.length, 1)}, minmax(0, 1fr))` }}
                >
                  <div />
                  {weekDays.flatMap((day) => {
                    const dateStr = toLocalDateStr(day);
                    return therapistLanes.map((lane) => (
                      <div key={`${dateStr}-${lane.key}`} className="border-l border-slate-200 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {lane.label}
                      </div>
                    ));
                  })}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-[88px_repeat(7,minmax(0,1fr))] border-b border-slate-200 bg-slate-50">
                <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Zeit</div>
                {weekDays.map((day) => {
                  const dateStr = toLocalDateStr(day);
                  const isToday = dateStr === today;
                  return (
                    <div key={dateStr} className={`border-l border-slate-200 px-4 py-3 ${isToday ? 'bg-blue-50' : ''}`}>
                      <p className="text-sm font-semibold text-slate-900">{day.toLocaleDateString('de-AT', { weekday: 'long' })}</p>
                      <p className={`text-sm ${isToday ? 'font-semibold text-blue-700' : 'text-slate-500'}`}>
                        {day.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="divide-y divide-slate-100">
              {timeSlots.map((time) => {
                if (isAllTherapistsView) {
                  return (
                    <div
                      key={time}
                      className="grid"
                      style={{ gridTemplateColumns: `88px repeat(${weekDays.length * Math.max(therapistLanes.length, 1)}, minmax(0, 1fr))` }}
                    >
                      <div className="bg-slate-50 px-4 py-3 text-right font-mono text-sm text-slate-500">{time}</div>
                      {weekDays.flatMap((day) => {
                        const dateStr = toLocalDateStr(day);
                        return therapistLanes.map((lane) => {
                          const appointment = appointmentForSlot(dateStr, time, lane.therapistId);
                          const isStart = appointment?.time_start === time;

                          return (
                            <div key={`${dateStr}-${time}-${lane.key}`} className="min-h-[78px] border-l border-slate-100 p-2">
                              {appointment && isStart ? (
                                renderAppointmentCard(appointment, true)
                              ) : !appointment ? (
                                <button
                                  onClick={() => openCreateModal(dateStr, time, lane.therapistId)}
                                  className="flex h-full min-h-[60px] w-full items-center justify-center rounded-xl border border-dashed border-transparent text-slate-300 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                                >
                                  +
                                </button>
                              ) : null}
                            </div>
                          );
                        });
                      })}
                    </div>
                  );
                }

                return (
                  <div key={time} className="grid grid-cols-[88px_repeat(7,minmax(0,1fr))]">
                    <div className="bg-slate-50 px-4 py-3 text-right font-mono text-sm text-slate-500">{time}</div>
                    {weekDays.map((day) => {
                      const dateStr = toLocalDateStr(day);
                      const appointment = appointmentForSlot(dateStr, time);
                      const isStart = appointment?.time_start === time;
                      return (
                        <div key={`${dateStr}-${time}`} className="min-h-[78px] border-l border-slate-100 p-2">
                          {appointment && isStart ? (
                            renderAppointmentCard(appointment, true)
                          ) : !appointment ? (
                            <button
                              onClick={() => openCreateModal(dateStr, time)}
                              className="flex h-full min-h-[60px] w-full items-center justify-center rounded-xl border border-dashed border-transparent text-slate-300 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                            >
                              +
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!loading && viewMode === 'month' && (
        <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="min-w-[1100px]">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((label) => (
                <div key={label} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {monthGrid.map(({ date, currentMonth }) => {
                const dateStr = toLocalDateStr(date);
                const dayAppointments = getAppointmentsForDate(dateStr);
                const isToday = dateStr === today;

                return (
                  <div key={dateStr} className={`min-h-[150px] border-b border-r border-slate-100 p-3 ${currentMonth ? 'bg-white' : 'bg-slate-50/80'}`}>
                    <div className="mb-2 flex items-center justify-between">
                      <button
                        onClick={() => openCreateModal(dateStr)}
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                          isToday ? 'bg-blue-600 text-white' : currentMonth ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-400'
                        }`}
                      >
                        {date.getDate()}
                      </button>
                      <button onClick={() => openCreateModal(dateStr)} className="rounded-lg px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-100 hover:text-blue-600">
                        +
                      </button>
                    </div>

                    <div className="space-y-2">
                      {dayAppointments.slice(0, 3).map((appointment) => (
                        <div key={appointment.id}>
                          {renderAppointmentCard(appointment, true)}
                        </div>
                      ))}
                      {dayAppointments.length > 3 && (
                        <p className="px-2 text-xs font-medium text-slate-500">+ {dayAppointments.length - 3} weitere Termine</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingAppointment ? 'Termin bearbeiten' : 'Termin anlegen'} size="lg">
        <form onSubmit={submitAppointment} className="space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Patient/in</label>
              <select
                required
                value={formData.patient_id}
                onChange={(event) => setFormData((current) => ({ ...current, patient_id: event.target.value }))}
                disabled={patientsLoading || Boolean(patientsError)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">
                  {patientsLoading ? 'Patient:innen werden geladen…' : patientsError ? 'Patient:innen konnten nicht geladen werden' : 'Bitte wählen…'}
                </option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name}
                  </option>
                ))}
              </select>
              {patientsError ? <p className="mt-2 text-xs text-red-600">{patientsError}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Therapeut/in</label>
              <select
                value={formData.therapist_id}
                onChange={(event) => setFormData((current) => ({ ...current, therapist_id: event.target.value }))}
                disabled={therapistsLoading || Boolean(therapistsError)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">
                  {therapistsLoading ? 'Therapeut:innen werden geladen…' : therapistsError ? 'Therapeut:innen konnten nicht geladen werden' : 'Nicht zugeordnet'}
                </option>
                {therapists.map((therapist) => (
                  <option key={therapist.id} value={therapist.id}>
                    {therapist.name}
                  </option>
                ))}
              </select>
              {therapistsError ? <p className="mt-2 text-xs text-red-600">{therapistsError}</p> : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Datum</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(event) => setFormData((current) => ({ ...current, date: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Von</label>
              <input
                type="time"
                required
                value={formData.time_start}
                onChange={(event) => setFormData((current) => ({ ...current, time_start: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Bis</label>
              <input
                type="time"
                required
                value={formData.time_end}
                onChange={(event) => setFormData((current) => ({ ...current, time_end: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Behandlungsart</label>
              <select
                value={formData.treatment_type}
                onChange={(event) => setFormData((current) => ({ ...current, treatment_type: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {treatmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">SMS-Reminder</label>
              <select
                value={formData.sms_reminder}
                onChange={(event) => setFormData((current) => ({ ...current, sms_reminder: Number(event.target.value) as 0 | 1 | 2 | 3 }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value={0}>Keine Erinnerung</option>
                <option value={2}>Automatisch planen</option>
                <option value={1}>Bereits versendet</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notizen</label>
            <textarea
              value={formData.notes}
              onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))}
              rows={4}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Hinweise zur Behandlung, Raum, interne Notizen …"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            {editingAppointment?.id ? (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmAction({ message: 'Termin wirklich löschen?', onConfirm: () => void deleteAppointment(editingAppointment.id!) })}
                  className="rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
                >
                  Löschen
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction({ message: 'Termin wirklich absagen?', onConfirm: () => void cancelAppointment(editingAppointment.id!) })}
                  className="rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                >
                  Absagen
                </button>
              </>
            ) : null}
            <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Abbrechen
            </button>
            <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              {editingAppointment ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(confirmAction)}
        message={confirmAction?.message ?? ''}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          const action = confirmAction?.onConfirm;
          setConfirmAction(null);
          action?.();
        }}
        confirmText="Bestätigen"
      />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PageHeader } from '../components/ui/PageHeader';
import { showToast } from '../components/ui';
import { apiFetch } from '../lib/api';
import { Appointment, Patient } from '../types';

type ViewMode = 'day' | 'week' | 'month';

type CalendarProps = {
  openCreateModal?: boolean;
  onCreateModalOpened?: () => void;
};

const formControlClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100';

const monoFormControlClassName = `${formControlClassName} font-mono`;

export default function Calendar({ openCreateModal = false, onCreateModalOpened }: CalendarProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [showModal, setShowModal] = useState(false);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [treatmentNotes, setTreatmentNotes] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [nextAppointmentDate, setNextAppointmentDate] = useState('');
  const [treatmentDraftSaved, setTreatmentDraftSaved] = useState(false);

  const [formData, setFormData] = useState({
    patient_id: '',
    date: selectedDate,
    time_start: '09:00',
    time_end: '10:00',
    treatment_type: 'Physiotherapie',
    notes: '',
    sms_reminder: 0
  });

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
  }, [selectedDate, viewMode]);

  useEffect(() => {
    if (openCreateModal) {
      openModal();
      onCreateModalOpened?.();
    }
  }, [openCreateModal, patients]);

  const fetchAppointments = async () => {
    try {
      const res = await apiFetch(`/api/appointments?date=${selectedDate}&view=${viewMode}`);
      const data = await res.json();
      if (data.success) {
        setAppointments(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await apiFetch('/api/patients');
      const data = await res.json();
      if (data.success) {
        setPatients(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingAppointment 
        ? `/api/appointments/${editingAppointment.id}` 
        : '/api/appointments';
      const method = editingAppointment ? 'PUT' : 'POST';
      
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (data.success) {
        await fetchAppointments();
        setShowModal(false);
        showToast(editingAppointment ? 'Termin aktualisiert.' : 'Termin erstellt.', 'success');
      } else {
        showToast(data.error || 'Fehler beim Speichern', 'error');
      }
    } catch {
      showToast('Fehler beim Speichern', 'error');
    }
  };

  // Delete handled via cancel for now - can be re-enabled if needed
  // const handleDelete = async (id: number) => { ... };

  const handleCancel = async (id: number) => {
    try {
      const res = await apiFetch(`/api/appointments/${id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchAppointments();
        setAppointmentToCancel(null);
        showToast('Termin abgesagt.', 'success');
      } else {
        showToast(data.error || 'Fehler beim Absagen', 'error');
      }
    } catch {
      showToast('Fehler beim Absagen', 'error');
    }
  };

  const openModal = (apt?: Appointment) => {
    if (apt) {
      setEditingAppointment(apt);
      setFormData({
        patient_id: String(apt.patient_id),
        date: apt.date,
        time_start: apt.time_start,
        time_end: apt.time_end,
        treatment_type: apt.treatment_type,
        notes: apt.notes || '',
        sms_reminder: apt.sms_reminder
      });
    } else {
      setEditingAppointment(null);
      setFormData({
        patient_id: patients[0]?.id ? String(patients[0].id) : '',
        date: selectedDate,
        time_start: '09:00',
        time_end: '10:00',
        treatment_type: 'Physiotherapie',
        notes: '',
        sms_reminder: 0
      });
    }
    setShowModal(true);
  };

  const openTreatmentModal = (apt: Appointment) => {
    setEditingAppointment(apt);
    setTreatmentNotes(apt.treatment_notes || '');

    const services = Array.isArray(apt.treatment_services)
      ? apt.treatment_services
      : typeof apt.treatment_services === 'string' && apt.treatment_services.trim().length > 0
        ? (() => {
            try {
              return JSON.parse(apt.treatment_services) as string[];
            } catch {
              return [];
            }
          })()
        : [];

    setSelectedServices(services);
    setNextAppointmentDate(apt.next_appointment_date || '');
    setTreatmentDraftSaved(false);
    setShowTreatmentModal(true);
  };

  const toggleService = (service: string) => {
    setSelectedServices((current) =>
      current.includes(service) ? current.filter((entry) => entry !== service) : [...current, service]
    );
  };

  const saveTreatmentDraft = async () => {
    if (!editingAppointment?.id) return;

    try {
      const res = await apiFetch(`/api/appointments/${editingAppointment.id}/treatment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treatment_notes: treatmentNotes,
          treatment_services: selectedServices,
          next_appointment_date: nextAppointmentDate,
        })
      });

      const data = await res.json();
      if (!data.success) {
        showToast(data.error || 'Fehler beim Speichern der Behandlung', 'error');
        return;
      }

      await fetchAppointments();
      setTreatmentDraftSaved(true);
      setTimeout(() => setTreatmentDraftSaved(false), 2000);
      setShowTreatmentModal(false);
      showToast('Behandlung gespeichert.', 'success');
    } catch {
      showToast('Fehler beim Speichern der Behandlung', 'error');
    }
  };

  const navigateDate = (direction: number) => {
    const date = new Date(selectedDate);
    if (viewMode === 'week') {
      date.setDate(date.getDate() + (direction * 7));
    } else if (viewMode === 'month') {
      date.setMonth(date.getMonth() + direction);
    } else {
      date.setDate(date.getDate() + direction);
    }
    setSelectedDate(date.toISOString().slice(0, 10));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-AT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Generate time slots from 07:00 to 20:00
  const timeSlots = Array.from({ length: 27 }, (_, i) => {
    const hour = Math.floor(i / 2) + 7;
    const minutes = (i % 2) * 30;
    return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  });

  const getAppointmentForSlot = (time: string) => {
    return appointments.find(apt => {
      const start = apt.time_start;
      const end = apt.time_end;
      return time >= start && time < end;
    });
  };

  // Helper: get Monday of the week containing a date
  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun, 1=Mon, ...
    const diff = day === 0 ? -6 : 1 - day; // Adjust Sunday to be end of week
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Helper: get calendar grid days for month view (includes prev/next month days)
  const getMonthCalendarDays = (yearMonth: string): Array<{ date: Date; isCurrentMonth: boolean }> => {
    const [year, month] = yearMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startDay = firstDay.getDay(); // 0=Sun
    const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

    // Adjust start: Monday-based (Mon=0), so shift Sunday to end
    const offset = startDay === 0 ? 6 : startDay - 1;

    // Previous month days
    for (let i = offset - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, -i);
      days.push({ date: d, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month - 1, i), isCurrentMonth: true });
    }

    // Next month days to fill grid (always 6 rows × 7 cols = 42 cells)
    let nextDay = 1;
    while (days.length < 42) {
      days.push({ date: new Date(year, month, nextDay++), isCurrentMonth: false });
    }

    return days;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-secondary">Laden...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Behandlungen"
        description={`${appointments.length} Termine`}
        badge={<Badge variant="info">{viewMode === 'day' ? 'Tag' : viewMode === 'week' ? 'Woche' : 'Monat'}</Badge>}
        actions={
          <div className="flex gap-2">
          {/* View Mode Toggle */}
          <div className="bg-white border border-gray-200 rounded-lg p-1 flex">
            <Button
              onClick={() => setViewMode('day')}
              size="sm"
              variant={viewMode === 'day' ? 'primary' : 'ghost'}
            >
              Tag
            </Button>
            <Button
              onClick={() => setViewMode('week')}
              size="sm"
              variant={viewMode === 'week' ? 'primary' : 'ghost'}
            >
              Woche
            </Button>
            <Button
              onClick={() => setViewMode('month')}
              size="sm"
              variant={viewMode === 'month' ? 'primary' : 'ghost'}
            >
              Monat
            </Button>
          </div>
          <Button onClick={() => openModal()}>
            + Neuer Termin
          </Button>
          </div>
        }
      />

      {/* Date Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <Button
            onClick={() => navigateDate(-1)}
            size="icon"
            variant="ghost"
          >
            ←
          </Button>
          <div className="text-center">
            <span className="font-medium text-lg">{formatDate(selectedDate)}</span>
          </div>
          <Button
            onClick={() => navigateDate(1)}
            size="icon"
            variant="ghost"
          >
            →
          </Button>
        </div>
      </div>

      {/* Day View - Time Slots */}
      {viewMode === 'day' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {timeSlots.map((time) => {
              const apt = getAppointmentForSlot(time);
              const isStart = apt?.time_start === time;
              const isHour = time.endsWith(':00');
              const isOccupied = apt && !isStart;
              
              return (
                <div key={time} className={`flex ${isHour ? 'min-h-[52px]' : 'min-h-[40px]'} ${isOccupied ? 'bg-blue-50/40' : ''}`}>
                  <div className={`w-16 flex-shrink-0 pr-3 text-right flex items-start ${isHour ? 'pt-2.5' : 'pt-1.5'}`}>
                    {isHour && (
                      <span className="font-mono text-xs font-semibold text-slate-500">{time}</span>
                    )}
                  </div>
                  <div className={`flex-1 ${isHour ? 'py-2' : 'py-1'} pr-3 ${isHour ? 'border-t border-slate-200' : 'border-t border-slate-100'}`}>
                    {apt ? (
                      isStart ? (
                        <div className="border-l-4 border-primary bg-blue-50 px-3 py-2 rounded-r-lg">
                          <div className="flex justify-between items-center gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 truncate">{apt.patient_name}</p>
                              <p className="text-sm text-slate-500">{apt.treatment_type}</p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="font-mono text-xs text-primary">{apt.time_start}–{apt.time_end}</span>
                              {apt.sms_reminder === 1 && <span className="text-green-500" title="SMS aktiv">✓</span>}
                              <Button
                                onClick={() => openTreatmentModal(apt)}
                                size="sm"
                              >
                                Behandeln
                              </Button>
                              <Button
                                onClick={() => openModal(apt)}
                                size="icon"
                                variant="ghost"
                              >
                                ✏️
                              </Button>
                              <Button
                                onClick={() => setAppointmentToCancel(apt)}
                                size="icon"
                                variant="ghost"
                                className="text-red-500 hover:bg-red-50 hover:text-red-600"
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                          {apt.notes && <p className="text-xs text-slate-400 mt-1 truncate">{apt.notes}</p>}
                        </div>
                      ) : null
                    ) : (
                      <button
                        onClick={() => { setFormData({ ...formData, date: selectedDate, time_start: time }); openModal(); }}
                        className="group w-full text-left rounded-lg px-3 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-50 hover:text-primary"
                      >
                        {isHour ? '+ Termin' : ''}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View - Simple Grid */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
              <div className="p-2 border-r border-gray-200 w-20">Zeit</div>
              {Array.from({ length: 7 }, (_, i) => {
                const weekStart = getWeekStart(new Date(selectedDate + 'T00:00:00'));
                weekStart.setDate(weekStart.getDate() + i);
                const isToday = weekStart.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
                return (
                  <div key={i} className={`p-2 border-r border-gray-200 text-center ${isToday ? 'bg-blue-100' : ''}`}>
                    <div className="font-medium">{weekStart.toLocaleDateString('de-AT', { weekday: 'short' })}</div>
                    <div className={`text-sm ${isToday ? 'text-primary font-bold' : 'text-text-secondary'}`}>{weekStart.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })}</div>
                  </div>
                );
              })}
            </div>
            {timeSlots.slice(0, 20).map((time) => (
              <div key={time} className="grid grid-cols-8 border-b border-gray-100">
                <div className="p-2 border-r border-gray-200 w-20 text-right font-mono text-sm text-text-secondary">
                  {time}
                </div>
                {Array.from({ length: 7 }, (_, i) => {
                  const weekStart = getWeekStart(new Date(selectedDate + 'T00:00:00'));
                  weekStart.setDate(weekStart.getDate() + i);
                  const dateStr = weekStart.toISOString().slice(0, 10);
                  // Match appointments that span this time slot on this day (not just start at slot time)
                  const aptOnDay = appointments.find(apt => apt.date === dateStr && time >= apt.time_start && time < apt.time_end);
                  return (
                    <div key={i} className="p-1 border-r border-gray-200 min-h-[40px]">
                      {aptOnDay ? (
                        <div
                          className="bg-blue-50 border-l-2 border-primary p-1 rounded text-xs cursor-pointer hover:bg-blue-100"
                          onClick={() => openModal(aptOnDay)}
                        >
                          <div className="font-medium truncate">{aptOnDay.patient_name || 'Patient'}</div>
                          <div className="text-text-secondary truncate">{aptOnDay.treatment_type}</div>
                          <div className="text-xs text-primary">{aptOnDay.time_start}-{aptOnDay.time_end}</div>
                        </div>
                      ) : (
                        <Button
                          onClick={() => { setFormData({ ...formData, date: dateStr, time_start: time }); openModal(); }}
                          size="sm"
                          variant="ghost"
                          className="h-full w-full text-lg text-gray-300 hover:text-primary"
                        >
                          +
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Month View - Calendar Grid with proper week alignment */}
      {viewMode === 'month' && (() => {
        const yearMonth = selectedDate.slice(0, 7);
        const calendarDays = getMonthCalendarDays(yearMonth);
        const todayStr = new Date().toISOString().slice(0, 10);
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-auto">
            <div className="min-w-[1000px]">
              <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
                  <div key={day} className="p-2 border-r border-gray-200 font-medium text-center">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calendarDays.map(({ date, isCurrentMonth }, i) => {
                  const dateStr = date.toISOString().slice(0, 10);
                  const dayApts = appointments.filter(a => a.date === dateStr);
                  const isToday = dateStr === todayStr;
                  return (
                    <div
                      key={i}
                      className={`border-r border-b border-gray-200 p-1 min-h-[100px] ${!isCurrentMonth ? 'bg-gray-100' : ''}`}
                    >
                      <div className={`text-right text-sm mb-1 ${isToday ? 'font-bold text-primary bg-blue-200 rounded-full w-6 h-6 flex items-center justify-center ml-auto' : isCurrentMonth ? 'text-text-primary' : 'text-gray-400'}`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayApts.slice(0, 3).map(apt => (
                          <div
                            key={apt.id}
                            className={`border-l-2 px-1 py-0.5 rounded text-xs cursor-pointer hover:opacity-80 truncate ${isCurrentMonth ? 'bg-blue-100 border-primary' : 'bg-gray-200 border-gray-400'}`}
                            onClick={() => openModal(apt)}
                            title={`${apt.time_start}-${apt.time_end} | ${apt.patient_name} | ${apt.treatment_type}`}
                          >
                            <span className="font-medium">{apt.time_start}</span>{' '}
                            <span className="truncate">{apt.patient_name?.split(' ')[1] || apt.patient_name}</span>
                            <span className="block text-[10px] text-text-secondary truncate">{apt.treatment_type}</span>
                          </div>
                        ))}
                        {dayApts.length > 3 && (
                          <div className="text-xs text-text-secondary text-center">+{dayApts.length - 3} mehr</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* New/Edit Appointment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-text-primary">
                {editingAppointment ? 'Termin bearbeiten' : 'Neuer Termin'}
              </h3>
            </div>
            <form id="appointment-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Patient *</label>
                <select
                  required
                  value={formData.patient_id}
                  onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                  className={formControlClassName}
                >
                  <option value="">Patient auswählen...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Datum *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className={formControlClassName}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Behandlungsart</label>
                  <select
                    value={formData.treatment_type}
                    onChange={(e) => setFormData({ ...formData, treatment_type: e.target.value })}
                    className={formControlClassName}
                  >
                    <option value="Physiotherapie">Physiotherapie</option>
                    <option value="Massage">Massage</option>
                    <option value="Training">Training</option>
                    <option value="Beratung">Beratung</option>
                    <option value="Folgekontrolle">Folgekontrolle</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Von *</label>
                  <input
                    type="time"
                    required
                    value={formData.time_start}
                    onChange={(e) => setFormData({ ...formData, time_start: e.target.value })}
                    className={monoFormControlClassName}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Bis *</label>
                  <input
                    type="time"
                    required
                    value={formData.time_end}
                    onChange={(e) => setFormData({ ...formData, time_end: e.target.value })}
                    className={monoFormControlClassName}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Erinnerung</label>
                <select
                  value={formData.sms_reminder}
                  onChange={(e) => setFormData({ ...formData, sms_reminder: parseInt(e.target.value) })}
                  className={formControlClassName}
                >
                  <option value="0">Keine</option>
                  <option value="1">SMS (24h vorher)</option>
                  <option value="2">SMS + Email</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Notizen</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Organisatorisches, Besonderheiten..."
                  className={formControlClassName}
                />
              </div>
            </form>
            <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0 flex gap-3">
              <Button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1"
                variant="outline"
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                form="appointment-form"
                className="flex-1"
              >
                {editingAppointment ? 'Speichern' : 'Erstellen'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Treatment Modal - Like Synaptos "Behandlung durchführen" */}
      {showTreatmentModal && editingAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-text-primary">
                Behandlung: {editingAppointment.patient_name}
              </h3>
              <p className="text-sm text-text-secondary">
                {editingAppointment.date} | {editingAppointment.time_start} - {editingAppointment.time_end} | {editingAppointment.treatment_type}
              </p>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex gap-4">
                  <button className="border-b-2 border-primary pb-2 font-medium text-primary">
                    Behandlung
                  </button>
                  <button className="border-b-2 border-transparent pb-2 hover:border-gray-300">
                    Dokumente
                  </button>
                  <button className="border-b-2 border-transparent pb-2 hover:border-gray-300">
                    Finanzen
                  </button>
                </nav>
              </div>

              {/* Treatment Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Behandlungsverlauf</label>
                  <textarea
                    rows={4}
                    value={treatmentNotes}
                    onChange={(e) => setTreatmentNotes(e.target.value)}
                    placeholder="Behandlung dokumentieren..."
                    className={formControlClassName}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Leistungen</label>
                  <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span>Manuelle Therapie (MT)</span>
                      <input type="checkbox" checked={selectedServices.includes('MT')} onChange={() => toggleService('MT')} className="rounded" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Krankengymnastik (KG)</span>
                      <input type="checkbox" checked={selectedServices.includes('KG')} onChange={() => toggleService('KG')} className="rounded" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>MLD</span>
                      <input type="checkbox" checked={selectedServices.includes('MLD')} onChange={() => toggleService('MLD')} className="rounded" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Nächster Termin</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={nextAppointmentDate}
                      onChange={(e) => setNextAppointmentDate(e.target.value)}
                      className={formControlClassName}
                    />
                    <Button
                      type="button"
                      onClick={saveTreatmentDraft}
                    >
                      Vormerken
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0 flex gap-3">
              <Button
                onClick={() => setShowTreatmentModal(false)}
                className="flex-1"
                variant="outline"
              >
                Schließen
              </Button>
              <Button
                onClick={saveTreatmentDraft}
                className="flex-1"
              >
                {treatmentDraftSaved ? '✓ Gespeichert' : 'Behandlung speichern'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={appointmentToCancel !== null}
        title="Termin absagen?"
        description={
          appointmentToCancel ? (
            <>
              Der Termin von <span className="font-medium text-slate-900">{appointmentToCancel.patient_name}</span> am{' '}
              <span className="font-medium text-slate-900">{appointmentToCancel.date}</span> um{' '}
              <span className="font-medium text-slate-900">{appointmentToCancel.time_start}</span> wird abgesagt.
            </>
          ) : ''
        }
        confirmLabel="Absagen"
        confirmVariant="outline"
        onCancel={() => setAppointmentToCancel(null)}
        onConfirm={() => {
          if (appointmentToCancel?.id) {
            void handleCancel(appointmentToCancel.id);
          }
        }}
      />
    </div>
  );
}

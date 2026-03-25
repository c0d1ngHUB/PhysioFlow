import { useState, useEffect } from 'react';
import { Appointment, Patient } from '../types';

type ViewMode = 'day' | 'week' | 'month';

export default function Calendar() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [showModal, setShowModal] = useState(false);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('day');

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

  const fetchAppointments = async () => {
    try {
      const res = await fetch(`/api/appointments?date=${selectedDate}&view=${viewMode}`);
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
      const res = await fetch('/api/patients');
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
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (data.success) {
        fetchAppointments();
        setShowModal(false);
      } else {
        alert(data.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      alert('Fehler beim Speichern');
    }
  };

  // Delete handled via cancel for now - can be re-enabled if needed
  // const handleDelete = async (id: number) => { ... };

  const handleCancel = async (id: number) => {
    if (!confirm('Termin absagen?')) return;
    
    try {
      const res = await fetch(`/api/appointments/${id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchAppointments();
      }
    } catch (error) {
      alert('Fehler beim Absagen');
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
    setShowTreatmentModal(true);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-secondary">Laden...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Behandlungen</h2>
          <p className="text-text-secondary">{appointments.length} Termine</p>
        </div>
        <div className="flex gap-2">
          {/* View Mode Toggle */}
          <div className="bg-surface border border-gray-200 rounded-lg p-1 flex">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded ${viewMode === 'day' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}
            >
              Tag
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded ${viewMode === 'week' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}
            >
              Woche
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded ${viewMode === 'month' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}
            >
              Monat
            </button>
          </div>
          <button
            onClick={() => openModal()}
            className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            + Neuer Termin
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="bg-surface rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateDate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ←
          </button>
          <div className="text-center">
            <span className="font-medium text-lg">{formatDate(selectedDate)}</span>
          </div>
          <button
            onClick={() => navigateDate(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            →
          </button>
        </div>
      </div>

      {/* Day View - Time Slots */}
      {viewMode === 'day' && (
        <div className="bg-surface rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {timeSlots.map((time) => {
              const apt = getAppointmentForSlot(time);
              const isStart = apt?.time_start === time;
              
              return (
                <div key={time} className="flex min-h-[60px]">
                  <div className="w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50 p-2 text-right">
                    <span className="font-mono text-sm text-text-secondary">{time}</span>
                  </div>
                  <div className="flex-1 p-2">
                    {apt ? (
                      isStart ? (
                        <div className="border-l-4 border-primary bg-blue-50 p-3 rounded-r-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-text-primary">{apt.patient_name}</p>
                              <p className="text-sm text-text-secondary">{apt.treatment_type}</p>
                              {apt.notes && <p className="text-xs text-text-secondary mt-1">{apt.notes}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm text-primary">{apt.time_start} - {apt.time_end}</span>
                              {apt.sms_reminder === 1 && <span className="text-green-500" title="SMS aktiv">✓</span>}
                              <button
                                onClick={() => openTreatmentModal(apt)}
                                className="px-3 py-1 bg-primary text-white text-sm rounded hover:bg-blue-700"
                              >
                                Behandeln
                              </button>
                              <button
                                onClick={() => openModal(apt)}
                                className="p-1 hover:bg-gray-200 rounded"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => { if (confirm('Absagen?')) handleCancel(apt.id!); }}
                                className="p-1 hover:bg-red-100 text-red-500 rounded"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null
                    ) : (
                      <button
                        onClick={() => { setFormData({ ...formData, date: selectedDate, time_start: time }); openModal(); }}
                        className="w-full h-full min-h-[44px] border-2 border-dashed border-gray-200 rounded-lg hover:border-primary/50 hover:bg-blue-50 transition-colors text-text-secondary hover:text-primary text-left px-2"
                      >
                        + Termin
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
        <div className="bg-surface rounded-lg shadow-sm border border-gray-200 overflow-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
              <div className="p-2 border-r border-gray-200 w-20">Zeit</div>
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + i);
                return (
                  <div key={i} className="p-2 border-r border-gray-200 text-center">
                    <div className="font-medium">{d.toLocaleDateString('de-AT', { weekday: 'short' })}</div>
                    <div className="text-sm text-text-secondary">{d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })}</div>
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
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + i);
                  const dateStr = d.toISOString().slice(0, 10);
                  const apt = appointments.find(a => a.date === dateStr && a.time_start === time);
                  return (
                    <div key={i} className="p-1 border-r border-gray-200 min-h-[40px]">
                      {apt ? (
                        <div 
                          className="bg-blue-50 border-l-2 border-primary p-1 rounded text-xs cursor-pointer hover:bg-blue-100"
                          onClick={() => openModal(apt)}
                        >
                          <div className="font-medium truncate">{apt.patient_name || 'Patient'}</div>
                          <div className="text-text-secondary">{apt.time_start}-{apt.time_end}</div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setFormData({ ...formData, date: dateStr, time_start: time }); openModal(); }}
                          className="w-full h-full text-gray-300 hover:text-primary text-lg"
                        >
                          +
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Month View - Simple Calendar Grid */}
      {viewMode === 'month' && (
        <div className="bg-surface rounded-lg shadow-sm border border-gray-200 overflow-auto">
          <div className="min-w-[1000px]">
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
              {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
                <div key={day} className="p-2 border-r border-gray-200 font-medium text-center">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: 35 }, (_, i) => {
                const d = new Date(selectedDate);
                d.setDate(1);
                d.setDate(d.getDate() + i - d.getDay() + 1);
                const dateStr = d.toISOString().slice(0, 10);
                const dayApts = appointments.filter(a => a.date === dateStr);
                const isToday = dateStr === new Date().toISOString().slice(0, 10);
                return (
                  <div 
                    key={i} 
                    className={`border-r border-b border-gray-200 p-1 min-h-[100px] ${isToday ? 'bg-blue-50' : ''}`}
                  >
                    <div className={`text-right ${isToday ? 'font-bold text-primary' : 'text-text-secondary'}`}>
                      {d.getDate()}
                    </div>
                    <div className="space-y-1 mt-1">
                      {dayApts.slice(0, 3).map(apt => (
                        <div 
                          key={apt.id}
                          className="bg-blue-100 border-l-2 border-primary px-1 py-0.5 rounded text-xs cursor-pointer hover:bg-blue-200 truncate"
                          onClick={() => openModal(apt)}
                        >
                          {apt.time_start} {(apt.patient_name || 'Patient').split(' ')[1]}
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
      )}

      {/* New/Edit Appointment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-surface">
              <h3 className="text-lg font-semibold text-text-primary">
                {editingAppointment ? 'Termin bearbeiten' : 'Neuer Termin'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Patient *</label>
                <select
                  required
                  value={formData.patient_id}
                  onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Behandlungsart</label>
                  <select
                    value={formData.treatment_type}
                    onChange={(e) => setFormData({ ...formData, treatment_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Bis *</label>
                  <input
                    type="time"
                    required
                    value={formData.time_end}
                    onChange={(e) => setFormData({ ...formData, time_end: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Erinnerung</label>
                <select
                  value={formData.sms_reminder}
                  onChange={(e) => setFormData({ ...formData, sms_reminder: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div className="flex gap-3 pt-4 sticky bottom-0 bg-surface border-t border-gray-200 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Treatment Modal - Like Synaptos "Behandlung durchführen" */}
      {showTreatmentModal && editingAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-surface">
              <h3 className="text-lg font-semibold text-text-primary">
                Behandlung: {editingAppointment.patient_name}
              </h3>
              <p className="text-sm text-text-secondary">
                {editingAppointment.date} | {editingAppointment.time_start} - {editingAppointment.time_end} | {editingAppointment.treatment_type}
              </p>
            </div>
            <div className="p-6 space-y-6">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex gap-4">
                  <button className="pb-2 border-b-2 border-primary font-medium text-primary">
                    Behandlung
                  </button>
                  <button className="pb-2 border-b-2 border-transparent hover:border-gray-300">
                    Dokumente
                  </button>
                  <button className="pb-2 border-b-2 border-transparent hover:border-gray-300">
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
                    placeholder="Behandlung dokumentieren..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Leistungen</label>
                  <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span>Manuelle Therapie (MT)</span>
                      <input type="checkbox" className="rounded" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Krankengymnastik (KG)</span>
                      <input type="checkbox" className="rounded" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>MLD</span>
                      <input type="checkbox" className="rounded" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Nächster Termin</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700">
                      + Termin
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-surface flex gap-3">
              <button
                onClick={() => setShowTreatmentModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
              >
                Schließen
              </button>
              <button
                onClick={() => { alert('Behandlung gespeichert!'); setShowTreatmentModal(false); }}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { showToast } from '../components/ui';
import { apiFetch } from '../lib/api';
import { Appointment, Invoice, Patient } from '../types';

type PatientsProps = {
  openCreateModal?: boolean;
  onCreateModalOpened?: () => void;
};

type PatientStatusFilter = 'active' | 'all' | 'archived';

type HistoryData = {
  appointments: Appointment[];
  invoices: Invoice[];
};

type PendingConfirmation =
  | {
      title: string;
      description: string;
      confirmLabel: string;
      action: () => void;
    }
  | null;

const formControlClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100';

const searchInputClassName = `${formControlClassName} py-3 pl-12 shadow-sm`;

const monoFormControlClassName = `${formControlClassName} font-mono`;

export default function Patients({ openCreateModal = false, onCreateModalOpened }: PatientsProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientCountsSource, setPatientCountsSource] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PatientStatusFilter>('active');
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyPatient, setHistoryPatient] = useState<Patient | null>(null);
  const [historyData, setHistoryData] = useState<HistoryData>({ appointments: [], invoices: [] });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [actionPatientId, setActionPatientId] = useState<number | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    birthdate: '',
    notes: '',
    insurance_number: '',
    address: ''
  });

  useEffect(() => {
    void fetchPatientCounts();
  }, []);

  useEffect(() => {
    void fetchPatients(statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    if (openCreateModal) {
      openModal();
      onCreateModalOpened?.();
    }
  }, [openCreateModal]);

  const fetchPatients = async (filter: PatientStatusFilter) => {
    try {
      setLoading(true);
      const query =
        filter === 'archived'
          ? '?archivedOnly=true'
          : filter === 'all'
            ? '?includeArchived=true'
            : '';
      const res = await apiFetch(`/api/patients${query}`);
      const data = await res.json();
      if (data.success) {
        setPatients(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientCounts = async () => {
    try {
      const res = await apiFetch('/api/patients?includeArchived=true');
      const data = await res.json();
      if (data.success) {
        setPatientCountsSource(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch patient counts:', error);
    }
  };

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
      const query = searchTerm.toLowerCase();

      return (
        fullName.includes(query) ||
        patient.email?.toLowerCase().includes(query) ||
        patient.phone?.includes(searchTerm)
      );
    });
  }, [patients, searchTerm, statusFilter]);

  const activePatients = filteredPatients.filter((patient) => !patient.is_archived);
  const archivedPatients = filteredPatients.filter((patient) => patient.is_archived);

  const patientCounts = useMemo(() => {
    const active = patientCountsSource.filter((patient) => !patient.is_archived).length;
    const archived = patientCountsSource.filter((patient) => patient.is_archived).length;

    return {
      active,
      archived,
      all: patientCountsSource.length,
    };
  }, [patientCountsSource]);

  const openModal = (patient?: Patient) => {
    if (patient) {
      setEditingPatient(patient);
      setFormData({
        first_name: patient.first_name,
        last_name: patient.last_name,
        phone: patient.phone || '',
        email: patient.email || '',
        birthdate: patient.birthdate || '',
        notes: patient.notes || '',
        insurance_number: patient.insurance_number || '',
        address: patient.address || ''
      });
    } else {
      setEditingPatient(null);
      setFormData({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        birthdate: '',
        notes: '',
        insurance_number: '',
        address: ''
      });
    }

    setShowModal(true);
  };

  const openHistory = async (patient: Patient) => {
    setHistoryPatient(patient);
    setShowHistory(true);
    setHistoryLoading(true);

    try {
      const res = await apiFetch(`/api/patients/${patient.id}/history`);
      const data = await res.json();
      if (data.success) {
        setHistoryData({
          appointments: data.data.appointments,
          invoices: data.data.invoices
        });
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingPatient
        ? `/api/patients/${editingPatient.id}`
        : '/api/patients';
      const method = editingPatient ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (data.success) {
        await Promise.all([
          fetchPatients(statusFilter),
          fetchPatientCounts(),
        ]);
        setShowModal(false);
        showToast(editingPatient ? 'Patient gespeichert.' : 'Patient angelegt.', 'success');
      } else {
        showToast(data.error || 'Fehler beim Speichern', 'error');
      }
    } catch {
      showToast('Fehler beim Speichern', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await apiFetch(`/api/patients/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await Promise.all([
          fetchPatients(statusFilter),
          fetchPatientCounts(),
        ]);
        if (historyPatient?.id === id) {
          setShowHistory(false);
        }
        setPendingConfirmation(null);
        showToast('Patient gelöscht.', 'success');
      } else {
        showToast(data.error || 'Fehler beim Löschen', 'error');
      }
    } catch {
      showToast('Fehler beim Löschen', 'error');
    }
  };

  const handleArchiveToggle = async (patient: Patient, nextArchivedState: boolean) => {
    const actionLabel = nextArchivedState ? 'archivieren' : 'wieder aktivieren';
    setActionPatientId(patient.id || null);

    try {
      const res = await apiFetch(`/api/patients/${patient.id}/${nextArchivedState ? 'archive' : 'unarchive'}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!data.success) {
        showToast(data.error || `Patient konnte nicht ${actionLabel} werden`, 'error');
        return;
      }

      await Promise.all([
        fetchPatients(statusFilter),
        fetchPatientCounts(),
      ]);

      if (historyPatient?.id === patient.id) {
        setHistoryPatient(data.data);
      }
      if (editingPatient?.id === patient.id) {
        setEditingPatient(data.data);
      }
      setPendingConfirmation(null);
      showToast(
        nextArchivedState ? 'Patient archiviert.' : 'Patient wieder aktiviert.',
        'success'
      );
    } catch {
      showToast(`Fehler beim ${actionLabel}`, 'error');
    } finally {
      setActionPatientId(null);
    }
  };

  const handleExport = async (patient: Patient) => {
    setActionPatientId(patient.id || null);

    try {
      const res = await apiFetch(`/api/patients/${patient.id}/export`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        showToast(data?.error || 'Export fehlgeschlagen', 'error');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = `${patient.last_name}-${patient.first_name}`.replace(/[^a-zA-Z0-9_-]+/g, '-');

      link.href = url;
      link.download = `patient-export-${safeName}-${patient.id}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Patientenexport erstellt.', 'success');
    } catch {
      showToast('Export fehlgeschlagen', 'error');
    } finally {
      setActionPatientId(null);
    }
  };

  const getPatientInitials = (patient: Patient) => {
    return `${patient.first_name[0]}${patient.last_name[0]}`.toUpperCase();
  };

  const getAvatarColor = (patient: Patient) => {
    if (patient.is_archived) {
      return 'bg-slate-100 text-slate-500';
    }

    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-green-100 text-green-700',
      'bg-purple-100 text-purple-700',
      'bg-amber-100 text-amber-700',
      'bg-pink-100 text-pink-700'
    ];
    const index = (patient.id || 0) % colors.length;
    return colors[index];
  };

  const renderPatientCard = (patient: Patient) => {
    const isBusy = actionPatientId === patient.id;

    return (
      <div
        key={patient.id}
        className={`rounded-2xl border p-5 transition-all cursor-pointer ${
          patient.is_archived
            ? 'border-slate-200 bg-slate-50/80 hover:border-slate-300'
            : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
        }`}
        onClick={() => openModal(patient)}
      >
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold ${getAvatarColor(patient)}`}>
            {getPatientInitials(patient)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">
                  {patient.first_name} {patient.last_name}
                </h3>
                {patient.is_archived && (
                  <Badge className="mt-1" variant="default">Archiviert</Badge>
                )}
              </div>
            </div>

            <div className="mt-2 space-y-1 text-sm text-gray-500">
              {patient.phone && (
                <div className="flex items-center gap-2">
                  <span>📱</span>
                  <span className="truncate">{patient.phone}</span>
                </div>
              )}
              {patient.email && (
                <div className="flex items-center gap-2">
                  <span>✉️</span>
                  <span className="truncate">{patient.email}</span>
                </div>
              )}
              {patient.birthdate && (
                <div className="flex items-center gap-2">
                  <span>🎂</span>
                  <span>{new Date(patient.birthdate).toLocaleDateString('de-AT')}</span>
                </div>
              )}
              {patient.is_archived && patient.archived_at && (
                <div className="flex items-center gap-2 text-slate-500">
                  <span>🗄️</span>
                  <span>Archiviert am {new Date(patient.archived_at).toLocaleDateString('de-AT')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          <Button
            onClick={(e) => { e.stopPropagation(); openHistory(patient); }}
            size="sm"
            variant="secondary"
          >
            Historie
          </Button>
          <Button
            onClick={(e) => { e.stopPropagation(); handleExport(patient); }}
            size="sm"
            variant="outline"
          >
            {isBusy ? 'Export…' : 'Export'}
          </Button>
          <Button
            onClick={(e) => { e.stopPropagation(); openModal(patient); }}
            size="sm"
            variant="secondary"
          >
            Bearbeiten
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              const nextArchivedState = !patient.is_archived;
              setPendingConfirmation({
                title: nextArchivedState ? 'Patient archivieren?' : 'Patient wieder aktivieren?',
                description: nextArchivedState
                  ? 'Der Patient bleibt erhalten, wird aber aus den aktiven Standardansichten entfernt.'
                  : 'Der Patient erscheint wieder in den aktiven Standardansichten.',
                confirmLabel: nextArchivedState ? 'Archivieren' : 'Aktivieren',
                action: () => {
                  void handleArchiveToggle(patient, nextArchivedState);
                },
              });
            }}
            size="sm"
            variant={patient.is_archived ? 'secondary' : 'outline'}
            className={`${
              patient.is_archived
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            {isBusy ? 'Bitte warten…' : patient.is_archived ? 'Wieder aktivieren' : 'Archivieren'}
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setPendingConfirmation({
                title: 'Patient löschen?',
                description: 'Alle zugehörigen Termine und Verknüpfungen werden ebenfalls gelöscht.',
                confirmLabel: 'Löschen',
                action: () => {
                  if (patient.id) {
                    void handleDelete(patient.id);
                  }
                },
              });
            }}
            size="sm"
            variant="ghost"
            className="ml-auto text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            Löschen
          </Button>
        </div>
      </div>
    );
  };

  const renderPatientSection = (title: string, description: string, items: Patient[]) => {
    if (items.length === 0) return null;

    return (
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-600">{title}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
          <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-500 border border-gray-200">
            {items.length} Einträge
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(renderPatientCard)}
        </div>
      </section>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Stammdaten</h2>
            <p className="text-gray-500">
              {patientCounts.active} aktiv, {patientCounts.archived} archiviert
            </p>
          </div>
          <Button
            onClick={() => openModal()}
            size="lg"
          >
            + Neuer Patient
          </Button>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <input
              type="text"
              placeholder="Patient suchen (Name, Telefon, E-Mail)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={searchInputClassName}
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setStatusFilter('active')}
              size="sm"
              variant={statusFilter === 'active' ? 'primary' : 'outline'}
              className={`${
                statusFilter === 'active' ? '' : 'text-gray-600'
              }`}
            >
              Aktiv ({patientCounts.active})
            </Button>
            <Button
              onClick={() => setStatusFilter('all')}
              size="sm"
              variant={statusFilter === 'all' ? 'primary' : 'outline'}
              className={`${
                statusFilter === 'all' ? 'bg-slate-800 hover:bg-slate-700' : 'text-gray-600'
              }`}
            >
              Alle ({patientCounts.all})
            </Button>
            <Button
              onClick={() => setStatusFilter('archived')}
              size="sm"
              variant={statusFilter === 'archived' ? 'outline' : 'outline'}
              className={`${
                statusFilter === 'archived'
                  ? 'border-amber-600 bg-amber-600 text-white hover:bg-amber-700 hover:text-white'
                  : 'text-gray-600'
              }`}
            >
              Archiv ({patientCounts.archived})
            </Button>
          </div>
        </div>
      </div>

      {statusFilter === 'all' ? (
        <div className="space-y-8">
          {renderPatientSection('Aktive Patienten', 'Standardansicht für Termin- und Rechnungsverwaltung.', activePatients)}
          {renderPatientSection('Archivierte Patienten', 'Archivierte Patienten bleiben sichtbar, aber klar getrennt.', archivedPatients)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map(renderPatientCard)}
        </div>
      )}

      {filteredPatients.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <span className="text-5xl mb-4 block">{statusFilter === 'archived' ? '🗄️' : '👤'}</span>
          <p className="text-gray-500 font-medium text-lg">
            {searchTerm ? 'Kein Patient gefunden' : statusFilter === 'archived' ? 'Keine archivierten Patienten' : 'Noch keine Patienten registriert'}
          </p>
          <p className="text-gray-400 text-sm mt-2">
            {searchTerm ? 'Versuchen Sie einen anderen Suchbegriff' : statusFilter === 'archived' ? 'Archivierte Patienten erscheinen hier getrennt von aktiven Datensätzen.' : 'Starten Sie mit dem ersten Patienten'}
          </p>
          {!searchTerm && statusFilter !== 'archived' && (
            <Button
              onClick={() => openModal()}
              className="mt-4"
            >
              + Ersten Patienten anlegen
            </Button>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingPatient ? 'Patient bearbeiten' : 'Neuer Patient'}
                  </h3>
                  {editingPatient?.is_archived && (
                    <p className="text-sm text-amber-700 mt-1">Dieser Datensatz ist aktuell archiviert.</p>
                  )}
                </div>
                {editingPatient && (
                  <Button
                    type="button"
                    onClick={() => {
                      const nextArchivedState = !editingPatient.is_archived;
                      setPendingConfirmation({
                        title: nextArchivedState ? 'Patient archivieren?' : 'Patient wieder aktivieren?',
                        description: nextArchivedState
                          ? 'Der Patient bleibt erhalten, wird aber aus den aktiven Standardansichten entfernt.'
                          : 'Der Patient erscheint wieder in den aktiven Standardansichten.',
                        confirmLabel: nextArchivedState ? 'Archivieren' : 'Aktivieren',
                        action: () => {
                          void handleArchiveToggle(editingPatient, nextArchivedState);
                        },
                      });
                    }}
                    size="sm"
                    variant={editingPatient.is_archived ? 'secondary' : 'outline'}
                    className={`${
                      editingPatient.is_archived
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    {editingPatient.is_archived ? 'Wieder aktivieren' : 'Archivieren'}
                  </Button>
                )}
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Vorname *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className={formControlClassName}
                    placeholder="Maria"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nachname *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className={formControlClassName}
                    placeholder="Schmidt"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefon</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={formControlClassName}
                    placeholder="+43 664 1234567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">E-Mail</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={formControlClassName}
                    placeholder="maria@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={formControlClassName}
                  placeholder="Musterstraße 1, 9020 Klagenfurt"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Geburtsdatum</label>
                  <input
                    type="date"
                    value={formData.birthdate}
                    onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                    className={formControlClassName}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Versicherungsnummer</label>
                  <input
                    type="text"
                    value={formData.insurance_number}
                    onChange={(e) => setFormData({ ...formData, insurance_number: e.target.value })}
                    className={monoFormControlClassName}
                    placeholder="1234567890"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notizen</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Besonderheiten, Vorerkrankungen, etc."
                  className={formControlClassName}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
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
                  className="flex-1"
                >
                  Speichern
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHistory && historyPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Patientenhistorie</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{historyPatient.first_name} {historyPatient.last_name}</span>
                    {historyPatient.is_archived && (
                      <Badge variant="default">Archiviert</Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => handleExport(historyPatient)}
                    variant="outline"
                  >
                    {actionPatientId === historyPatient.id ? 'Export…' : 'Export JSON'}
                  </Button>
                  <Button
                    onClick={() => {
                      const nextArchivedState = !historyPatient.is_archived;
                      setPendingConfirmation({
                        title: nextArchivedState ? 'Patient archivieren?' : 'Patient wieder aktivieren?',
                        description: nextArchivedState
                          ? 'Der Patient bleibt erhalten, wird aber aus den aktiven Standardansichten entfernt.'
                          : 'Der Patient erscheint wieder in den aktiven Standardansichten.',
                        confirmLabel: nextArchivedState ? 'Archivieren' : 'Aktivieren',
                        action: () => {
                          void handleArchiveToggle(historyPatient, nextArchivedState);
                        },
                      });
                    }}
                    variant={historyPatient.is_archived ? 'secondary' : 'outline'}
                    className={`${
                      historyPatient.is_archived
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    {historyPatient.is_archived ? 'Wieder aktivieren' : 'Archivieren'}
                  </Button>
                  <Button
                    onClick={() => { setShowHistory(false); openModal(historyPatient); }}
                    variant="secondary"
                  >
                    Patient bearbeiten
                  </Button>
                  <Button
                    onClick={() => setShowHistory(false)}
                    size="icon"
                    variant="outline"
                  >
                    ×
                  </Button>
                </div>
              </div>
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div className={`rounded-xl p-5 border ${
                  historyPatient.is_archived ? 'bg-slate-50 border-slate-200' : 'bg-blue-50 border-blue-200'
                }`}>
                  <h4 className={`text-sm font-semibold mb-3 uppercase tracking-wide ${
                    historyPatient.is_archived ? 'text-slate-700' : 'text-blue-700'
                  }`}>
                    Patientenstamm
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {historyPatient.phone && (
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Telefon</p>
                        <p className="text-sm font-medium text-gray-900">{historyPatient.phone}</p>
                      </div>
                    )}
                    {historyPatient.email && (
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">E-Mail</p>
                        <p className="text-sm font-medium text-gray-900">{historyPatient.email}</p>
                      </div>
                    )}
                    {historyPatient.birthdate && (
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Geburtsdatum</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(historyPatient.birthdate).toLocaleDateString('de-AT')}
                        </p>
                      </div>
                    )}
                    {historyPatient.address && (
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Adresse</p>
                        <p className="text-sm font-medium text-gray-900">{historyPatient.address}</p>
                      </div>
                    )}
                    {historyPatient.insurance_number && (
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Versicherungsnummer</p>
                        <p className="text-sm font-medium text-gray-900">{historyPatient.insurance_number}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Status</p>
                      <p className="text-sm font-medium text-gray-900">
                        {historyPatient.is_archived ? 'Archiviert' : 'Aktiv'}
                        {historyPatient.is_archived && historyPatient.archived_at
                          ? ` seit ${new Date(historyPatient.archived_at).toLocaleDateString('de-AT')}`
                          : ''}
                      </p>
                    </div>
                  </div>
                  {historyPatient.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-0.5">Notizen</p>
                      <p className="text-sm text-gray-700">{historyPatient.notes}</p>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      Termine ({historyData.appointments.length})
                    </h4>
                  </div>
                  {historyData.appointments.length > 0 ? (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Datum</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Zeit</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Behandlung</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Dokumentation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {historyData.appointments.map((appointment) => (
                            <tr key={appointment.id} className="hover:bg-blue-50/50 transition-colors align-top">
                              <td className="px-4 py-3 text-gray-900">
                                {new Date(`${appointment.date}T00:00:00`).toLocaleDateString('de-AT')}
                              </td>
                              <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                                {appointment.time_start} – {appointment.time_end}
                              </td>
                              <td className="px-4 py-3 text-gray-900">{appointment.treatment_type}</td>
                              <td className="px-4 py-3 text-gray-500 text-xs space-y-1">
                                <div>{appointment.notes || 'Keine Terminnotiz'}</div>
                                {appointment.treatment_notes && (
                                  <div className="text-gray-700">Behandlung: {appointment.treatment_notes}</div>
                                )}
                                {appointment.treatment_services && (
                                  <div className="text-gray-700">
                                    Leistungen:{' '}
                                    {Array.isArray(appointment.treatment_services)
                                      ? appointment.treatment_services.join(', ')
                                      : appointment.treatment_services}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
                      <span className="text-3xl text-gray-300">📅</span>
                      <p className="text-gray-500 text-sm mt-2">Noch keine Termine</p>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      Honorarnoten ({historyData.invoices.length})
                    </h4>
                  </div>
                  {historyData.invoices.length > 0 ? (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Rechnungsnr.</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Datum</th>
                            <th className="text-right px-4 py-3 font-semibold text-gray-600">Betrag</th>
                            <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {historyData.invoices.map((invoice) => (
                            <tr key={invoice.id} className="hover:bg-blue-50/50 transition-colors">
                              <td className="px-4 py-3 text-gray-900 font-mono text-xs">{invoice.invoice_number}</td>
                              <td className="px-4 py-3 text-gray-700">
                                {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('de-AT') : '—'}
                              </td>
                              <td className="px-4 py-3 text-gray-900 text-right font-semibold">
                                {new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(invoice.total)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  invoice.paid
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {invoice.paid ? '✓ Bezahlt' : '⏳ Offen'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
                      <span className="text-3xl text-gray-300">🧾</span>
                      <p className="text-gray-500 text-sm mt-2">Noch keine Honorarnoten</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={pendingConfirmation !== null}
        title={pendingConfirmation?.title || ''}
        description={pendingConfirmation?.description || ''}
        confirmLabel={pendingConfirmation?.confirmLabel || 'Bestätigen'}
        confirmVariant="outline"
        onCancel={() => setPendingConfirmation(null)}
        onConfirm={() => pendingConfirmation?.action()}
      />
    </div>
  );
}

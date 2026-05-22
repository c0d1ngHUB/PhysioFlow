import { useState, useEffect, useCallback } from 'react';
import { Patient } from '../types';
import { Modal, showToast, ConfirmModal, Pagination } from '../components/ui';
import { formatCurrency } from '../utils/formatting';
import { apiFetch } from '../utils/api.js';

interface PatientsProps {
  initialModal: string | null;
  onModalConsumed: () => void;
}

export default function Patients({ initialModal, onModalConsumed }: PatientsProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientsError, setPatientsError] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ onConfirm: () => void; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyPatient, setHistoryPatient] = useState<Patient | null>(null);
  const [historyData, setHistoryData] = useState<{ appointments: { id: number; date: string; time_start: string; time_end: string; treatment_type: string; notes: string }[]; invoices: { id: number; invoice_number: string; created_at: string; total: number; paid: boolean }[] }>({ appointments: [], invoices: [] });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

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
      setFormData({ first_name: '', last_name: '', phone: '', email: '', birthdate: '', notes: '', insurance_number: '', address: '' });
    }
    setShowModal(true);
  };

  // Handle initialModal from navigation store
  useEffect(() => {
    if (initialModal === 'patient') {
      openModal();
      onModalConsumed();
    }
  }, [initialModal, onModalConsumed]);

  const fetchPatients = useCallback(async () => {
    setPatientsError('');
    try {
      const res = await apiFetch(`/api/patients?page=${page}&limit=${limit}`, { credentials: 'include' });
      if (res.status === 401) return;
      const data = await res.json();
      if (data.success) {
        setPatients(data.data);
        setTotal(data.pagination?.total ?? 0);
        setTotalPages(data.pagination?.totalPages ?? 1);
        setLoading(false);
        return;
      }
      setPatients([]);
      setPatientsError(data.error || 'Patient:innen konnten nicht geladen werden.');
    } catch {
      setPatients([]);
      setPatientsError('Patient:innen konnten nicht geladen werden.');
    }
    setLoading(false);
  }, [page, limit]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const filteredPatients = patients.filter((p) => {
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) ||
      (p.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.phone?.includes(searchTerm));
  });

  const openHistory = async (patient: Patient) => {
    setHistoryPatient(patient);
    setShowHistory(true);
    setHistoryLoading(true);
    setHistoryError('');
    setHistoryData({ appointments: [], invoices: [] });
    try {
      const res = await apiFetch(`/api/patients/${patient.id}/history`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setHistoryData({ appointments: data.data.appointments, invoices: data.data.invoices });
        setHistoryLoading(false);
        return;
      }
      setHistoryError(data.error || 'Patientenhistorie konnte nicht geladen werden.');
    } catch {
      setHistoryError('Patientenhistorie konnte nicht geladen werden.');
    }
    setHistoryLoading(false);
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
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (data.success) {
        fetchPatients();
        setShowModal(false);
        showToast(editingPatient ? 'Patient aktualisiert' : 'Patient erstellt', 'success');
      } else {
        showToast(data.error || 'Fehler beim Speichern', 'error');
      }
    } catch (error) {
      showToast('Fehler beim Speichern', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmAction({
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          const res = await apiFetch(`/api/patients/${id}`, { method: 'DELETE', credentials: 'include' });
          const data = await res.json();
          if (data.success) {
            fetchPatients();
            showToast('Patient gelöscht', 'success');
          }
        } catch (error) {
          showToast('Fehler beim Löschen', 'error');
        }
      },
      message: 'Patient wirklich löschen? Alle zugehörigen Termine werden ebenfalls gelöscht.',
    });
  };

  const getPatientInitials = (p: Patient) => {
    return `${p.first_name[0]}${p.last_name[0]}`.toUpperCase();
  };

  const getAvatarColor = (p: Patient) => {
    const colors = ['bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700', 'bg-pink-100 text-pink-700'];
    const index = (p.id || 0) % colors.length;
    return colors[index];
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Stammdaten</h2>
          <p className="text-gray-500">{patients.length} Patienten registriert</p>
        </div>
        <button onClick={() => openModal()} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">+ Neuer Patient</button>
      </div>

      {/* Search */}
      <div className="relative">
        <input type="text" placeholder="Patient suchen (Name, Telefon, E-Mail)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm" />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
      </div>

      {patientsError ? (
        <div className="bg-white rounded-xl border border-red-200 p-12 text-center">
          <span className="text-5xl mb-4 block">⚠️</span>
          <p className="text-red-700 font-medium text-lg">Patient:innen konnten nicht geladen werden</p>
          <p className="text-red-600 text-sm mt-2">{patientsError}</p>
          <button onClick={() => { setLoading(true); void fetchPatients(); }} className="mt-4 px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">
            Erneut versuchen
          </button>
        </div>
      ) : (
        <>
      {/* Patient Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPatients.map((patient) => (
          <div key={patient.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer" onClick={() => openModal(patient)}>
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold ${getAvatarColor(patient)}`}>{getPatientInitials(patient)}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-lg">{patient.first_name} {patient.last_name}</h3>
                <div className="mt-2 space-y-1 text-sm text-gray-500">
                  {patient.phone && <div className="flex items-center gap-2"><span>📱</span><span className="truncate">{patient.phone}</span></div>}
                  {patient.email && <div className="flex items-center gap-2"><span>✉️</span><span className="truncate">{patient.email}</span></div>}
                  {patient.birthdate && <div className="flex items-center gap-2"><span>🎂</span><span>{new Date(patient.birthdate).toLocaleDateString('de-AT')}</span></div>}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
              <button onClick={(e) => { e.stopPropagation(); openHistory(patient); }} className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors min-h-[44px]">Historie</button>
              <button onClick={(e) => { e.stopPropagation(); openModal(patient); }} className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors min-h-[44px]">Bearbeiten</button>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(patient.id!); }} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors min-h-[44px] min-w-[44px]">🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredPatients.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <span className="text-5xl mb-4 block">👤</span>
          <p className="text-gray-500 font-medium text-lg">{searchTerm ? 'Kein Patient gefunden' : 'Noch keine Patienten registriert'}</p>
          <p className="text-gray-500 text-sm mt-2">{searchTerm ? 'Versuchen Sie einen anderen Suchbegriff' : 'Starten Sie mit dem ersten Patienten'}</p>
          {!searchTerm && <button onClick={() => openModal()} className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">+ Ersten Patienten anlegen</button>}
        </div>
      )}
        </>
      )}

      {/* Patient Edit/Create Modal — using unified Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingPatient ? 'Patient bearbeiten' : 'Neuer Patient'} size="lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Vorname *</label>
              <input type="text" required value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Maria" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nachname *</label>
              <input type="text" required value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Schmidt" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefon</label>
              <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="+43 664 1234567" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-Mail</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="maria@example.com" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse</label>
            <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Musterstraße 1, 6800 Feldkirch" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Geburtsdatum</label>
              <input type="date" value={formData.birthdate} onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Versicherungsnummer</label>
              <input type="text" value={formData.insurance_number} onChange={(e) => setFormData({ ...formData, insurance_number: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="1234567890" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notizen</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} placeholder="Besonderheiten, Vorerkrankungen, etc." className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors">Abbrechen</button>
            <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">Speichern</button>
          </div>
        </form>
      </Modal>

      {/* Patient History Modal — using unified Modal */}
      <Modal isOpen={showHistory && !!historyPatient} onClose={() => setShowHistory(false)} title="Patientenhistorie" size="full">
        {historyPatient && (
          <div className="p-6 space-y-6">
            <p className="text-sm text-gray-500">{historyPatient.first_name} {historyPatient.last_name}</p>
            <div className="flex gap-2 mb-4">
              <button onClick={() => { setShowHistory(false); openModal(historyPatient); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Bearbeiten</button>
            </div>

            {historyLoading ? (
              <div className="space-y-4">
                <div className="h-28 rounded-xl border border-gray-200 bg-gray-50 animate-pulse" />
                <div className="h-40 rounded-xl border border-gray-200 bg-gray-50 animate-pulse" />
                <div className="h-40 rounded-xl border border-gray-200 bg-gray-50 animate-pulse" />
              </div>
            ) : historyError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                <p className="font-medium text-red-800">Patientenhistorie konnte nicht geladen werden</p>
                <p className="mt-2 text-sm text-red-700">{historyError}</p>
                <button onClick={() => historyPatient && void openHistory(historyPatient)} className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-100">
                  Erneut laden
                </button>
              </div>
            ) : (
              <>
                {/* Patient Info */}
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-700 mb-3 uppercase tracking-wide">Patientenstamm</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {historyPatient.phone && <div><p className="text-xs text-gray-500 mb-0.5">Telefon</p><p className="text-sm font-medium text-gray-900">{historyPatient.phone}</p></div>}
                    {historyPatient.email && <div><p className="text-xs text-gray-500 mb-0.5">E-Mail</p><p className="text-sm font-medium text-gray-900">{historyPatient.email}</p></div>}
                    {historyPatient.birthdate && <div><p className="text-xs text-gray-500 mb-0.5">Geburtsdatum</p><p className="text-sm font-medium text-gray-900">{new Date(historyPatient.birthdate).toLocaleDateString('de-AT')}</p></div>}
                    {historyPatient.address && <div><p className="text-xs text-gray-500 mb-0.5">Adresse</p><p className="text-sm font-medium text-gray-900">{historyPatient.address}</p></div>}
                    {historyPatient.insurance_number && <div><p className="text-xs text-gray-500 mb-0.5">Versicherungsnummer</p><p className="text-sm font-medium text-gray-900">{historyPatient.insurance_number}</p></div>}
                  </div>
                  {historyPatient.notes && <div className="mt-3 pt-3 border-t border-blue-200"><p className="text-xs text-gray-500 mb-0.5">Notizen</p><p className="text-sm text-gray-700">{historyPatient.notes}</p></div>}
                </div>

                {/* Appointments */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Termine ({historyData.appointments.length})</h4>
                  {historyData.appointments.length > 0 ? (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Datum</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Zeit</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Behandlung</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Notizen</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {historyData.appointments.map((apt) => (
                            <tr key={apt.id} className="hover:bg-blue-50/50 transition-colors">
                              <td className="px-4 py-3 text-gray-900">{new Date(apt.date + 'T00:00:00').toLocaleDateString('de-AT')}</td>
                              <td className="px-4 py-3 text-gray-700 font-mono text-xs">{apt.time_start} – {apt.time_end}</td>
                              <td className="px-4 py-3 text-gray-900">{apt.treatment_type}</td>
                              <td className="px-4 py-3 text-gray-500 text-xs">{apt.notes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200"><span className="text-3xl text-gray-300">📅</span><p className="text-gray-500 text-sm mt-2">Noch keine Termine</p></div>
                  )}
                </div>

                {/* Invoices */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Honorarnoten ({historyData.invoices.length})</h4>
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
                          {historyData.invoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-blue-50/50 transition-colors">
                              <td className="px-4 py-3 text-gray-900 font-mono text-xs">{inv.invoice_number}</td>
                              <td className="px-4 py-3 text-gray-700">{new Date(inv.created_at).toLocaleDateString('de-AT')}</td>
                              <td className="px-4 py-3 text-gray-900 text-right font-semibold">{formatCurrency(inv.total)}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${inv.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{inv.paid ? '✓ Bezahlt' : '⏳ Offen'}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200"><span className="text-3xl text-gray-300">🧾</span><p className="text-gray-500 text-sm mt-2">Noch keine Honorarnoten</p></div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
      <Pagination
        page={page}
        limit={limit}
        total={total}
        totalPages={totalPages}
        onPageChange={setPage}
        onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
      />
      <ConfirmModal
        open={!!confirmAction}
        onConfirm={confirmAction?.onConfirm ?? (() => {})}
        onCancel={() => setConfirmAction(null)}
        message={confirmAction?.message ?? ''}
        variant="danger"
        confirmText="Löschen"
      />
    </div>
  );
}

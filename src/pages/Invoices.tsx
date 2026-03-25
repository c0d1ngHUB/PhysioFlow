import { useState, useEffect } from 'react';
import { Invoice, Patient, Appointment } from '../types';

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterPaid, setFilterPaid] = useState<'all' | 'paid' | 'unpaid'>('all');

  const [formData, setFormData] = useState({
    patient_id: '',
    appointment_id: '',
    units: '10',
    rate_per_unit: '50',
    description: 'Physiotherapeutische Behandlung'
  });

  useEffect(() => {
    fetchInvoices();
    fetchPatients();
  }, [filterPaid]);

  useEffect(() => {
    if (formData.patient_id) {
      fetchAppointments(formData.patient_id);
    }
  }, [formData.patient_id]);

  const fetchInvoices = async () => {
    try {
      let url = '/api/invoices';
      if (filterPaid === 'paid') url += '?paid=true';
      else if (filterPaid === 'unpaid') url += '?paid=false';
      
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setInvoices(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
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

  const fetchAppointments = async (patientId: string) => {
    try {
      const res = await fetch(`/api/appointments?patient_id=${patientId}`);
      const data = await res.json();
      if (data.success) {
        setAppointments(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          units: parseFloat(formData.units),
          rate_per_unit: parseFloat(formData.rate_per_unit)
        })
      });
      
      const data = await res.json();
      if (data.success) {
        fetchInvoices();
        setShowModal(false);
        setFormData({ patient_id: '', appointment_id: '', units: '10', rate_per_unit: '50', description: 'Physiotherapeutische Behandlung' });
      } else {
        alert(data.error || 'Fehler beim Erstellen');
      }
    } catch (error) {
      alert('Fehler beim Erstellen');
    }
  };

  const togglePaid = async (invoice: Invoice) => {
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/paid`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid: !invoice.paid })
      });
      const data = await res.json();
      if (data.success) {
        fetchInvoices();
      }
    } catch (error) {
      alert('Fehler beim Aktualisieren');
    }
  };

  const downloadPDF = (invoice: Invoice) => {
    window.open(`/api/invoices/${invoice.id}/pdf`, '_blank');
  };

  const deleteInvoice = async (id: number) => {
    if (!confirm('Honorarnote wirklich löschen?')) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchInvoices();
    } catch (error) {
      alert('Fehler beim Löschen');
    }
  };

  const totalUnpaid = invoices.filter(i => !i.paid).reduce((sum, i) => sum + i.total, 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Finanzen</h2>
          <p className="text-gray-500">{invoices.length} Honorarnoten {filterPaid === 'unpaid' && `• €${totalUnpaid.toFixed(2)} offen`}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
          + Neue Honorarnote
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <button onClick={() => setFilterPaid('all')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterPaid === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>Alle</button>
        <button onClick={() => setFilterPaid('unpaid')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterPaid === 'unpaid' ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>Offen ({invoices.filter(i => !i.paid).length})</button>
        <button onClick={() => setFilterPaid('paid')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterPaid === 'paid' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>Bezahlt</button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Offen</p>
          <p className="text-3xl font-semibold text-amber-600 mt-1">{formatCurrency(totalUnpaid)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Bezahlt (dieser Monat)</p>
          <p className="text-3xl font-semibold text-emerald-600 mt-1">{formatCurrency(invoices.filter(i => i.paid && new Date(i.created_at || '').getMonth() === new Date().getMonth()).reduce((s, i) => s + i.total, 0))}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Gesamt (alle Zeit)</p>
          <p className="text-3xl font-semibold text-blue-600 mt-1">{formatCurrency(invoices.reduce((s, i) => s + i.total, 0))}</p>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rechnung</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Betrag</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap"><span className="font-mono font-medium text-blue-600">{invoice.invoice_number}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className="font-medium text-gray-900">{invoice.patient_name}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('de-AT') : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right"><span className="font-mono font-bold text-gray-900">€ {invoice.total.toFixed(2)}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button onClick={() => togglePaid(invoice)} className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${invoice.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {invoice.paid ? '✓ Bezahlt' : '○ Offen'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => downloadPDF(invoice)} className="p-2 hover:bg-gray-100 rounded" title="PDF">📄</button>
                        <button onClick={() => deleteInvoice(invoice.id!)} className="p-2 hover:bg-red-100 text-red-600 rounded" title="Löschen">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <span className="text-4xl mb-2 block">📋</span>
            <p>{filterPaid === 'all' ? 'Noch keine Honorarnoten' : 'Keine Noten in dieser Kategorie'}</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Neue Honorarnote</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient *</label>
                <select required value={formData.patient_id} onChange={(e) => setFormData({ ...formData, patient_id: e.target.value, appointment_id: '' })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="">Patient auswählen...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                </select>
              </div>
              {formData.patient_id && appointments.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zugehöriger Termin (optional)</label>
                  <select value={formData.appointment_id} onChange={(e) => setFormData({ ...formData, appointment_id: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">Kein Termin</option>
                    {appointments.map(apt => <option key={apt.id} value={apt.id}>{apt.date} {apt.time_start} - {apt.treatment_type}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Einheiten *</label>
                  <input type="number" required step="0.5" min="0.5" value={formData.units} onChange={(e) => setFormData({ ...formData, units: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">€/Einheit *</label>
                  <input type="number" required step="0.01" min="0" value={formData.rate_per_unit} onChange={(e) => setFormData({ ...formData, rate_per_unit: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono" />
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Gesamtbetrag:</span>
                  <span className="text-3xl font-bold text-blue-900 font-mono">{formatCurrency(parseFloat(formData.units || '0') * parseFloat(formData.rate_per_unit || '0'))}</span>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">Steuerbefreit gemäß §6 Abs.1 Z 19 UStG</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leistungsbeschreibung</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="z.B. Physiotherapeutische Behandlung" />
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">Abbrechen</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Erstellen</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(amount);
}

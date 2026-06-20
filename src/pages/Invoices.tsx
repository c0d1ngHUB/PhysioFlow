import { useEffect, useMemo, useState } from 'react';
import { Appointment, Invoice, Patient } from '../types';
import { ConfirmModal, Modal, Pagination, showToast } from '../components/ui';
import { formatCurrency } from '../utils/formatting';
import { apiFetch } from '../utils/api.js';

interface InvoicesProps {
  initialModal: string | null;
  onModalConsumed: () => void;
}

const dunningBadge: Record<Invoice['dunning_level'], string> = {
  0: 'bg-slate-100 text-slate-700',
  1: 'bg-blue-100 text-blue-800',
  2: 'bg-amber-100 text-amber-800',
  3: 'bg-red-100 text-red-800',
};

const dunningLabel: Record<Invoice['dunning_level'], string> = {
  0: 'Keine Mahnung',
  1: 'Erinnerung',
  2: 'Mahnung',
  3: 'Letzte Mahnung',
};



export default function Invoices({ initialModal, onModalConsumed }: InvoicesProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterPaid, setFilterPaid] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void; title?: string; variant?: 'danger' | 'default' } | null>(null);
  const [formData, setFormData] = useState({
    patient_id: '',
    appointment_id: '',
    units: '10',
    rate_per_unit: '50',
    description: 'Physiotherapeutische Behandlung',
  });

  useEffect(() => {
    if (initialModal === 'invoice') {
      setShowModal(true);
      onModalConsumed();
    }
  }, [initialModal, onModalConsumed]);

  useEffect(() => {
    void Promise.all([fetchInvoices(), fetchPatients()]).finally(() => setLoading(false));
  }, [filterPaid, page, limit]);

  useEffect(() => {
    if (formData.patient_id) {
      void fetchAppointments(formData.patient_id);
    } else {
      setAppointments([]);
    }
  }, [formData.patient_id]);

  async function fetchInvoices() {
    try {
      const params = new URLSearchParams();
      if (filterPaid === 'paid') params.set('paid', 'true');
      if (filterPaid === 'unpaid') params.set('paid', 'false');
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await apiFetch(`/api/invoices${params.toString() ? `?${params.toString()}` : ''}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setInvoices(data.data);
        setTotal(data.pagination?.total ?? data.data.length);
        setTotalPages(data.pagination?.totalPages ?? 1);
        return;
      }

      showToast(data.error || 'Honorarnoten konnten nicht geladen werden', 'error');
    } catch {
      showToast('Honorarnoten konnten nicht geladen werden', 'error');
    }
  }

  async function fetchPatients() {
    try {
      const res = await apiFetch('/api/patients', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setPatients(data.data);
        return;
      }

      showToast(data.error || 'Patient:innen konnten nicht geladen werden', 'error');
    } catch {
      showToast('Patient:innen konnten nicht geladen werden', 'error');
    }
  }

  async function fetchAppointments(patientId: string) {
    try {
      const res = await apiFetch(`/api/appointments?patient_id=${patientId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setAppointments(data.data);
        return;
      }

      showToast(data.error || 'Termine konnten nicht geladen werden', 'error');
    } catch {
      showToast('Termine konnten nicht geladen werden', 'error');
    }
  }

  async function submitInvoice(event: React.FormEvent) {
    event.preventDefault();
    try {
      const res = await apiFetch('/api/invoices', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: Number(formData.patient_id),
          appointment_id: formData.appointment_id ? Number(formData.appointment_id) : null,
          units: Number(formData.units),
          rate_per_unit: Number(formData.rate_per_unit),
          description: formData.description,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        showToast(data.error || 'Honorarnote konnte nicht erstellt werden', 'error');
        return;
      }

      setFormData({
        patient_id: '',
        appointment_id: '',
        units: '10',
        rate_per_unit: '50',
        description: 'Physiotherapeutische Behandlung',
      });
      setShowModal(false);
      await fetchInvoices();
      showToast('Honorarnote erstellt', 'success');
    } catch {
      showToast('Honorarnote konnte nicht erstellt werden', 'error');
    }
  }

  async function togglePaid(invoice: Invoice) {
    try {
      const res = await apiFetch(`/api/invoices/${invoice.id}/paid`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid: !invoice.paid }),
      });
      const data = await res.json();
      if (!data.success) {
        showToast(data.error || 'Status konnte nicht geändert werden', 'error');
        return;
      }
      await fetchInvoices();
      showToast(!invoice.paid ? 'Als bezahlt markiert' : 'Wieder als offen markiert', 'success');
    } catch {
      showToast('Status konnte nicht geändert werden', 'error');
    }
  }

  async function escalateDunning(invoice: Invoice) {
    try {
      const res = await apiFetch(`/api/invoices/${invoice.id}/dunning/escalate`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) {
        showToast(data.error || 'Mahnstufe konnte nicht erhöht werden', 'error');
        return;
      }
      await fetchInvoices();
      showToast(`Mahnstufe erhöht: ${dunningLabel[Math.min(invoice.dunning_level + 1, 3) as Invoice['dunning_level']]}`, 'success');
    } catch {
      showToast('Mahnstufe konnte nicht erhöht werden', 'error');
    }
  }

  async function deleteInvoice(id: number) {
    try {
      const res = await apiFetch(`/api/invoices/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (!data.success) {
        showToast(data.error || 'Honorarnote konnte nicht gelöscht werden', 'error');
        return;
      }
      await fetchInvoices();
      showToast('Honorarnote gelöscht', 'success');
    } catch {
      showToast('Honorarnote konnte nicht gelöscht werden', 'error');
    }
  }

  const unpaidInvoices = useMemo(() => invoices.filter((invoice) => !invoice.paid), [invoices]);
  const openAmount = useMemo(() => unpaidInvoices.reduce((sum, invoice) => sum + invoice.total, 0), [unpaidInvoices]);
  const currentMonth = new Date().getMonth();
  const paidThisMonth = useMemo(
    () =>
      invoices
        .filter((invoice) => invoice.paid && new Date(invoice.created_at || '').getMonth() === currentMonth)
        .reduce((sum, invoice) => sum + invoice.total, 0),
    [currentMonth, invoices],
  );

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-slate-500">Laden…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Finanzen</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Honorarnoten und Mahnwesen</h2>
            <p className="mt-2 text-sm text-slate-600">
              {total === 1 ? '1 Honorarnote' : total + ' Honorarnoten'}{filterPaid === 'all' ? `, davon ${unpaidInvoices.length} auf dieser Seite offen` : ''}
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
            + Neue Honorarnote
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Offener Betrag</p>
          <p className="mt-2 text-3xl font-semibold text-amber-700">{formatCurrency(openAmount)}</p>
          <p className="mt-1 text-xs text-slate-500">{unpaidInvoices.length === 1 ? '1 offene Honorarnote' : unpaidInvoices.length + ' offene Honorarnoten'}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Bezahlt im aktuellen Monat</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">{formatCurrency(paidThisMonth)}</p>
          <p className="mt-1 text-xs text-slate-500">Abgerechneter Monatsumsatz</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Mahnfälle</p>
          <p className="mt-2 text-3xl font-semibold text-blue-700">{invoices.filter((invoice) => invoice.dunning_level > 0 && !invoice.paid).length}</p>
          <p className="mt-1 text-xs text-slate-500">Mit aktiver Mahnstufe</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        {[
          { key: 'all', label: 'Alle' },
          { key: 'unpaid', label: `Offen (${unpaidInvoices.length})` },
          { key: 'paid', label: 'Bezahlt' },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => { setFilterPaid(filter.key as 'all' | 'paid' | 'unpaid'); setPage(1); }}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              filterPaid === filter.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {invoices.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <p className="text-lg font-medium">Keine Honorarnoten vorhanden</p>
            <p className="mt-2 text-sm">Legen Sie die erste Honorarnote an, um Rechnungen und Mahnungen zu verwalten.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="md:hidden space-y-3 p-4">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="rounded-xl border border-slate-200 p-4 bg-white shadow-sm space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono text-sm font-semibold text-blue-700">{invoice.invoice_number}</p>
                      <p className="text-xs text-slate-500">{invoice.patient_name}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${invoice.paid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {invoice.paid ? 'Bezahlt' : 'Offen'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('de-AT') : '—'}</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(invoice.total)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    {!invoice.paid && invoice.dunning_level < 3 ? (
                      <button onClick={() => setConfirmAction({ title: 'Mahnstufe erhöhen', message: `Mahnstufe für Rechnung ${invoice.invoice_number || invoice.id} auf Stufe ${dunningLabel[Math.min(invoice.dunning_level + 1, 3) as Invoice['dunning_level']]} erhöhen?`, variant: 'danger', onConfirm: () => void escalateDunning(invoice) })} className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 hover:bg-amber-100 min-h-[44px]">
                        Mahnstufe +
                      </button>
                    ) : null}
                    {invoice.dunning_level > 0 ? (
                      <button onClick={() => window.open(`/api/invoices/${invoice.id}/dunning-letter.pdf`, '_blank', 'noopener,noreferrer')} className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100 min-h-[44px]">
                        Mahnbrief
                      </button>
                    ) : null}
                    <button onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, '_blank', 'noopener,noreferrer')} className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200 min-h-[44px]">
                      PDF
                    </button>
                    <button
                      onClick={() => setConfirmAction({ message: 'Honorarnote wirklich löschen?', onConfirm: () => void deleteInvoice(invoice.id!) })}
                      className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100 min-h-[44px]"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <table className="min-w-full divide-y divide-slate-200 hidden md:table">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Rechnung</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Patient/in</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Datum</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Betrag</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Zahlung</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Mahnstufe</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-mono text-sm font-semibold text-blue-700">{invoice.invoice_number}</p>
                        <p className="text-xs text-slate-500">{invoice.description}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{invoice.patient_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('de-AT') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{formatCurrency(invoice.total)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setConfirmAction({ title: invoice.paid ? 'Rechnung öffnen' : 'Rechnung bezahlen', message: invoice.paid ? `Rechnung ${invoice.invoice_number || invoice.id} wieder als offen markieren?` : `Rechnung ${invoice.invoice_number || invoice.id} als bezahlt markieren? Dies kann nicht rückgängig gemacht werden.`, variant: invoice.paid ? 'default' : 'default', onConfirm: () => void togglePaid(invoice) })}
                        className={`rounded-full px-3 py-1 text-xs font-medium min-h-[44px] min-w-[44px] ${
                          invoice.paid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {invoice.paid ? 'Bezahlt' : 'Offen'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${dunningBadge[invoice.dunning_level]}`}>
                          {dunningLabel[invoice.dunning_level]}
                        </span>
                        {invoice.dunning_date ? (
                          <span className="text-xs text-slate-500">seit {new Date(invoice.dunning_date).toLocaleDateString('de-AT')}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {!invoice.paid && invoice.dunning_level < 3 ? (
                          <button onClick={() => setConfirmAction({ title: 'Mahnstufe erhöhen', message: `Mahnstufe für Rechnung ${invoice.invoice_number || invoice.id} auf Stufe ${dunningLabel[Math.min(invoice.dunning_level + 1, 3) as Invoice['dunning_level']]} erhöhen?`, variant: 'danger', onConfirm: () => void escalateDunning(invoice) })} className="rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-100 min-h-[44px]">
                            Mahnstufe +
                          </button>
                        ) : null}
                        {invoice.dunning_level > 0 ? (
                          <button onClick={() => window.open(`/api/invoices/${invoice.id}/dunning-letter.pdf`, '_blank', 'noopener,noreferrer')} className="rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100 min-h-[44px]">
                            Mahnbrief
                          </button>
                        ) : null}
                        <button onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, '_blank', 'noopener,noreferrer')} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200 min-h-[44px]">
                          PDF
                        </button>
                        <button
                          onClick={() => setConfirmAction({ message: 'Honorarnote wirklich löschen?', onConfirm: () => void deleteInvoice(invoice.id!) })}
                          className="rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100 min-h-[44px]"
                        >
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        page={page}
        limit={limit}
        total={total}
        totalPages={totalPages}
        onPageChange={setPage}
        onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Neue Honorarnote" size="lg">
        <form onSubmit={submitInvoice} className="space-y-5 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Patient/in</label>
            <select
              required
              value={formData.patient_id}
              onChange={(event) => setFormData((current) => ({ ...current, patient_id: event.target.value, appointment_id: '' }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Bitte wählen…</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.first_name} {patient.last_name}
                </option>
              ))}
            </select>
          </div>

          {formData.patient_id && appointments.length > 0 ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Verknüpfter Termin</label>
              <select
                value={formData.appointment_id}
                onChange={(event) => setFormData((current) => ({ ...current, appointment_id: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Kein Termin</option>
                {appointments.map((appointment) => (
                  <option key={appointment.id} value={appointment.id}>
                    {appointment.date} · {appointment.time_start} · {appointment.treatment_type}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Einheiten</label>
              <input
                type="number"
                required
                min="0.5"
                step="0.5"
                value={formData.units}
                onChange={(event) => setFormData((current) => ({ ...current, units: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Satz pro Einheit</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={formData.rate_per_unit}
                onChange={(event) => setFormData((current) => ({ ...current, rate_per_unit: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-slate-600">Gesamtbetrag</p>
            <p className="mt-2 text-3xl font-semibold text-blue-900">
              {formatCurrency(Number(formData.units || 0) * Number(formData.rate_per_unit || 0))}
            </p>
            <p className="mt-2 text-xs text-slate-500">Steuerbefreit gemäß §6 Abs.1 Z 19 UStG.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Leistungsbeschreibung</label>
            <textarea
              value={formData.description}
              onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
              rows={3}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Abbrechen
            </button>
            <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Erstellen
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(confirmAction)}
        title={confirmAction?.title}
        message={confirmAction?.message ?? ''}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          const action = confirmAction?.onConfirm;
          setConfirmAction(null);
          action?.();
        }}
        confirmText="Bestätigen"
        variant={confirmAction?.variant || 'danger'}
      />
    </div>
  );
}

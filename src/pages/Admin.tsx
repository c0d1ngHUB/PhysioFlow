import { useEffect, useMemo, useState } from 'react';
import { Patient, Therapist, Voucher } from '../types';
import { ConfirmModal, Modal, showToast } from '../components/ui';

type AdminTab = 'therapists' | 'vouchers';

const therapistPalette = ['#2563EB', '#059669', '#F59E0B', '#DC2626', '#7C3AED', '#DB2777'];

export default function Admin() {
  const [tab, setTab] = useState<AdminTab>('therapists');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);

  const [therapistModalOpen, setTherapistModalOpen] = useState(false);
  const [editingTherapist, setEditingTherapist] = useState<Therapist | null>(null);
  const [therapistForm, setTherapistForm] = useState({ name: '', color: therapistPalette[0] });

  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [voucherForm, setVoucherForm] = useState({
    code: '',
    patient_id: '',
    description: '',
    value: '0',
    expires_at: '',
    used: false,
  });

  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    void Promise.all([fetchPatients(), fetchTherapists(), fetchVouchers()]).finally(() => setLoading(false));
  }, []);

  const unusedVouchers = useMemo(() => vouchers.filter((voucher) => !voucher.used), [vouchers]);

  async function fetchPatients() {
    const res = await fetch('/api/patients', { credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      setPatients(data.data);
    }
  }

  async function fetchTherapists() {
    const res = await fetch('/api/therapists', { credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      setTherapists(data.data);
    }
  }

  async function fetchVouchers() {
    const res = await fetch('/api/vouchers', { credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      setVouchers(data.data);
    }
  }

  function openTherapistModal(therapist?: Therapist) {
    setEditingTherapist(therapist ?? null);
    setTherapistForm({
      name: therapist?.name ?? '',
      color: therapist?.color ?? therapistPalette[0],
    });
    setTherapistModalOpen(true);
  }

  function openVoucherModal(voucher?: Voucher) {
    setEditingVoucher(voucher ?? null);
    setVoucherForm({
      code: voucher?.code ?? '',
      patient_id: voucher?.patient_id ? String(voucher.patient_id) : '',
      description: voucher?.description ?? '',
      value: voucher?.value ? String(voucher.value) : '0',
      expires_at: voucher?.expires_at?.slice(0, 10) ?? '',
      used: Boolean(voucher?.used),
    });
    setVoucherModalOpen(true);
  }

  async function submitTherapist(event: React.FormEvent) {
    event.preventDefault();
    const url = editingTherapist ? `/api/therapists/${editingTherapist.id}` : '/api/therapists';
    const method = editingTherapist ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(therapistForm),
    });

    const data = await res.json();
    if (!data.success) {
      showToast(data.error || 'Therapeut/in konnte nicht gespeichert werden', 'error');
      return;
    }

    await fetchTherapists();
    setTherapistModalOpen(false);
    showToast(editingTherapist ? 'Therapeut/in aktualisiert' : 'Therapeut/in angelegt', 'success');
  }

  async function submitVoucher(event: React.FormEvent) {
    event.preventDefault();
    const url = editingVoucher ? `/api/vouchers/${editingVoucher.id}` : '/api/vouchers';
    const method = editingVoucher ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: voucherForm.code,
        patient_id: voucherForm.patient_id || null,
        description: voucherForm.description,
        value: Number(voucherForm.value),
        expires_at: voucherForm.expires_at || null,
        used: voucherForm.used,
      }),
    });

    const data = await res.json();
    if (!data.success) {
      showToast(data.error || 'Gutschein konnte nicht gespeichert werden', 'error');
      return;
    }

    await fetchVouchers();
    setVoucherModalOpen(false);
    showToast(editingVoucher ? 'Gutschein aktualisiert' : 'Gutschein angelegt', 'success');
  }

  async function toggleVoucherUsed(voucher: Voucher) {
    const res = await fetch(`/api/vouchers/${voucher.id}/use`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ used: !voucher.used }),
    });
    const data = await res.json();
    if (!data.success) {
      showToast(data.error || 'Status konnte nicht geändert werden', 'error');
      return;
    }
    await fetchVouchers();
    showToast(!voucher.used ? 'Gutschein als eingelöst markiert' : 'Gutschein wieder als offen markiert', 'success');
  }

  async function deleteTherapist(id: number) {
    const res = await fetch(`/api/therapists/${id}`, { method: 'DELETE', credentials: 'include' });
    const data = await res.json();
    if (!data.success) {
      showToast(data.error || 'Therapeut/in konnte nicht gelöscht werden', 'error');
      return;
    }
    await fetchTherapists();
    showToast('Therapeut/in gelöscht', 'success');
  }

  async function deleteVoucher(id: number) {
    const res = await fetch(`/api/vouchers/${id}`, { method: 'DELETE', credentials: 'include' });
    const data = await res.json();
    if (!data.success) {
      showToast(data.error || 'Gutschein konnte nicht gelöscht werden', 'error');
      return;
    }
    await fetchVouchers();
    showToast('Gutschein gelöscht', 'success');
  }

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-slate-500">Laden…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Verwaltung</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Therapeut:innen und Gutscheine</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Pflege von Teamfarben für den Gruppenkalender sowie Ausgabe und Verwaltung von Gutscheinen in Euro.
            </p>
          </div>
          <div className="grid min-w-[280px] grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Therapeut:innen</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{therapists.length}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm text-emerald-700">Offene Gutscheine</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-800">{unusedVouchers.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          onClick={() => setTab('therapists')}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            tab === 'therapists' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Therapeut:innen
        </button>
        <button
          onClick={() => setTab('vouchers')}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            tab === 'vouchers' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Gutscheine
        </button>
      </div>

      {tab === 'therapists' && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Teamfarben</h3>
              <p className="text-sm text-slate-500">Die Farben werden direkt im Kalender verwendet.</p>
            </div>
            <button onClick={() => openTherapistModal()} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              + Therapeut/in
            </button>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
            {therapists.map((therapist) => (
              <article key={therapist.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="h-4 w-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: therapist.color }} />
                    <div>
                      <h4 className="font-semibold text-slate-900">{therapist.name}</h4>
                      <p className="text-sm text-slate-500">{therapist.color}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openTherapistModal(therapist)} className="rounded-lg bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => setConfirmAction({ message: 'Therapeut/in wirklich löschen?', onConfirm: () => void deleteTherapist(therapist.id!) })}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === 'vouchers' && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Gutscheine</h3>
              <p className="text-sm text-slate-500">Werte in Euro, optional auf Patient:innen zugeordnet.</p>
            </div>
            <button onClick={() => openVoucherModal()} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              + Gutschein
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Beschreibung</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Patient/in</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Wert</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ablauf</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vouchers.map((voucher) => {
                  const expired = Boolean(voucher.expires_at) && !voucher.used && new Date(voucher.expires_at!) < new Date();
                  return (
                    <tr key={voucher.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-900">{voucher.code}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{voucher.description}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{voucher.patient_name || 'Nicht zugeordnet'}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                        {new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(voucher.value)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {voucher.expires_at ? new Date(voucher.expires_at).toLocaleDateString('de-AT') : 'Kein Ablauf'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            voucher.used
                              ? 'bg-slate-200 text-slate-700'
                              : expired
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {voucher.used ? 'Eingelöst' : expired ? 'Abgelaufen' : 'Offen'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => toggleVoucherUsed(voucher)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200">
                            {voucher.used ? 'Reaktivieren' : 'Einlösen'}
                          </button>
                          <button onClick={() => openVoucherModal(voucher)} className="rounded-lg bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => setConfirmAction({ message: 'Gutschein wirklich löschen?', onConfirm: () => void deleteVoucher(voucher.id!) })}
                            className="rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100"
                          >
                            Löschen
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Modal isOpen={therapistModalOpen} onClose={() => setTherapistModalOpen(false)} title={editingTherapist ? 'Therapeut/in bearbeiten' : 'Therapeut/in anlegen'}>
        <form onSubmit={submitTherapist} className="space-y-5 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input
              required
              value={therapistForm.name}
              onChange={(event) => setTherapistForm((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Mag. Anna Leitner"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Kalenderfarbe</label>
            <div className="flex flex-wrap gap-3">
              {therapistPalette.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setTherapistForm((current) => ({ ...current, color }))}
                  className={`h-10 w-10 rounded-full border-4 transition ${therapistForm.color === color ? 'border-slate-900 scale-105' : 'border-white'}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Farbe ${color}`}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button type="button" onClick={() => setTherapistModalOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Abbrechen
            </button>
            <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Speichern
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={voucherModalOpen} onClose={() => setVoucherModalOpen(false)} title={editingVoucher ? 'Gutschein bearbeiten' : 'Gutschein anlegen'} size="lg">
        <form onSubmit={submitVoucher} className="space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Code</label>
              <input
                required
                value={voucherForm.code}
                onChange={(event) => setVoucherForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="PF-2026-001"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Wert in EUR</label>
              <input
                required
                min="1"
                step="0.01"
                type="number"
                value={voucherForm.value}
                onChange={(event) => setVoucherForm((current) => ({ ...current, value: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Beschreibung</label>
            <input
              required
              value={voucherForm.description}
              onChange={(event) => setVoucherForm((current) => ({ ...current, description: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="10er-Block Regeneration"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Patient/in (optional)</label>
              <select
                value={voucherForm.patient_id}
                onChange={(event) => setVoucherForm((current) => ({ ...current, patient_id: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Nicht zugeordnet</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Ablaufdatum</label>
              <input
                type="date"
                value={voucherForm.expires_at}
                onChange={(event) => setVoucherForm((current) => ({ ...current, expires_at: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
          {editingVoucher && (
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={voucherForm.used}
                onChange={(event) => setVoucherForm((current) => ({ ...current, used: event.target.checked }))}
              />
              Gutschein bereits eingelöst
            </label>
          )}
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button type="button" onClick={() => setVoucherModalOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Abbrechen
            </button>
            <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              Speichern
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

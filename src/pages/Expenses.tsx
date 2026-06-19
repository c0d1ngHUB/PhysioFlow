import { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PageHeader } from '../components/ui/PageHeader';
import { showToast } from '../components/ui';
import { apiFetch } from '../lib/api';
import { Expense } from '../types';

const EXPENSE_CATEGORIES = [
  'Miete',
  'Strom',
  'Heizung',
  'Versicherung',
  'Reinigung',
  'Fortbildung',
  'Material',
  'Bürobedarf',
  'Telefon/Internet',
  'Steuern',
  'Abgaben',
  'Sonstiges'
];

const formControlClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100';

const monoFormControlClassName = `${formControlClassName} font-mono`;

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [_totals, setTotals] = useState({ all: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchExpenses();
  }, [filterCategory]);

  const fetchExpenses = async () => {
    try {
      let url = '/api/expenses';
      if (filterCategory) url += `?category=${encodeURIComponent(filterCategory)}`;
      
      const res = await apiFetch(url);
      const data = await res.json();
      if (data.success) {
        setExpenses(data.data);
        setTotals(data.totals);
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        category: expense.category,
        description: expense.description || '',
        amount: expense.amount.toString(),
        date: expense.date
      });
    } else {
      setEditingExpense(null);
      setFormData({
        category: '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingExpense ? `/api/expenses/${editingExpense.id}` : '/api/expenses';
      const method = editingExpense ? 'PUT' : 'POST';
      
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      });
      
      const data = await res.json();
      if (data.success) {
        await fetchExpenses();
        setShowModal(false);
        showToast(editingExpense ? 'Ausgabe aktualisiert.' : 'Ausgabe gespeichert.', 'success');
      } else {
        showToast(data.error || 'Fehler beim Speichern', 'error');
      }
    } catch {
      showToast('Fehler beim Speichern', 'error');
    }
  };

  const deleteExpense = async (id: number) => {
    try {
      const res = await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await fetchExpenses();
        setExpenseToDelete(null);
        showToast('Ausgabe gelöscht.', 'success');
      } else {
        showToast(data.error || 'Fehler beim Löschen', 'error');
      }
    } catch {
      showToast('Fehler beim Löschen', 'error');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ausgaben"
        description={`${expenses.length} Einträge`}
        badge={<Badge variant="warning">Kosten</Badge>}
        actions={
          <Button size="lg" onClick={() => openModal()}>
            + Neue Ausgabe
          </Button>
        }
      />

      {/* Filter */}
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant={!filterCategory ? 'primary' : 'outline'} onClick={() => setFilterCategory('')} className="text-xs py-1.5 px-3 h-auto">
          Alle
        </Button>
        {EXPENSE_CATEGORIES.slice(0, 6).map(cat => (
          <Button key={cat} size="sm" variant={filterCategory === cat ? 'primary' : 'outline'} onClick={() => setFilterCategory(cat === filterCategory ? '' : cat)} className="text-xs py-1.5 px-3 h-auto">
            {cat}
          </Button>
        ))}
      </div>

      {/* Expense Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategorie</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beschreibung</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Betrag</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{new Date(expense.date).toLocaleDateString('de-AT')}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="default" className="text-sm">{expense.category}</Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{expense.description || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-bold text-red-600">{formatCurrency(expense.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => openModal(expense)} title="Bearbeiten">✏️</Button>
                        <Button size="icon" variant="ghost" onClick={() => setExpenseToDelete(expense)} className="text-red-600 hover:bg-red-50 hover:text-red-700" title="Löschen">🗑️</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={3} className="px-6 py-3 text-right font-semibold text-gray-700">Gesamt:</td>
                  <td className="px-6 py-3 text-right font-mono font-bold text-red-600 text-lg">{formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <span className="text-4xl mb-2 block">📊</span>
            <p>{filterCategory ? 'Keine Ausgaben in dieser Kategorie' : 'Noch keine Ausgaben erfasst'}</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">{editingExpense ? 'Ausgabe bearbeiten' : 'Neue Ausgabe'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie *</label>
                <select required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className={formControlClassName}>
                  <option value="">Kategorie wählen...</option>
                  {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={formControlClassName} placeholder="z.B. Büromaterial von Amazon" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Betrag (€) *</label>
                  <input type="number" required step="0.01" min="0" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className={monoFormControlClassName} placeholder="49.99" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
                  <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className={formControlClassName} />
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button type="button" onClick={() => setShowModal(false)} className="flex-1" variant="outline">Abbrechen</Button>
                <Button type="submit" className="flex-1">Speichern</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={expenseToDelete !== null}
        title="Ausgabe löschen?"
        description="Diese Ausgabe wird dauerhaft entfernt."
        confirmLabel="Löschen"
        confirmVariant="outline"
        onCancel={() => setExpenseToDelete(null)}
        onConfirm={() => {
          if (expenseToDelete?.id) {
            void deleteExpense(expenseToDelete.id);
          }
        }}
      />
    </div>
  );
}

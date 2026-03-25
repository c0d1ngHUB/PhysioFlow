import { useState, useEffect } from 'react';
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

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totals, setTotals] = useState({ all: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
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
      
      const res = await fetch(url);
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
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      });
      
      const data = await res.json();
      if (data.success) {
        fetchExpenses();
        setShowModal(false);
      } else {
        alert(data.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      alert('Fehler beim Speichern');
    }
  };

  const deleteExpense = async (id: number) => {
    if (!confirm('Ausgabe wirklich löschen?')) return;
    
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchExpenses();
    } catch (error) {
      alert('Fehler beim Löschen');
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ausgaben</h2>
          <p className="text-gray-500">{expenses.length} Einträge</p>
        </div>
        <button onClick={() => openModal()} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
          + Neue Ausgabe
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Gesamt (alle Zeit)</p>
          <p className="text-3xl font-semibold text-red-600 mt-1">{formatCurrency(totals.all)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Dieser Monat</p>
          <p className="text-3xl font-semibold text-orange-600 mt-1">{formatCurrency(totals.thisMonth)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Anzahl Einträge</p>
          <p className="text-3xl font-semibold text-gray-600 mt-1">{expenses.length}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilterCategory('')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${!filterCategory ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
          Alle
        </button>
        {EXPENSE_CATEGORIES.slice(0, 6).map(cat => (
          <button key={cat} onClick={() => setFilterCategory(cat === filterCategory ? '' : cat)} className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
            {cat}
          </button>
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
                      <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">{expense.category}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{expense.description || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-bold text-red-600">{formatCurrency(expense.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openModal(expense)} className="p-2 hover:bg-blue-100 rounded-lg transition-colors" title="Bearbeiten">✏️</button>
                        <button onClick={() => deleteExpense(expense.id!)} className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors" title="Löschen">🗑️</button>
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
                <select required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="">Kategorie wählen...</option>
                  {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="z.B. Büromaterial von Amazon" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Betrag (€) *</label>
                  <input type="number" required step="0.01" min="0" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono" placeholder="49.99" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
                  <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">Abbrechen</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

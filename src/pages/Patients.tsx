import { useState, useEffect } from 'react';
import { Patient } from '../types';

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // Form state
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
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/patients');
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

  const filteredPatients = patients.filter((p) => {
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) ||
      (p.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.phone?.includes(searchTerm));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingPatient 
        ? `/api/patients/${editingPatient.id}` 
        : '/api/patients';
      const method = editingPatient ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (data.success) {
        fetchPatients();
        setShowModal(false);
      } else {
        alert(data.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      alert('Fehler beim Speichern');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Patient wirklich löschen? Alle zugehörigen Termine werden ebenfalls gelöscht.')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchPatients();
      }
    } catch (error) {
      alert('Fehler beim Löschen');
    }
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
        <button
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          + Neuer Patient
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Patient suchen (Name, Telefon, E-Mail)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
      </div>

      {/* Patient Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPatients.map((patient) => (
          <div 
            key={patient.id} 
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
            onClick={() => openModal(patient)}
          >
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold ${getAvatarColor(patient)}`}>
                {getPatientInitials(patient)}
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-lg">
                  {patient.first_name} {patient.last_name}
                </h3>
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
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={(e) => { e.stopPropagation(); openModal(patient); }}
                className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                Bearbeiten
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(patient.id!); }}
                className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredPatients.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <span className="text-5xl mb-4 block">👤</span>
          <p className="text-gray-500 font-medium text-lg">
            {searchTerm ? 'Kein Patient gefunden' : 'Noch keine Patienten registriert'}
          </p>
          <p className="text-gray-400 text-sm mt-2">
            {searchTerm ? 'Versuchen Sie einen anderen Suchbegriff' : 'Starten Sie mit dem ersten Patienten'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => openModal()}
              className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              + Ersten Patienten anlegen
            </button>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingPatient ? 'Patient bearbeiten' : 'Neuer Patient'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Vorname *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Schmidt"
                  />
                </div>
              </div>
              
              {/* Contact */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefon</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+43 664 1234567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">E-Mail</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="maria@example.com"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Musterstraße 1, 9020 Klagenfurt"
                />
              </div>
              
              {/* Birthdate & Insurance */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Geburtsdatum</label>
                  <input
                    type="date"
                    value={formData.birthdate}
                    onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Versicherungsnummer</label>
                  <input
                    type="text"
                    value={formData.insurance_number}
                    onChange={(e) => setFormData({ ...formData, insurance_number: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="1234567890"
                  />
                </div>
              </div>
              
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notizen</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Besonderheiten, Vorerkrankungen, etc."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

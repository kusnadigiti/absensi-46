import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function DataKelas() {
  const [searchTerm, setSearchTerm] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: ''
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!supabase) return;
      
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name');
      
      if (error) throw error;
      if (data) setClasses(data);
    } catch (error: any) {
      console.error('Error fetching classes:', error);
      setError(error.message || 'Gagal mengambil data kelas');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (cls: any = null) => {
    setError(null);
    setSuccessMsg(null);
    if (cls) {
      setSelectedClass(cls);
      setFormData({
        name: cls.name
      });
    } else {
      setSelectedClass(null);
      setFormData({
        name: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedClass(null);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (!supabase) throw new Error('Supabase not configured');

      if (selectedClass) {
        // Update
        const { error: updateError } = await supabase
          .from('classes')
          .update({
            name: formData.name
          })
          .eq('id', selectedClass.id);

        if (updateError) {
          if (updateError.code === '23505') throw new Error('Nama kelas sudah ada');
          throw updateError;
        }
        setSuccessMsg('Data kelas berhasil diperbarui');
      } else {
        // Create
        const { error: insertError } = await supabase
          .from('classes')
          .insert([{
            name: formData.name
          }]);

        if (insertError) {
          if (insertError.code === '23505') throw new Error('Nama kelas sudah ada');
          throw insertError;
        }
        setSuccessMsg('Kelas berhasil ditambahkan');
      }

      await fetchClasses();
      handleCloseModal();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClick = (cls: any) => {
    setSelectedClass(cls);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedClass || !supabase) return;
    setActionLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', selectedClass.id);
        
      if (error) throw error;
      setSuccessMsg('Data kelas berhasil dihapus');
      await fetchClasses();
      setIsDeleteModalOpen(false);
      setSelectedClass(null);
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus kelas');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredClasses = classes.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm border border-emerald-100 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}><X size={16} /></button>
        </div>
      )}
      
      {error && !isModalOpen && !isDeleteModalOpen && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100 flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle size={16} className="mr-2" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}><X size={16} /></button>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Data Kelas</h1>
            <p className="text-slate-500 mt-1">Kelola data kelas SMKN 46 Jakarta.</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center px-4 py-2.5 bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition-colors text-sm font-bold shadow-sm"
            >
              <Plus size={18} className="mr-2" />
              Tambah Kelas
            </button>
          </div>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-5 h-5 text-slate-400" />
          </div>
          <input 
            type="text" 
            className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-600 focus:border-blue-600 block w-full pl-10 p-3" 
            placeholder="Cari nama kelas..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-sm text-slate-500 bg-slate-50">
                  <th className="p-4 font-medium rounded-tl-xl">Nama Kelas</th>
                  <th className="p-4 font-medium text-right rounded-tr-xl">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredClasses.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="p-8 text-center text-slate-500">
                      Tidak ada data kelas ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredClasses.map((cls) => (
                    <tr key={cls.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium text-slate-900">{cls.name}</td>
                      <td className="p-4">
                        <div className="flex justify-end space-x-2">
                          <button 
                            onClick={() => handleOpenModal(cls)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(cls)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {selectedClass ? 'Edit Kelas' : 'Tambah Kelas Baru'}
              </h3>
              <button 
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveClass} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm border border-red-100">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Kelas</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-blue-600 focus:border-blue-600 text-sm"
                  placeholder="Contoh: XII RPL 1"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button 
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Menyimpan...' : 'Simpan Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Hapus Kelas?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Apakah Anda yakin ingin menghapus kelas <strong>{selectedClass?.name}</strong>?
            </p>
            <div className="flex justify-center space-x-3">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={confirmDelete}
                disabled={actionLoading}
                className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

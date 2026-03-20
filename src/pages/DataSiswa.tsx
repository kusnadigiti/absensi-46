import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, Upload, Download, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Papa from 'papaparse';

export default function DataSiswa() {
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDelete, setIsBulkDelete] = useState(false);
  const [formData, setFormData] = useState({
    nis: '',
    name: '',
    class_name: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('classes')
        .select('name')
        .order('name');
      
      if (error) throw error;
      if (data) setClassesList(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!supabase) return;
      
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('name');
      
      if (error) throw error;
      if (data) setStudents(data);
    } catch (error: any) {
      console.error('Error fetching students:', error);
      setError(error.message || 'Gagal mengambil data siswa');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (student: any = null) => {
    setError(null);
    setSuccessMsg(null);
    if (student) {
      setSelectedStudent(student);
      setFormData({
        nis: student.nis,
        name: student.name,
        class_name: student.class_name
      });
    } else {
      setSelectedStudent(null);
      setFormData({
        nis: '',
        name: '',
        class_name: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (!supabase) throw new Error('Supabase not configured');

      if (selectedStudent) {
        // Update
        const { error: updateError } = await supabase
          .from('students')
          .update({
            nis: formData.nis,
            name: formData.name,
            class_name: formData.class_name
          })
          .eq('id', selectedStudent.id);

        if (updateError) {
          if (updateError.code === '23505') throw new Error('NIS sudah terdaftar');
          throw updateError;
        }
        setSuccessMsg('Data siswa berhasil diperbarui');
      } else {
        // Create
        const { error: insertError } = await supabase
          .from('students')
          .insert([{
            nis: formData.nis,
            name: formData.name,
            class_name: formData.class_name
          }]);

        if (insertError) {
          if (insertError.code === '23505') throw new Error('NIS sudah terdaftar');
          throw insertError;
        }
        setSuccessMsg('Siswa berhasil ditambahkan');
      }

      await fetchStudents();
      handleCloseModal();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const filtered = students.filter(s => 
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.nis?.includes(searchTerm) ||
        s.class_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSelectedIds(filtered.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteClick = () => {
    setIsBulkDelete(true);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteClick = (student: any) => {
    setSelectedStudent(student);
    setIsBulkDelete(false);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!supabase) return;
    setActionLoading(true);
    setError(null);
    try {
      if (isBulkDelete) {
        const { error } = await supabase
          .from('students')
          .delete()
          .in('id', selectedIds);
          
        if (error) throw error;
        setSuccessMsg(`${selectedIds.length} data siswa berhasil dihapus`);
        setSelectedIds([]);
      } else {
        if (!selectedStudent) return;
        const { error } = await supabase
          .from('students')
          .delete()
          .eq('id', selectedStudent.id);
          
        if (error) throw error;
        setSuccessMsg('Data siswa berhasil dihapus');
      }
      
      await fetchStudents();
      setIsDeleteModalOpen(false);
      setSelectedStudent(null);
      setIsBulkDelete(false);
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus siswa');
    } finally {
      setActionLoading(false);
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          if (!supabase) throw new Error('Supabase not configured');
          
          const validData = results.data.filter((row: any) => row.nis && row.name && row.class_name).map((row: any) => ({
            nis: row.nis.toString().trim(),
            name: row.name.trim(),
            class_name: row.class_name.trim()
          }));

          if (validData.length === 0) {
            throw new Error('Format CSV tidak valid atau kosong. Pastikan ada kolom nis, name, class_name');
          }

          // Insert data (ignore duplicates based on NIS if possible, or upsert)
          const { error: insertError } = await supabase
            .from('students')
            .upsert(validData, { onConflict: 'nis' });

          if (insertError) throw insertError;

          setSuccessMsg(`${validData.length} data siswa berhasil diimpor`);
          await fetchStudents();
          setIsImportModalOpen(false);
        } catch (err: any) {
          setError(err.message || 'Gagal mengimpor data');
        } finally {
          setActionLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (error) => {
        setError(`Gagal membaca file: ${error.message}`);
        setActionLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,nis,name,class_name\n12345,John Doe,XII RPL 1\n12346,Jane Doe,XII RPL 2";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_siswa.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nis?.includes(searchTerm) ||
    s.class_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm border border-emerald-100 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}><X size={16} /></button>
        </div>
      )}
      
      {error && !isModalOpen && !isImportModalOpen && !isDeleteModalOpen && (
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
            <h1 className="text-2xl font-bold text-slate-900">Data Siswa</h1>
            <p className="text-slate-500 mt-1">Kelola data induk siswa SMKN 46 Jakarta.</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-wrap gap-3 justify-end">
            {selectedIds.length > 0 && (
              <button 
                onClick={handleBulkDeleteClick}
                className="flex items-center px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-colors text-sm font-bold shadow-sm"
              >
                <Trash2 size={18} className="mr-2" />
                Hapus ({selectedIds.length})
              </button>
            )}
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-bold shadow-sm"
            >
              <Upload size={18} className="mr-2" />
              Import CSV
            </button>
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center px-4 py-2.5 bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition-colors text-sm font-bold shadow-sm"
            >
              <Plus size={18} className="mr-2" />
              Tambah Siswa
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
            placeholder="Cari NIS, nama, atau kelas..." 
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
                  <th className="p-4 font-medium rounded-tl-xl w-12">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                      checked={filteredStudents.length > 0 && selectedIds.length === filteredStudents.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-4 font-medium">NIS</th>
                  <th className="p-4 font-medium">Nama Siswa</th>
                  <th className="p-4 font-medium">Kelas</th>
                  <th className="p-4 font-medium text-right rounded-tr-xl">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      Tidak ada data siswa ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                          checked={selectedIds.includes(student.id)}
                          onChange={() => handleSelectOne(student.id)}
                        />
                      </td>
                      <td className="p-4 font-mono text-slate-500">{student.nis}</td>
                      <td className="p-4 font-medium text-slate-900">{student.name}</td>
                      <td className="p-4 text-slate-600">
                        <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
                          {student.class_name}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end space-x-2">
                          <button 
                            onClick={() => handleOpenModal(student)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(student)}
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
                {selectedStudent ? 'Edit Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button 
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveStudent} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm border border-red-100">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">NIS</label>
                <input 
                  type="text" 
                  required
                  value={formData.nis}
                  onChange={(e) => setFormData({...formData, nis: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-blue-600 focus:border-blue-600 text-sm"
                  placeholder="Nomor Induk Siswa"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-blue-600 focus:border-blue-600 text-sm"
                  placeholder="Nama lengkap siswa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kelas</label>
                <select 
                  required
                  value={formData.class_name}
                  onChange={(e) => setFormData({...formData, class_name: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-blue-600 focus:border-blue-600 text-sm"
                >
                  <option value="" disabled>Pilih Kelas</option>
                  {classesList.map((cls, idx) => (
                    <option key={idx} value={cls.name}>{cls.name}</option>
                  ))}
                </select>
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
                  {actionLoading ? 'Menyimpan...' : 'Simpan Siswa'}
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
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {isBulkDelete ? 'Hapus Siswa Terpilih?' : 'Hapus Siswa?'}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              {isBulkDelete 
                ? `Apakah Anda yakin ingin menghapus ${selectedIds.length} siswa yang dipilih? Data absensi mereka juga mungkin akan terhapus.`
                : <>Apakah Anda yakin ingin menghapus <strong>{selectedStudent?.name}</strong>? Data absensi siswa ini juga mungkin akan terhapus.</>
              }
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

      {/* Import CSV Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Import Data Siswa</h3>
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm border border-red-100">
                  {error}
                </div>
              )}
              
              <p className="text-sm text-slate-600">
                Upload file CSV dengan format kolom: <strong>nis, name, class_name</strong>. 
                Jika NIS sudah ada, data akan diperbarui.
              </p>

              <button 
                onClick={downloadTemplate}
                className="flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <Download size={16} className="mr-1" /> Download Template CSV
              </button>

              <div className="mt-4 border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors relative">
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={handleImportCSV}
                  ref={fileInputRef}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={actionLoading}
                />
                <Upload size={32} className="mx-auto text-slate-400 mb-3" />
                <p className="text-sm font-medium text-slate-700">
                  {actionLoading ? 'Memproses...' : 'Klik atau drag file CSV ke sini'}
                </p>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

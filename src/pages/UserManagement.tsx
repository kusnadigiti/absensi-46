import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Shield, User, GraduationCap, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'guru',
    password: '' // Only used for new users
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      if (!supabase) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');
      
      if (error) throw error;
      if (data) setUsers(data);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setFetchError(error.message || 'Gagal mengambil data user');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user: any = null) => {
    setError('');
    if (user) {
      setSelectedUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        password: ''
      });
    } else {
      setSelectedUser(null);
      setFormData({
        name: '',
        email: '',
        role: 'guru',
        password: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');

    try {
      if (!supabase) throw new Error('Supabase not configured');

      if (selectedUser) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            name: formData.name,
            role: formData.role
          })
          .eq('id', selectedUser.id);

        if (updateError) throw updateError;
      } else {
        // Create new user using a secondary client to avoid logging out the admin
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Supabase credentials not found');
        }

        const secondarySupabase = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          }
        });

        const cleanEmail = formData.email.replace(/[\s"'`\u200B-\u200D\uFEFF]/g, '').toLowerCase();
        const { data: authData, error: signUpError } = await secondarySupabase.auth.signUp({
          email: cleanEmail,
          password: formData.password,
          options: {
            data: {
              name: formData.name.trim(),
              role: formData.role
            }
          }
        });

        if (signUpError) {
          if (signUpError.message.includes('rate limit')) {
            throw new Error('Batas pembuatan user tercapai (Rate Limit Supabase). Solusi: Buka dashboard Supabase -> Authentication -> Providers -> Email, lalu matikan "Confirm email", atau tunggu beberapa saat.');
          }
          throw signUpError;
        }

        if (authData.user) {
          // Attempt to insert into profiles (in case there is no trigger)
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([{
              id: authData.user.id,
              email: cleanEmail,
              name: formData.name.trim(),
              role: formData.role
            }]);
            
          if (insertError && insertError.code !== '23505') { // 23505 is unique violation
            console.error('Error inserting profile:', insertError);
          }
        } else {
          throw new Error('Gagal membuat user di Supabase Auth.');
        }
      }

      await fetchUsers();
      handleCloseModal();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClick = (user: any) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser || !supabase) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedUser.id);
        
      if (error) throw error;
      await fetchUsers();
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus user');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'admin': return <Shield size={16} className="mr-1 text-purple-600" />;
      case 'guru': return <GraduationCap size={16} className="mr-1 text-blue-600" />;
      case 'tenaga_kependidikan': return <User size={16} className="mr-1 text-emerald-600" />;
      default: return null;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch(role) {
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'guru': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'tenaga_kependidikan': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
            <p className="text-slate-500 mt-1">Kelola akses pengguna sistem absensi.</p>
          </div>
          <div className="mt-4 md:mt-0">
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center px-6 py-3 bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition-colors text-sm font-bold shadow-sm"
            >
              <Plus size={18} className="mr-2" />
              Tambah User
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
            placeholder="Cari email atau nama user..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {fetchError && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100 mb-6">
            Error: {fetchError}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-sm text-slate-500 bg-slate-50">
                  <th className="p-4 font-medium rounded-tl-xl">Nama Pengguna</th>
                  <th className="p-4 font-medium">Email</th>
                  <th className="p-4 font-medium">Role</th>
                  <th className="p-4 font-medium text-right rounded-tr-xl">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      Tidak ada data user ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium text-slate-900">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold mr-3 uppercase">
                            {user.name?.charAt(0) || '?'}
                          </div>
                          {user.name}
                        </div>
                      </td>
                      <td className="p-4 text-slate-500">{user.email}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getRoleBadgeClass(user.role)}`}>
                          {getRoleIcon(user.role)}
                          <span className="capitalize">{user.role?.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end space-x-2">
                          <button 
                            onClick={() => handleOpenModal(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(user)}
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
                {selectedUser ? 'Edit User' : 'Tambah User Baru'}
              </h3>
              <button 
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm border border-red-100">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-blue-600 focus:border-blue-600 text-sm"
                  placeholder="Masukkan nama lengkap"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input 
                  type="email" 
                  required
                  disabled={!!selectedUser}
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value.trim()})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-blue-600 focus:border-blue-600 text-sm disabled:opacity-50"
                  placeholder="email@sekolah.sch.id"
                />
                {selectedUser && <p className="text-xs text-slate-500 mt-1">Email tidak dapat diubah setelah dibuat.</p>}
              </div>

              {!selectedUser && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input 
                    type="password" 
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-blue-600 focus:border-blue-600 text-sm"
                    placeholder="Minimal 6 karakter"
                    minLength={6}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role Akses</label>
                <select 
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-blue-600 focus:border-blue-600 text-sm"
                >
                  <option value="guru">Guru</option>
                  <option value="tenaga_kependidikan">Tenaga Kependidikan (Staff)</option>
                  <option value="admin">Administrator</option>
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
                  {actionLoading ? 'Menyimpan...' : 'Simpan User'}
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
            <h3 className="text-lg font-bold text-slate-900 mb-2">Hapus User?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Apakah Anda yakin ingin menghapus user <strong>{selectedUser?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
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

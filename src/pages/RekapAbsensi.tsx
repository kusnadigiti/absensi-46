import { useState, useEffect } from 'react';
import { Calendar, Download, Edit, Trash2, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, parseISO, getDaysInMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import clsx from 'clsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

type ClassData = { name: string };
type StudentData = { id: string; name: string; nis: string; class_name: string };
type AttendanceRecord = {
  id: string;
  student_id: string;
  date: string;
  status: 'hadir' | 'izin' | 'sakit' | 'alpa';
  notes: string | null;
  students?: { name: string; nis: string; class_name: string };
};

export default function RekapAbsensi() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  
  const [students, setStudents] = useState<StudentData[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editStatus, setEditStatus] = useState<'hadir' | 'izin' | 'sakit' | 'alpa'>('hadir');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedMonth) {
      fetchData();
    } else {
      setAttendanceData([]);
      setStudents([]);
    }
  }, [selectedClass, selectedMonth]);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase.from('classes').select('name').order('name');
      if (error) throw error;
      if (data) {
        setClasses(data);
        if (data.length > 0) setSelectedClass(data[0].name);
      }
    } catch (err: any) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch students in class
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, nis, class_name')
        .eq('class_name', selectedClass)
        .order('name');
      
      if (studentsError) throw studentsError;
      if (studentsData) setStudents(studentsData);

      // Fetch attendance for month
      const start = startOfMonth(parseISO(`${selectedMonth}-01`));
      const end = endOfMonth(parseISO(`${selectedMonth}-01`));

      const { data: attData, error: attError } = await supabase
        .from('attendance_students')
        .select(`
          id, student_id, date, status, notes,
          students!inner(name, nis, class_name)
        `)
        .eq('students.class_name', selectedClass)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (attError) throw attError;
      if (attData) {
        setAttendanceData(attData as any);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRecord = async () => {
    if (!editingRecord) return;
    try {
      const { error } = await supabase
        .from('attendance_students')
        .update({ status: editStatus, notes: editNotes })
        .eq('id', editingRecord.id);

      if (error) throw error;
      
      // Update local state
      setAttendanceData(prev => prev.map(record => 
        record.id === editingRecord.id 
          ? { ...record, status: editStatus, notes: editNotes } 
          : record
      ));
      setEditingRecord(null);
    } catch (err: any) {
      console.error('Error updating record:', err);
      alert('Gagal mengupdate data: ' + err.message);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data absensi ini?')) return;
    try {
      const { error } = await supabase
        .from('attendance_students')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setAttendanceData(prev => prev.filter(record => record.id !== id));
    } catch (err: any) {
      console.error('Error deleting record:', err);
      alert('Gagal menghapus data: ' + err.message);
    }
  };

  const exportToCSV = () => {
    if (students.length === 0) return;

    const headers = ['NIS', 'Nama', 'Kelas', 'Hadir', 'Izin', 'Sakit', 'Alpa'];
    const csvData = students.map(student => {
      const studentAtt = attendanceData.filter(a => a.student_id === student.id);
      const hadir = studentAtt.filter(a => a.status === 'hadir').length;
      const izin = studentAtt.filter(a => a.status === 'izin').length;
      const sakit = studentAtt.filter(a => a.status === 'sakit').length;
      const alpa = studentAtt.filter(a => a.status === 'alpa').length;
      return [student.nis, student.name, student.class_name, hadir, izin, sakit, alpa].join(',');
    });

    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Rekap_Absensi_${selectedClass}_${selectedMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Prepare Chart Data
  const getChartData = () => {
    const daysInMonth = getDaysInMonth(parseISO(`${selectedMonth}-01`));
    const chartData = [];

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${selectedMonth}-${i.toString().padStart(2, '0')}`;
      const dayRecords = attendanceData.filter(a => a.date === dateStr);
      
      chartData.push({
        name: i.toString(),
        Hadir: dayRecords.filter(a => a.status === 'hadir').length,
        Izin: dayRecords.filter(a => a.status === 'izin').length,
        Sakit: dayRecords.filter(a => a.status === 'sakit').length,
        Alpa: dayRecords.filter(a => a.status === 'alpa').length,
      });
    }
    return chartData;
  };

  const chartData = getChartData();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Rekap Absensi Siswa</h1>
            <p className="text-slate-500 mt-1">Laporan kehadiran bulanan dan harian siswa.</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Calendar size={16} className="text-slate-400 mr-2" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-700 p-0"
              />
            </div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-blue-600 focus:border-blue-600 block p-2.5 font-medium"
            >
              {classes.map((cls) => (
                <option key={cls.name} value={cls.name}>{cls.name}</option>
              ))}
            </select>
            <button 
              onClick={exportToCSV}
              className="flex items-center px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-bold shadow-sm"
            >
              <Download size={16} className="mr-2" />
              Export CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100">
            {error}
          </div>
        )}

        {/* Chart Section */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Grafik Kehadiran Bulan Ini</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{fill: '#f1f5f9'}}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Hadir" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Izin" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Sakit" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Alpa" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Table */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Ringkasan Kehadiran</h3>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-sm text-slate-500 bg-slate-50">
                  <th className="p-4 font-medium">NIS</th>
                  <th className="p-4 font-medium">Nama Siswa</th>
                  <th className="p-4 font-medium text-center text-emerald-600">Hadir</th>
                  <th className="p-4 font-medium text-center text-blue-600">Izin</th>
                  <th className="p-4 font-medium text-center text-amber-600">Sakit</th>
                  <th className="p-4 font-medium text-center text-red-600">Alpa</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto"></div>
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">Tidak ada data siswa untuk kelas ini.</td>
                  </tr>
                ) : (
                  students.map((student) => {
                    const studentAtt = attendanceData.filter(a => a.student_id === student.id);
                    const hadir = studentAtt.filter(a => a.status === 'hadir').length;
                    const izin = studentAtt.filter(a => a.status === 'izin').length;
                    const sakit = studentAtt.filter(a => a.status === 'sakit').length;
                    const alpa = studentAtt.filter(a => a.status === 'alpa').length;

                    return (
                      <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-mono text-slate-500">{student.nis}</td>
                        <td className="p-4 font-medium text-slate-900">{student.name}</td>
                        <td className="p-4 text-center font-bold text-slate-700">{hadir}</td>
                        <td className="p-4 text-center font-bold text-slate-700">{izin}</td>
                        <td className="p-4 text-center font-bold text-slate-700">{sakit}</td>
                        <td className="p-4 text-center font-bold text-slate-700">{alpa}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Records Table with CRUD */}
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-4">Detail Data Absensi</h3>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-sm text-slate-500 bg-slate-50">
                  <th className="p-4 font-medium">Tanggal</th>
                  <th className="p-4 font-medium">Nama Siswa</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Keterangan</th>
                  <th className="p-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">Memuat data...</td>
                  </tr>
                ) : attendanceData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">Tidak ada data absensi.</td>
                  </tr>
                ) : (
                  attendanceData.map((record) => (
                    <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-600">{format(parseISO(record.date), 'dd MMM yyyy', { locale: id })}</td>
                      <td className="p-4 font-medium text-slate-900">{record.students?.name}</td>
                      <td className="p-4">
                        <span className={clsx(
                          "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                          record.status === 'hadir' && "bg-emerald-100 text-emerald-700",
                          record.status === 'izin' && "bg-blue-100 text-blue-700",
                          record.status === 'sakit' && "bg-amber-100 text-amber-700",
                          record.status === 'alpa' && "bg-red-100 text-red-700"
                        )}>
                          {record.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500">{record.notes || '-'}</td>
                      <td className="p-4">
                        <div className="flex justify-end space-x-2">
                          <button 
                            onClick={() => {
                              setEditingRecord(record);
                              setEditStatus(record.status);
                              setEditNotes(record.notes || '');
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteRecord(record.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Edit Absensi</h3>
              <button 
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Siswa</p>
                <p className="font-medium text-slate-900">{editingRecord.students?.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Tanggal</p>
                <p className="font-medium text-slate-900">{format(parseISO(editingRecord.date), 'dd MMMM yyyy', { locale: id })}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status Kehadiran</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-blue-600 focus:border-blue-600 text-sm"
                >
                  <option value="hadir">Hadir</option>
                  <option value="izin">Izin</option>
                  <option value="sakit">Sakit</option>
                  <option value="alpa">Alpa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan (Opsional)</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-blue-600 focus:border-blue-600 text-sm"
                  rows={3}
                  placeholder="Tambahkan catatan jika perlu..."
                ></textarea>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end space-x-3 bg-slate-50">
              <button
                onClick={() => setEditingRecord(null)}
                className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleUpdateRecord}
                className="flex items-center px-5 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-xl hover:bg-blue-800 transition-colors"
              >
                <Check size={16} className="mr-2" />
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

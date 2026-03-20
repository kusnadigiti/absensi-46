import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Search, Save, AlertCircle, X, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import clsx from 'clsx';
import { format, subDays } from 'date-fns';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

export default function AbsensiSiswa() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'hadir' | 'izin' | 'sakit' | 'alpa'>>({});
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedDate) {
      fetchStudentsAndAttendance();
    } else {
      setStudents([]);
      setAttendance({});
      setWeeklyData([]);
    }
  }, [selectedClass, selectedDate]);

  const fetchClasses = async () => {
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('classes')
        .select('name')
        .order('name');
      
      if (error) throw error;
      if (data) {
        setClasses(data);
        if (data.length > 0 && !selectedClass) {
          setSelectedClass(data[0].name);
        }
      }
    } catch (error: any) {
      console.error('Error fetching classes:', error);
      setError('Gagal mengambil data kelas');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsAndAttendance = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!supabase) return;

      // Fetch students for the selected class
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('class_name', selectedClass)
        .order('name');

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Fetch attendance for the selected date and class
      if (studentsData && studentsData.length > 0) {
        const studentIds = studentsData.map(s => s.id);
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance_students')
          .select('*')
          .eq('date', selectedDate)
          .in('student_id', studentIds);

        if (attendanceError) throw attendanceError;

        const attendanceMap: Record<string, 'hadir' | 'izin' | 'sakit' | 'alpa'> = {};
        
        // Default all to hadir if no record exists yet
        studentsData.forEach(s => {
          attendanceMap[s.id] = 'hadir';
        });

        // Override with existing records
        if (attendanceData) {
          attendanceData.forEach(record => {
            attendanceMap[record.student_id] = record.status;
          });
        }

        setAttendance(attendanceMap);

        // Fetch weekly data for the chart
        const endDate = new Date(selectedDate);
        const startDate = subDays(endDate, 6);
        const startDateStr = format(startDate, 'yyyy-MM-dd');

        const { data: weeklyAttendanceData, error: weeklyError } = await supabase
          .from('attendance_students')
          .select('date, status')
          .gte('date', startDateStr)
          .lte('date', selectedDate)
          .in('student_id', studentIds);

        if (weeklyError) throw weeklyError;

        // Process weekly data
        const weeklyMap: Record<string, any> = {};
        for (let i = 6; i >= 0; i--) {
          const d = format(subDays(endDate, i), 'yyyy-MM-dd');
          weeklyMap[d] = { date: format(subDays(endDate, i), 'dd MMM'), hadir: 0, izin: 0, sakit: 0, alpa: 0 };
        }

        if (weeklyAttendanceData) {
          weeklyAttendanceData.forEach(record => {
            if (weeklyMap[record.date]) {
              weeklyMap[record.date][record.status]++;
            }
          });
        }

        setWeeklyData(Object.values(weeklyMap));

      } else {
        setAttendance({});
        setWeeklyData([]);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError('Gagal mengambil data siswa dan absensi');
    } finally {
      setLoading(false);
    }
  };

  const handleAttendance = (studentId: string, status: 'hadir' | 'izin' | 'sakit' | 'alpa') => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    if (!supabase || !profile) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const recordsToUpsert = students.map(student => ({
        student_id: student.id,
        recorded_by: profile.id,
        date: selectedDate,
        status: attendance[student.id] || 'hadir'
      }));

      if (recordsToUpsert.length === 0) {
        throw new Error('Tidak ada data siswa untuk disimpan');
      }

      const { error } = await supabase
        .from('attendance_students')
        .upsert(recordsToUpsert, { onConflict: 'student_id,date' });

      if (error) throw error;
      
      setSuccessMsg('Data absensi berhasil disimpan');
      
      // Refresh weekly data
      fetchStudentsAndAttendance();
    } catch (err: any) {
      console.error('Error saving attendance:', err);
      setError(err.message || 'Gagal menyimpan absensi');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nis.includes(searchTerm)
  );

  // Chart Data Calculation
  const getChartData = () => {
    let hadir = 0, izin = 0, sakit = 0, alpa = 0;
    Object.values(attendance).forEach(status => {
      if (status === 'hadir') hadir++;
      else if (status === 'izin') izin++;
      else if (status === 'sakit') sakit++;
      else if (status === 'alpa') alpa++;
    });

    return [
      { name: 'Hadir', value: hadir, color: '#10b981' }, // emerald-500
      { name: 'Izin', value: izin, color: '#3b82f6' },   // blue-500
      { name: 'Sakit', value: sakit, color: '#f59e0b' }, // amber-500
      { name: 'Alpa', value: alpa, color: '#ef4444' },   // red-500
    ].filter(item => item.value > 0);
  };

  const chartData = getChartData();

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm border border-emerald-100 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}><X size={16} /></button>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100 flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle size={16} className="mr-2" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}><X size={16} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Attendance Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Absensi Siswa</h1>
              <p className="text-slate-500 mt-1">Pilih kelas dan lakukan absensi harian.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kelas</label>
              <select 
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-600 focus:border-blue-600 block w-full p-3"
              >
                <option value="" disabled>Pilih Kelas</option>
                {classes.map((cls, idx) => (
                  <option key={idx} value={cls.name}>{cls.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <CalendarIcon className="w-5 h-5 text-slate-400" />
                </div>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-600 focus:border-blue-600 block w-full pl-10 p-3"
                />
              </div>
            </div>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <input 
              type="text" 
              className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-600 focus:border-blue-600 block w-full pl-10 p-3" 
              placeholder="Cari nama atau NIS siswa..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              Tidak ada data siswa untuk kelas ini.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-sm text-slate-500 bg-slate-50">
                      <th className="p-4 font-medium rounded-tl-xl">NIS</th>
                      <th className="p-4 font-medium">Nama Siswa</th>
                      <th className="p-4 font-medium text-center rounded-tr-xl">Status Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-mono text-slate-500">{student.nis}</td>
                        <td className="p-4 font-medium text-slate-900">{student.name}</td>
                        <td className="p-4">
                          <div className="flex justify-center space-x-2">
                            <button 
                              onClick={() => handleAttendance(student.id, 'hadir')}
                              className={clsx(
                                "px-4 py-2 rounded-full font-medium text-xs transition-colors border",
                                attendance[student.id] === 'hadir' 
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                              )}
                            >
                              Hadir
                            </button>
                            <button 
                              onClick={() => handleAttendance(student.id, 'izin')}
                              className={clsx(
                                "px-4 py-2 rounded-full font-medium text-xs transition-colors border",
                                attendance[student.id] === 'izin' 
                                  ? "bg-blue-100 text-blue-700 border-blue-200" 
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                              )}
                            >
                              Izin
                            </button>
                            <button 
                              onClick={() => handleAttendance(student.id, 'sakit')}
                              className={clsx(
                                "px-4 py-2 rounded-full font-medium text-xs transition-colors border",
                                attendance[student.id] === 'sakit' 
                                  ? "bg-amber-100 text-amber-700 border-amber-200" 
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                              )}
                            >
                              Sakit
                            </button>
                            <button 
                              onClick={() => handleAttendance(student.id, 'alpa')}
                              className={clsx(
                                "px-4 py-2 rounded-full font-medium text-xs transition-colors border",
                                attendance[student.id] === 'alpa' 
                                  ? "bg-red-100 text-red-700 border-red-200" 
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                              )}
                            >
                              Alpa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end">
                <button 
                  onClick={handleSaveAttendance}
                  disabled={saving}
                  className="flex items-center px-6 py-3 bg-blue-700 text-white rounded-xl font-bold hover:bg-blue-800 transition-colors shadow-sm disabled:opacity-50"
                >
                  <Save size={18} className="mr-2" />
                  {saving ? 'Menyimpan...' : 'Simpan Absensi'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Sidebar Summary & Chart */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Ringkasan Hari Ini</h3>
            
            {!loading && students.length > 0 ? (
              <>
                <div className="h-64 mb-6">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [`${value} Siswa`, 'Jumlah']}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                      Belum ada data absensi
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                    <span className="text-sm font-medium text-slate-600">Total Siswa</span>
                    <span className="text-sm font-bold text-slate-900">{students.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl">
                    <span className="text-sm font-medium text-emerald-700">Hadir</span>
                    <span className="text-sm font-bold text-emerald-700">
                      {Object.values(attendance).filter(s => s === 'hadir').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl">
                    <span className="text-sm font-medium text-blue-700">Izin</span>
                    <span className="text-sm font-bold text-blue-700">
                      {Object.values(attendance).filter(s => s === 'izin').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-amber-50 rounded-xl">
                    <span className="text-sm font-medium text-amber-700">Sakit</span>
                    <span className="text-sm font-bold text-amber-700">
                      {Object.values(attendance).filter(s => s === 'sakit').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-xl">
                    <span className="text-sm font-medium text-red-700">Alpa</span>
                    <span className="text-sm font-bold text-red-700">
                      {Object.values(attendance).filter(s => s === 'alpa').length}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm">
                Pilih kelas untuk melihat ringkasan
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Tren 7 Hari Terakhir</h3>
            {!loading && students.length > 0 ? (
              <div className="h-64">
                {weeklyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: '#f1f5f9' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="hadir" name="Hadir" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                      <Bar dataKey="izin" name="Izin" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="sakit" name="Sakit" stackId="a" fill="#f59e0b" />
                      <Bar dataKey="alpa" name="Alpa" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    Belum ada data tren
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm">
                Pilih kelas untuk melihat tren
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

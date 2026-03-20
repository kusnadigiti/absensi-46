import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Users, UserCheck, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const { profile } = useAuth();
  const today = format(new Date(), 'EEEE, dd MMMM yyyy', { locale: id });
  const todayDateStr = format(new Date(), 'yyyy-MM-dd');

  const [totalSiswa, setTotalSiswa] = useState(0);
  const [hadirHariIni, setHadirHariIni] = useState(0);
  const [tidakHadirHariIni, setTidakHadirHariIni] = useState(0);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch total siswa
        const { count: studentsCount, error: studentsError } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true });
          
        if (studentsError) throw studentsError;
        setTotalSiswa(studentsCount || 0);

        // Fetch attendance today
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance_students')
          .select('status')
          .eq('date', todayDateStr);
          
        if (attendanceError) throw attendanceError;
        
        const hadir = attendanceData?.filter(a => a.status === 'hadir').length || 0;
        const tidakHadir = attendanceData?.filter(a => a.status !== 'hadir').length || 0;
        
        setHadirHariIni(hadir);
        setTidakHadirHariIni(tidakHadir);

        // Fetch recent activities (last 5 attendance records)
        const { data: recentData, error: recentError } = await supabase
          .from('attendance_students')
          .select(`
            id,
            status,
            created_at,
            students (
              name,
              class_name
            )
          `)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (recentError) throw recentError;
        setRecentActivities(recentData || []);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [todayDateStr]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Selamat Datang, {profile?.name}</h1>
          <p className="text-slate-500 mt-1">Sistem Absensi Terpadu SMKN 46 Jakarta</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center bg-blue-50 text-blue-800 px-4 py-2 rounded-lg font-medium">
          <Calendar className="mr-2" size={20} />
          {today}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center">
          <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mr-4">
            <Users size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Siswa</p>
            <p className="text-2xl font-bold text-slate-900">
              {loading ? '...' : totalSiswa}
            </p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mr-4">
            <UserCheck size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Hadir Hari Ini</p>
            <p className="text-2xl font-bold text-slate-900">
              {loading ? '...' : hadirHariIni}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center">
          <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mr-4">
            <AlertCircle size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tidak Hadir Hari Ini</p>
            <p className="text-2xl font-bold text-slate-900">
              {loading ? '...' : tidakHadirHariIni}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900">Aktivitas Terkini</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-6 text-center text-slate-500">Memuat data...</div>
          ) : recentActivities.length === 0 ? (
            <div className="p-6 text-center text-slate-500">Belum ada aktivitas absensi</div>
          ) : (
            recentActivities.map((activity, index) => {
              const studentName = activity.students?.name || 'Siswa Tidak Diketahui';
              const className = activity.students?.class_name || '-';
              const statusText = activity.status === 'hadir' ? 'hadir' : 
                               activity.status === 'izin' ? 'izin' : 
                               activity.status === 'sakit' ? 'sakit' : 'alpa';
              
              const timeStr = activity.created_at ? format(new Date(activity.created_at), 'HH:mm') : '-';
              
              return (
                <div key={activity.id || index} className="px-6 py-4 flex items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold mr-4 uppercase">
                    {studentName.substring(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{studentName} ({className})</p>
                    <p className="text-xs text-slate-500">Telah dicatat dengan status: <span className="font-semibold">{statusText}</span></p>
                  </div>
                  <div className="text-sm text-slate-500">
                    {timeStr} WIB
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

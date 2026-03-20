import { Link } from 'react-router-dom';
import { GraduationCap, Code, Palette, Calculator, Store, Briefcase } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Navbar */}
      <nav className="bg-white shadow-sm py-4 px-6 lg:px-12 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center">
            <GraduationCap className="text-white" size={24} />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">SMKN 46 Jakarta</span>
        </div>
        <div>
          <Link 
            to="/login" 
            className="px-6 py-2.5 bg-blue-700 text-white rounded-full font-medium hover:bg-blue-800 transition-colors shadow-sm"
          >
            Login Sistem
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-6 lg:px-12 max-w-7xl mx-auto text-center">
        <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
          Sistem Absensi <br className="hidden lg:block"/> Terpadu
        </h1>
        <p className="text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          Platform digital untuk mengelola kehadiran siswa dan karyawan SMKN 46 Jakarta secara efisien, transparan, dan real-time.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link 
            to="/login" 
            className="px-8 py-4 bg-blue-700 text-white rounded-full font-semibold text-lg hover:bg-blue-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
          >
            Masuk ke Aplikasi
          </Link>
          <a 
            href="#jurusan" 
            className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-full font-semibold text-lg hover:bg-slate-50 transition-all"
          >
            Lihat Jurusan
          </a>
        </div>
      </section>

      {/* Jurusan Section */}
      <section id="jurusan" className="py-20 bg-white px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">Program Keahlian</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Membentuk generasi unggul yang siap kerja dan berdaya saing global melalui 5 program keahlian unggulan.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* AKL */}
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:shadow-xl transition-shadow group">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Calculator size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Akuntansi dan Keuangan Lembaga (AKL)</h3>
              <p className="text-slate-600 leading-relaxed">
                Mempelajari pengelolaan keuangan, pembukuan, akuntansi perusahaan, dan perpajakan secara profesional.
              </p>
            </div>

            {/* BR */}
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:shadow-xl transition-shadow group">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Store size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Bisnis Ritel (BR)</h3>
              <p className="text-slate-600 leading-relaxed">
                Fokus pada manajemen pemasaran, pengelolaan bisnis ritel, e-commerce, dan strategi penjualan.
              </p>
            </div>

            {/* MP */}
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:shadow-xl transition-shadow group">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Briefcase size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Manajemen Perkantoran (MP)</h3>
              <p className="text-slate-600 leading-relaxed">
                Mempelajari administrasi perkantoran, kearsipan digital, korespondensi, dan manajemen layanan bisnis.
              </p>
            </div>

            {/* DKV */}
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:shadow-xl transition-shadow group">
              <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Palette size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Desain Komunikasi Visual (DKV)</h3>
              <p className="text-slate-600 leading-relaxed">
                Mengembangkan kreativitas dalam desain grafis, ilustrasi, videografi, dan media komunikasi visual.
              </p>
            </div>

            {/* RPL */}
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:shadow-xl transition-shadow group">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Code size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Rekayasa Perangkat Lunak (RPL)</h3>
              <p className="text-slate-600 leading-relaxed">
                Fokus pada pengembangan aplikasi desktop, web, dan mobile, serta pemahaman algoritma dan basis data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 text-center">
        <p>&copy; {new Date().getFullYear()} SMKN 46 Jakarta. All rights reserved.</p>
      </footer>
    </div>
  );
}

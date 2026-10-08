'use client';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const [rooms, setRooms] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [filterType, setFilterType] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const ROOMS_PER_PAGE = 6;

  useEffect(() => {
    fetch('/api/rooms')
      .then((res) => res.json())
      .then((data) => setRooms(data.filter((r: any) => r.status === 'VACANT')))
      .catch(console.error);

    // Sinkronisasi dengan preferensi tema Admin
    if (
      localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const filteredRooms = rooms.filter((r: any) => {
    if (filterType === 'ALL') return true;
    return Number(r.monthly_price) === Number(filterType);
  });

  const totalPages = Math.ceil(filteredRooms.length / ROOMS_PER_PAGE);
  const displayedRooms = filteredRooms.slice(
    (currentPage - 1) * ROOMS_PER_PAGE,
    currentPage * ROOMS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {/* Navbar Minimalis */}
      <nav className="w-full px-6 py-6 max-w-6xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="font-black text-2xl text-white leading-none">B</span>
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
            BeresKos
          </span>
        </div>
        <a
          href="/login"
          className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          Login Admin →
        </a>
      </nav>

      {/* Hero Section (Match FinTrack) */}
      <header className="pt-16 pb-24 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight text-slate-900 dark:text-white leading-tight">
            Tempat tinggal{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-500">
              eksklusif
            </span>
            <br /> dan terkelola dengan baik.
          </h1>
          <p className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 font-medium mb-12 leading-relaxed">
            Sistem tagihan transparan, lapor kerusakan via WhatsApp, dan kas utilitas yang jelas.
            Tinggalkan ribetnya kos lama Anda.
          </p>
          <a
            href="#kamar"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-10 py-5 rounded-2xl text-lg shadow-xl shadow-indigo-500/25 transition-all inline-flex items-center gap-2"
          >
            Lihat Ketersediaan Kamar
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              ></path>
            </svg>
          </a>
        </div>
      </header>

      {/* Available Rooms Section (Match FinTrack Cards) */}
      <main id="kamar" className="max-w-6xl mx-auto pb-32 px-6">
        <div className="mb-8 flex justify-between items-end border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800 dark:text-white mb-2">
              Kamar Tersedia
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Siapa cepat dia dapat. Booking langsung via WhatsApp.
            </p>
          </div>
          <div className="hidden md:flex bg-white dark:bg-slate-800 px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {filteredRooms.length} Kosong
            </span>
          </div>
        </div>

        {/* Filter UI */}
        {rooms.length > 0 && (
          <div className="flex gap-3 mb-10 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => {
                setFilterType('ALL');
                setCurrentPage(1);
              }}
              className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all ${filterType === 'ALL' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              Semua Tipe
            </button>
            <button
              onClick={() => {
                setFilterType('1200000');
                setCurrentPage(1);
              }}
              className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all ${filterType === '1200000' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              Standar (Rp 1.2M)
            </button>
            <button
              onClick={() => {
                setFilterType('1500000');
                setCurrentPage(1);
              }}
              className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all ${filterType === '1500000' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              Menengah (Rp 1.5M)
            </button>
            <button
              onClick={() => {
                setFilterType('2000000');
                setCurrentPage(1);
              }}
              className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all ${filterType === '2000000' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              VIP (Rp 2.0M)
            </button>
          </div>
        )}

        {filteredRooms.length === 0 ? (
          <div className="py-24 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-2xl font-black text-slate-400 dark:text-slate-500 mb-2">
              Mohon Maaf 🙏
            </h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Saat ini semua kamar kami sedang penuh disewa.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayedRooms.map((r: any) => (
              <div
                key={r.id}
                className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/60 dark:border-slate-700 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-xl transition-all flex flex-col group"
              >
                <div className="h-48 bg-slate-200 dark:bg-slate-900 rounded-2xl relative overflow-hidden mb-6">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                  <img
                    src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80"
                    alt={`Kamar ${r.room_number}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute bottom-4 left-4 z-20">
                    <span className="bg-white/90 backdrop-blur text-slate-900 text-sm font-black px-4 py-1.5 rounded-full shadow-lg">
                      Kamar {r.room_number}
                    </span>
                  </div>
                </div>

                <div className="flex-grow flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400 mb-1 uppercase tracking-wider">
                        {Number(r.monthly_price) === 1200000
                          ? 'Standar (Kipas)'
                          : Number(r.monthly_price) === 1500000
                            ? 'Menengah (AC)'
                            : 'VIP (KM Dalam)'}
                      </p>
                      <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">
                        Rp {Number(r.monthly_price).toLocaleString('id-ID')}
                      </h3>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-2xl mb-6 space-y-3 flex-grow border border-slate-100 dark:border-slate-700 text-sm font-medium">
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                      <span className="w-5 h-5 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-xs">
                        ✓
                      </span>
                      Kasur Springbed & Lemari
                    </div>
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                      <span className="w-5 h-5 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-xs">
                        ✓
                      </span>
                      WiFi Ngebut 24 Jam
                    </div>
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                      <span className="w-5 h-5 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-xs">
                        ✓
                      </span>
                      {r.has_token_meter ? 'Token Listrik Mandiri' : 'Listrik Termasuk'}
                    </div>
                  </div>

                  <a
                    href={`https://wa.me/628123456789?text=Halo%20Admin,%20saya%20tertarik%20booking%20Kamar%20${r.room_number}%20(Tipe%20Rp%20${Number(r.monthly_price).toLocaleString('id-ID')}).`}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full text-center bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-slate-700 hover:bg-indigo-600 hover:border-indigo-600 dark:hover:bg-indigo-500 dark:hover:border-indigo-500 hover:text-white dark:hover:text-white font-bold py-4 rounded-2xl transition-all shadow-sm"
                  >
                    Booking via WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination UI */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-16">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-6 py-3 rounded-2xl font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              ← Sebelumnya
            </button>
            <span className="font-bold text-slate-500 dark:text-slate-400">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-6 py-3 rounded-2xl font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Selanjutnya →
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-10 text-center text-sm font-medium text-slate-500 dark:text-slate-500">
        <p>&copy; {new Date().getFullYear()} BeresKos Property Management.</p>
      </footer>
    </div>
  );
}

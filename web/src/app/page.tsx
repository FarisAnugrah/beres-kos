'use client';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    fetch('/api/rooms')
      .then((res) => res.json())
      .then((data) => setRooms(data.filter((r: any) => r.status === 'VACANT')))
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Hero Section */}
      <header className="bg-indigo-600 text-white py-20 px-6 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-indigo-700 opacity-50 transform -skew-y-3 origin-top-left -z-0"></div>
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl mx-auto mb-8 transform rotate-12">
            <span className="font-black text-5xl text-indigo-600 -rotate-12">B</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">BeresKos</h1>
          <p className="text-xl md:text-2xl text-indigo-100 font-medium mb-10 leading-relaxed">
            Tempat tinggal eksklusif, nyaman, dan terpusat. <br className="hidden md:block" />
            Tinggalkan ribetnya kos lama, pindah ke BeresKos hari ini.
          </p>
          <a
            href="#kamar"
            className="bg-white text-indigo-600 font-black px-8 py-4 rounded-full text-lg shadow-xl hover:scale-105 transition-transform inline-block"
          >
            Lihat Kamar Kosong
          </a>
        </div>
      </header>

      {/* Available Rooms Section */}
      <main id="kamar" className="max-w-6xl mx-auto py-20 px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mb-4">
            Kamar Tersedia Saat Ini
          </h2>
          <p className="text-slate-500 font-medium text-lg">
            Hanya tersisa {rooms.length} kamar. Siapa cepat dia dapat!
          </p>
        </div>

        {rooms.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-2xl font-bold text-slate-400 mb-2">Mohon Maaf 🙏</h3>
            <p className="text-slate-500 font-medium">
              Saat ini semua kamar kami sedang penuh disewa.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {rooms.map((r: any) => (
              <div
                key={r.id}
                className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-lg hover:shadow-xl transition-all group"
              >
                <div className="h-48 bg-slate-200 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10"></div>
                  <img
                    src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80"
                    alt="Room"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute bottom-4 left-4 z-20">
                    <span className="bg-white text-slate-800 text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                      Kamar {r.room_number}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="mb-6">
                    <p className="text-sm font-bold text-indigo-600 mb-1 uppercase tracking-wider">
                      {Number(r.monthly_price) === 1200000
                        ? 'Standar (Kipas)'
                        : Number(r.monthly_price) === 1500000
                          ? 'Menengah (AC)'
                          : 'VIP (KM Dalam)'}
                    </p>
                    <p className="text-3xl font-black text-slate-800">
                      Rp {Number(r.monthly_price).toLocaleString('id-ID')}
                      <span className="text-base text-slate-400 font-medium">/bln</span>
                    </p>
                  </div>
                  <ul className="space-y-3 mb-8 text-sm font-medium text-slate-600">
                    <li className="flex items-center gap-3">
                      <span className="text-emerald-500">✔️</span> Kasur Springbed & Lemari
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-emerald-500">✔️</span> WiFi Ngebut 24 Jam
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-emerald-500">✔️</span>{' '}
                      {r.has_token_meter ? 'Listrik Token Mandiri' : 'Listrik Include'}
                    </li>
                  </ul>
                  <a
                    href={`https://wa.me/628123456789?text=Halo%20Admin%20BeresKos,%20saya%20tertarik%20ingin%20booking%20Kamar%20${r.room_number}%20tipe%20Rp%20${Number(r.monthly_price).toLocaleString('id-ID')}.%20Apakah%20masih%20tersedia?`}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full text-center bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl transition-colors shadow-lg shadow-emerald-500/30"
                  >
                    Booking via WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 text-center text-sm font-medium">
        <p>&copy; {new Date().getFullYear()} BeresKos Property Management. All rights reserved.</p>
      </footer>
    </div>
  );
}

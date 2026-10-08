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
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-slate-900 selection:text-white">
      {/* Hero Section */}
      <header className="pt-32 pb-20 px-6 max-w-5xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-medium tracking-tight mb-6">
          BeresKos.
        </h1>
        <p className="text-xl text-slate-500 font-normal leading-relaxed max-w-2xl mb-12">
          Kamar sewa terkelola dengan sistem tagihan otomatis dan transparansi kas utilitas.
        </p>
        <a
          href="#kamar"
          className="inline-flex items-center justify-center bg-slate-900 text-white font-medium px-6 py-3 text-sm hover:bg-slate-800 transition-colors"
        >
          Lihat Ketersediaan
        </a>
      </header>

      {/* Available Rooms Section */}
      <main id="kamar" className="max-w-5xl mx-auto pb-32 px-6">
        <div className="mb-12 border-b border-slate-200 pb-4 flex justify-between items-end">
          <h2 className="text-2xl font-medium tracking-tight">
            Kamar Tersedia
          </h2>
          <p className="text-slate-500 text-sm">
            {rooms.length} kamar kosong
          </p>
        </div>

        {rooms.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-slate-500">
              Tidak ada kamar yang tersedia untuk disewa saat ini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((r: any) => (
              <div
                key={r.id}
                className="group border border-slate-200 hover:border-slate-400 transition-colors"
              >
                <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80"
                    alt={`Kamar ${r.room_number}`}
                    className="w-full h-full object-cover mix-blend-multiply opacity-90 group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-medium mb-1">
                        Kamar {r.room_number}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {Number(r.monthly_price) === 1200000
                          ? 'Standar (Kipas)'
                          : Number(r.monthly_price) === 1500000
                            ? 'Menengah (AC)'
                            : 'VIP (KM Dalam)'}
                      </p>
                    </div>
                    <p className="text-lg font-medium">
                      Rp {Number(r.monthly_price).toLocaleString('id-ID')}
                    </p>
                  </div>
                  
                  <div className="space-y-2 mb-8 text-sm text-slate-600">
                    <p>— Kasur & Lemari</p>
                    <p>— WiFi 24 Jam</p>
                    <p>— {r.has_token_meter ? 'Token Listrik Mandiri' : 'Listrik Termasuk'}</p>
                  </div>

                  <a
                    href={`https://wa.me/628123456789?text=Halo%20Admin,%20saya%20tertarik%20booking%20Kamar%20${r.room_number}.`}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full text-center border border-slate-900 text-slate-900 font-medium py-3 text-sm hover:bg-slate-900 hover:text-white transition-colors"
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
      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} BeresKos.</p>
      </footer>
    </div>
  );
}

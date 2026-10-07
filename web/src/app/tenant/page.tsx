'use client';
import { useEffect, useState } from 'react';

export default function TenantView() {
  const [ledger, setLedger] = useState({ balance: 0, transactions: [] });
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    fetch('/api/utilities/ledger')
      .then((res) => res.json())
      .then((data) => setLedger(data))
      .catch((err) => console.error(err));

    fetch('/api/announcements')
      .then((res) => res.json())
      .then((data) => setAnnouncements(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <main className="p-8 max-w-2xl mx-auto font-sans bg-slate-50 min-h-screen">
      <div className="text-center mb-10 pt-8">
        <h1 className="text-4xl font-black text-slate-800">Portal BeresKos</h1>
        <p className="text-slate-500 mt-2 font-medium">Informasi & Transparansi Khusus Penghuni</p>
      </div>

      {/* Notice Board */}
      {announcements.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-8 rounded-3xl border border-indigo-600 shadow-lg mb-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
              ></path>
            </svg>
            Papan Pengumuman
          </h2>
          <div className="space-y-4 relative z-10">
            {announcements.map((ann: any) => (
              <div
                key={ann.id}
                className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/20"
              >
                <p className="font-medium leading-relaxed">{ann.message}</p>
                <p className="text-xs font-bold text-indigo-200 mt-3">
                  {new Date(ann.created_at).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ledger Section (Real Data) */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm mb-8">
        <h2 className="text-xl font-bold mb-4 text-slate-800">Transparansi Kas Bersama</h2>
        <div className="text-5xl font-black text-blue-600 mb-8 tracking-tight">
          Rp {ledger.balance?.toLocaleString('id-ID') || 0}
        </div>

        <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
          <ul className="divide-y divide-slate-200">
            {ledger.transactions?.length === 0 ? (
              <li className="p-6 text-center text-slate-400 font-medium text-sm">
                Belum ada aktivitas belanja atau iuran.
              </li>
            ) : (
              ledger.transactions?.map((tx: any) => (
                <li
                  key={tx.id}
                  className="p-4 flex justify-between items-center text-sm hover:bg-slate-100 transition-colors"
                >
                  <span className="text-slate-600 font-medium">{tx.notes}</span>
                  <span
                    className={`font-bold px-3 py-1 rounded-full ${tx.type === 'INFLOW' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {tx.type === 'INFLOW' ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </main>
  );
}

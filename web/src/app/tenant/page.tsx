'use client';
import { useEffect, useState } from 'react';

export default function TenantView() {
  const [ledger, setLedger] = useState({ balance: 0, transactions: [] });
  
  useEffect(() => {
    fetch('/api/utilities/ledger')
      .then(res => res.json())
      .then(data => setLedger(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <main className="p-8 max-w-2xl mx-auto font-sans bg-slate-50 min-h-screen">
      <div className="text-center mb-10 pt-8">
        <h1 className="text-4xl font-black text-slate-800">Portal BeresKos</h1>
        <p className="text-slate-500 mt-2 font-medium">Transparansi Kas Dapur Tanpa Aplikasi</p>
      </div>

      {/* Ledger Section (Real Data) */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm mb-8">
        <h2 className="text-xl font-bold mb-4 text-slate-800">Transparansi Kas Bersama</h2>
        <div className="text-5xl font-black text-blue-600 mb-8 tracking-tight">
          Rp {ledger.balance?.toLocaleString('id-ID') || 0}
        </div>
        
        <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
          <ul className="divide-y divide-slate-200">
            {ledger.transactions?.length === 0 ? (
              <li className="p-6 text-center text-slate-400 font-medium text-sm">Belum ada aktivitas belanja atau iuran.</li>
            ) : ledger.transactions?.map((tx: any) => (
              <li key={tx.id} className="p-4 flex justify-between items-center text-sm hover:bg-slate-100 transition-colors">
                <span className="text-slate-600 font-medium">{tx.notes}</span>
                <span className={`font-bold px-3 py-1 rounded-full ${tx.type === 'INFLOW' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {tx.type === 'INFLOW' ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Simulasi Invoice (Mock UI yang akan dikirim via WA) */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-3xl border border-blue-100 shadow-sm">
        <h2 className="text-xl font-bold mb-2 text-blue-900">Simulasi Tagihan Bulanan</h2>
        <p className="text-blue-700 text-sm mb-6 leading-relaxed">
          Tampilan layar yang akan terbuka saat anak kos mengklik link yang dikirim Bot WA pada <strong>H-3 Penagihan</strong>.
        </p>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm text-center border border-blue-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full bg-red-500 text-white text-xs font-bold py-1">BELUM LUNAS</div>
          <h3 className="text-lg font-bold text-slate-800 mt-6">Sewa Kamar + Kas Galon</h3>
          <p className="text-4xl font-black text-slate-800 my-4">Rp 1.220.000</p>
          
          <div className="bg-slate-100 p-4 rounded-xl mx-auto w-48 h-48 mb-6 flex items-center justify-center border-2 border-dashed border-slate-300">
            <span className="text-slate-400 font-bold text-sm">QRIS DINAMIS<br/>(Generate by Gateway)</span>
          </div>
          
          <button onClick={() => alert('Webhook Payment Gateway akan dipanggil, status menjadi LUNAS, dan saldo kas bertambah Rp 20.000 otomatis.')} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
            Simulasi Scan & Bayar (Dummy)
          </button>
        </div>
      </div>
    </main>
  );
}
'use client';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [ledger, setLedger] = useState({ balance: 0, transactions: [] });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const resR = await fetch('/api/rooms');
      if (resR.ok) setRooms(await resR.json());

      const resL = await fetch('/api/utilities/ledger');
      if (resL.ok) setLedger(await resL.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const checkIn = async (roomId: string) => {
    const name = prompt('Nama Penyewa:');
    if (!name) return;
    const phone = prompt('Nomor WA (contoh: 6281...):');
    const dueDay = prompt('Tanggal Penagihan (1-31):');
    
    await fetch('/api/checkin', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, name, phone, dueDay: Number(dueDay), startDate: new Date().toISOString() })
    });
    loadData();
  };

  const checkOut = async (leaseId: string) => {
    if (!confirm('Yakin Check-out? Sistem akan hitung otomatis tagihan berjalan.')) return;
    
    const res = await fetch('/api/checkout', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leaseId })
    });
    const data = await res.json();
    alert(`Check-out berhasil. Tagihan akhir: Rp ${data.finalBill}`);
    loadData();
  };

  if (loading) return <div className="p-8 text-center">Memuat data...</div>;

  return (
    <main className="p-8 max-w-5xl mx-auto font-sans">
      <h1 className="text-4xl font-bold mb-8 text-slate-800">Admin BeresKos</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        {rooms.map((room: any) => (
          <div key={room.id} className={`p-6 rounded-2xl border-2 transition-all shadow-sm ${room.status === 'VACANT' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <h3 className="text-3xl font-black text-slate-800 mb-1">{room.room_number}</h3>
            <p className="text-slate-600 mb-6 font-medium h-6">
              {room.status === 'VACANT' ? 'Kosong' : room.tenant_name}
            </p>
            {room.status === 'VACANT' ? (
              <button onClick={() => checkIn(room.id)} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 hover:shadow-md transition-all active:scale-95">
                Check-In
              </button>
            ) : (
              <button onClick={() => checkOut(room.active_lease_id)} className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 hover:shadow-md transition-all active:scale-95">
                Check-Out
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">Kas Dapur Bersama (Galon & Gas)</h2>
        <div className="text-4xl font-black text-blue-600 mb-8 tracking-tight">
          Rp {ledger.balance.toLocaleString('id-ID')}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {ledger.transactions.length === 0 ? (
              <li className="p-6 text-slate-500 text-center font-medium">Belum ada transaksi.</li>
            ) : ledger.transactions.map((tx: any) => (
              <li key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <span className="text-slate-600 font-medium">{tx.notes}</span>
                <span className={`font-bold px-4 py-1 rounded-full ${tx.type === 'INFLOW' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {tx.type === 'INFLOW' ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
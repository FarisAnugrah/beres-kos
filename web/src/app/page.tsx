'use client';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [ledger, setLedger] = useState({ balance: 0, transactions: [] });
  const [loading, setLoading] = useState(true);

  // State untuk form & modal
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');

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

  const openCheckIn = (roomId: string) => {
    setSelectedRoomId(roomId);
    setIsCheckInOpen(true);
  };

  const handleCheckInSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append('roomId', selectedRoomId);
    formData.append('startDate', new Date().toISOString());

    await fetch('/api/checkin', {
      method: 'POST',
      body: formData, // FormData otomatis handle file upload (KTP)
    });
    
    setIsCheckInOpen(false);
    loadData();
  };

  const handleExpenseSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    await fetch('/api/utilities/expense', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Number(formData.get('amount')),
        notes: formData.get('notes')
      }),
    });
    
    setIsExpenseOpen(false);
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
    alert(`Check-out berhasil. Tagihan akhir: Rp ${data.finalBill.toLocaleString('id-ID')}`);
    loadData();
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat data...</div>;

  return (
    <main className="p-8 max-w-5xl mx-auto font-sans">
      <h1 className="text-4xl font-bold mb-8 text-slate-800">Admin BeresKos</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        {rooms.map((room: any) => (
          <div key={room.id} className={`p-6 rounded-2xl border-2 transition-all shadow-sm flex flex-col ${room.status === 'VACANT' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <h3 className="text-3xl font-black text-slate-800 mb-1">{room.room_number}</h3>
            <p className="text-slate-700 mb-2 font-bold h-6">
              {room.status === 'VACANT' ? 'Kosong' : room.tenant_name}
            </p>
            
            {room.status === 'OCCUPIED' ? (
              <div className="text-xs text-slate-600 mb-4 bg-white/60 p-3 rounded-lg border border-red-100 flex-grow">
                <div className="flex justify-between border-b border-red-100 pb-1 mb-1">
                  <span>Mulai Sewa:</span>
                  <span className="font-bold">{new Date(room.start_date).toLocaleDateString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Jatuh Tempo:</span>
                  <span className="font-bold text-red-600">Tgl {room.due_day_of_month}</span>
                </div>
              </div>
            ) : (
              <div className="flex-grow"></div>
            )}

            {room.status === 'VACANT' ? (
              <button onClick={() => openCheckIn(room.id)} className="w-full mt-auto bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 hover:shadow-md transition-all active:scale-95">
                Form Check-In
              </button>
            ) : (
              <button onClick={() => checkOut(room.active_lease_id)} className="w-full mt-auto bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 hover:shadow-md transition-all active:scale-95">
                Check-Out
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-sm relative">
        <button 
          onClick={() => setIsExpenseOpen(true)}
          className="absolute top-8 right-8 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700"
        >
          + Input Pengeluaran
        </button>
        
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

      {/* Check-In Modal */}
      {isCheckInOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Form Check-In Penyewa Baru</h2>
            <form onSubmit={handleCheckInSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nama Lengkap</label>
                <input required type="text" name="name" className="w-full border-2 border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none" placeholder="Budi Santoso" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nomor WhatsApp</label>
                <input required type="text" name="phone" className="w-full border-2 border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none" placeholder="62812345678" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tanggal Tagihan (1-31)</label>
                <input required type="number" min="1" max="31" name="dueDay" className="w-full border-2 border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none" placeholder="25" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Upload KTP (Opsional)</label>
                <input type="file" name="ktp" accept="image/*" className="w-full text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsCheckInOpen(false)} className="flex-1 py-3 font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition">Batal</button>
                <button type="submit" className="flex-1 py-3 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition">Simpan & Check-In</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isExpenseOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Catat Pengeluaran Kas</h2>
            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nominal (Rp)</label>
                <input required type="number" min="1" name="amount" className="w-full border-2 border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none" placeholder="20000" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Keterangan / Beli Apa</label>
                <input required type="text" name="notes" className="w-full border-2 border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none" placeholder="Isi Ulang Galon Aqua" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsExpenseOpen(false)} className="flex-1 py-3 font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition">Batal</button>
                <button type="submit" className="flex-1 py-3 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition">Simpan Pengeluaran</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
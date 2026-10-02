'use client';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [ledger, setLedger] = useState({ balance: 0, transactions: [] });
  const [loading, setLoading] = useState(true);

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

    await fetch('/api/checkin', { method: 'POST', body: formData });
    setIsCheckInOpen(false);
    loadData();
  };

  const handleExpenseSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await fetch('/api/utilities/expense', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(formData.get('amount')), notes: formData.get('notes') }),
    });
    setIsExpenseOpen(false);
    loadData();
  };

  const checkOut = async (leaseId: string) => {
    if (!confirm('Yakin Check-out? Sistem akan hitung otomatis tagihan berjalan.')) return;
    const res = await fetch('/api/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leaseId })
    });
    const data = await res.json();
    alert(`Check-out berhasil. Tagihan akhir: Rp ${data.finalBill.toLocaleString('id-ID')}`);
    loadData();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">Memuat dashboard...</div>;

  const occupiedCount = rooms.filter((r: any) => r.status === 'OCCUPIED').length;
  const vacantCount = rooms.length - occupiedCount;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-800">
      
      {/* Sidebar (FinTrack Style) */}
      <aside className="w-72 bg-[#0F172A] text-white flex flex-col shadow-2xl z-10 sticky top-0 h-screen">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="font-black text-xl leading-none">B</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">BeresKos</h1>
          </div>
          <p className="text-xs text-slate-400 font-medium ml-11">Property Manager</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <a href="#" className="flex items-center gap-3 bg-white/10 text-white px-4 py-3 rounded-2xl font-bold shadow-inner">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            Dashboard
          </a>
          <a href="/tenant" target="_blank" className="flex items-center gap-3 text-slate-400 hover:text-white hover:bg-white/5 px-4 py-3 rounded-2xl font-medium transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
            Portal Tenant
          </a>
        </nav>

        <div className="p-6">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 p-5 rounded-3xl shadow-xl">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Saldo Dapur</p>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            </div>
            <p className="text-2xl font-black text-white tracking-tight mb-4">
              <span className="text-slate-500 text-lg mr-1">Rp</span>
              {ledger.balance.toLocaleString('id-ID')}
            </p>
            <button onClick={() => setIsExpenseOpen(true)} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/25">
              + Catat Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 h-screen overflow-y-auto">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h2 className="text-4xl font-black text-slate-800 tracking-tight mb-1">Overview Kamar</h2>
            <p className="text-slate-500 font-medium">Pantau status sewa dan jatuh tempo secara real-time.</p>
          </div>
          <div className="hidden md:flex gap-4">
            <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="font-bold text-slate-700">{vacantCount} Kosong</span>
            </div>
            <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              <span className="font-bold text-slate-700">{occupiedCount} Terisi</span>
            </div>
          </div>
        </header>

        {/* Room Grid (FinTrack Style Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {rooms.map((room: any) => (
            <div key={room.id} className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-xl transition-all flex flex-col group">
              
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{room.room_number}</h3>
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                  room.status === 'VACANT' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                }`}>
                  {room.status === 'VACANT' ? 'Tersedia' : 'Disewa'}
                </span>
              </div>

              {room.status === 'VACANT' ? (
                <div className="flex-grow flex flex-col justify-center">
                  <p className="text-slate-400 text-sm font-medium mb-6">Belum ada penyewa.</p>
                  <button onClick={() => openCheckIn(room.id)} className="w-full mt-auto bg-slate-50 text-indigo-600 border border-indigo-100 font-bold py-3 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                    Isi Penghuni
                  </button>
                </div>
              ) : (
                <div className="flex-grow flex flex-col">
                  <p className="text-slate-800 font-bold text-lg leading-tight mb-4 truncate" title={room.tenant_name}>
                    {room.tenant_name}
                  </p>
                  
                  <div className="bg-slate-50 p-4 rounded-2xl mb-6 space-y-3 flex-grow border border-slate-100">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Masuk</span>
                      <span className="font-bold text-slate-700">{new Date(room.start_date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Jatuh Tempo</span>
                      <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">Tgl {room.due_day_of_month}</span>
                    </div>
                  </div>

                  <button onClick={() => checkOut(room.active_lease_id)} className="w-full bg-white text-rose-600 border border-rose-200 font-bold py-3 rounded-2xl hover:bg-rose-50 hover:border-rose-300 transition-all shadow-sm">
                    Proses Check-Out
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Ledger Recent Transactions */}
        <div className="mt-12">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Riwayat Kas Dapur Terakhir</h3>
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-4 px-6 font-bold text-slate-500">Keterangan</th>
                  <th className="py-4 px-6 font-bold text-slate-500">Tanggal</th>
                  <th className="py-4 px-6 font-bold text-slate-500 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.transactions.slice(0, 5).map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-medium text-slate-700">{tx.notes}</td>
                    <td className="py-4 px-6 text-slate-500">{new Date(tx.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="py-4 px-6 text-right">
                      <span className={`font-bold inline-flex items-center gap-1 ${tx.type === 'INFLOW' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === 'INFLOW' ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                      </span>
                    </td>
                  </tr>
                ))}
                {ledger.transactions.length === 0 && (
                  <tr><td colSpan={3} className="py-8 text-center text-slate-400 font-medium">Belum ada transaksi.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Check-In Modal (FinTrack Style) */}
      {isCheckInOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-100">
            <h2 className="text-2xl font-black mb-6 text-slate-800 tracking-tight">Data Penghuni Baru</h2>
            <form onSubmit={handleCheckInSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Nama Lengkap</label>
                <input required type="text" name="name" className="w-full border border-slate-200 rounded-2xl p-4 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-800" placeholder="Cth: Budi Santoso" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Nomor WhatsApp</label>
                <input required type="text" name="phone" className="w-full border border-slate-200 rounded-2xl p-4 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-800" placeholder="62812345678" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Tanggal Tagihan (1-31)</label>
                <input required type="number" min="1" max="31" name="dueDay" className="w-full border border-slate-200 rounded-2xl p-4 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-800" placeholder="25" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Upload KTP</label>
                <input type="file" name="ktp" accept="image/*" className="w-full text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 transition-all cursor-pointer border border-dashed border-slate-300 rounded-2xl p-2" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsCheckInOpen(false)} className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors">Batal</button>
                <button type="submit" className="flex-1 py-4 font-bold text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition-all">Simpan Data</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal (FinTrack Style) */}
      {isExpenseOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-100">
            <h2 className="text-2xl font-black mb-6 text-slate-800 tracking-tight">Catat Pengeluaran</h2>
            <form onSubmit={handleExpenseSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Nominal (Rp)</label>
                <input required type="number" min="1" name="amount" className="w-full border border-slate-200 rounded-2xl p-4 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-800 text-xl" placeholder="20000" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Keterangan / Item</label>
                <input required type="text" name="notes" className="w-full border border-slate-200 rounded-2xl p-4 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-800" placeholder="Cth: Isi Ulang Galon Aqua" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsExpenseOpen(false)} className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors">Batal</button>
                <button type="submit" className="flex-1 py-4 font-bold text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition-all">Simpan Catatan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
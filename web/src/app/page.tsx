'use client';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [ledger, setLedger] = useState({ balance: 0, transactions: [] });
  const [invoices, setInvoices] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [detailRoom, setDetailRoom] = useState<any>(null);
  const [checkOutRoom, setCheckOutRoom] = useState<any>(null);
  const [filterType, setFilterType] = useState('ALL');

  // Pagination & Filter untuk Tagihan
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceStart, setInvoiceStart] = useState('');
  const [invoiceEnd, setInvoiceEnd] = useState('');
  const INVOICE_PER_PAGE = 5;

  // Pagination & Filter untuk Kas Dapur
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerStart, setLedgerStart] = useState('');
  const [ledgerEnd, setLedgerEnd] = useState('');
  const LEDGER_PER_PAGE = 5;

  const loadData = async () => {
    try {
      const resR = await fetch('/api/rooms');
      if (resR.ok) setRooms(await resR.json());

      const resL = await fetch('/api/utilities/ledger');
      if (resL.ok) setLedger(await resL.json());

      const resI = await fetch('/api/invoices');
      if (resI.ok) setInvoices(await resI.json());

      const resT = await fetch('/api/tickets');
      if (resT.ok) setTickets(await resT.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Number(formData.get('amount')),
        notes: formData.get('notes'),
      }),
    });
    setIsExpenseOpen(false);
    loadData();
  };

  const handleAddRoomSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomNumber: formData.get('roomNumber'),
        monthlyPrice: Number(formData.get('monthlyPrice')),
      }),
    });
    setIsAddRoomOpen(false);
    loadData();
  };

  const handleConfirmCheckOut = async (leaseId: string) => {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leaseId }),
    });
    const data = await res.json();
    setCheckOutRoom(null);
    alert(
      `Status kamar berhasil dikosongkan!\nInvoice terakhir terbit: Rp ${data.finalBill.toLocaleString('id-ID')}\n(Pesan WA otomatis + QRIS telah terkirim)`
    );
    loadData();
  };

  const resolveTicket = async (ticketId: string) => {
    if (!confirm('Tandai laporan kerusakan ini sebagai sudah diperbaiki?')) return;
    await fetch(`/api/tickets/${ticketId}/resolve`, { method: 'POST' });
    loadData();
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">
        Memuat dashboard...
      </div>
    );

  const occupiedCount = rooms.filter((r: any) => r.status === 'OCCUPIED').length;
  const vacantCount = rooms.length - occupiedCount;

  const filteredRooms = rooms.filter((r: any) => {
    if (filterType === 'ALL') return true;
    return Number(r.monthly_price) === Number(filterType);
  });

  const filteredInvoices = invoices.filter((inv: any) => {
    if (!invoiceStart && !invoiceEnd) return true;
    const invDate = new Date(inv.created_at).toISOString().split('T')[0];
    if (invoiceStart && invDate < invoiceStart) return false;
    if (invoiceEnd && invDate > invoiceEnd) return false;
    return true;
  });

  const totalInvoicePages = Math.ceil(filteredInvoices.length / INVOICE_PER_PAGE);
  const displayedInvoices = filteredInvoices.slice(
    (invoicePage - 1) * INVOICE_PER_PAGE,
    invoicePage * INVOICE_PER_PAGE
  );

  const filteredLedger = ledger.transactions.filter((tx: any) => {
    if (!ledgerStart && !ledgerEnd) return true;
    const txDate = new Date(tx.created_at).toISOString().split('T')[0];
    if (ledgerStart && txDate < ledgerStart) return false;
    if (ledgerEnd && txDate > ledgerEnd) return false;
    return true;
  });

  const totalLedgerPages = Math.ceil(filteredLedger.length / LEDGER_PER_PAGE);
  const displayedLedger = filteredLedger.slice(
    (ledgerPage - 1) * LEDGER_PER_PAGE,
    ledgerPage * LEDGER_PER_PAGE
  );

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
          <a
            href="#"
            className="flex items-center gap-3 bg-white/10 text-white px-4 py-3 rounded-2xl font-bold shadow-inner"
          >
            <svg
              className="w-5 h-5 text-indigo-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              ></path>
            </svg>
            Dashboard
          </a>
          <a
            href="/tenant"
            target="_blank"
            className="flex items-center gap-3 text-slate-400 hover:text-white hover:bg-white/5 px-4 py-3 rounded-2xl font-medium transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              ></path>
            </svg>
            Portal Tenant
          </a>
        </nav>

        <div className="p-6">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 p-5 rounded-3xl shadow-xl">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Saldo Dapur
              </p>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            </div>
            <p className="text-2xl font-black text-white tracking-tight mb-4">
              <span className="text-slate-500 text-lg mr-1">Rp</span>
              {ledger.balance.toLocaleString('id-ID')}
            </p>
            <button
              onClick={() => setIsExpenseOpen(true)}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/25"
            >
              + Catat Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 h-screen overflow-y-auto">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h2 className="text-4xl font-black text-slate-800 tracking-tight mb-1">
              Overview Kamar
            </h2>
            <p className="text-slate-500 font-medium">
              Pantau status sewa dan jatuh tempo secara real-time.
            </p>
          </div>
          <div className="hidden md:flex gap-4 items-center">
            <button
              onClick={() => setIsAddRoomOpen(true)}
              className="bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm font-bold text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
            >
              + Tambah Kamar
            </button>
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

        {/* Filter UI */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${filterType === 'ALL' ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Semua Tipe
          </button>
          <button
            onClick={() => setFilterType('1200000')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${filterType === '1200000' ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Standar (Rp 1.2M)
          </button>
          <button
            onClick={() => setFilterType('1500000')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${filterType === '1500000' ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Menengah (Rp 1.5M)
          </button>
          <button
            onClick={() => setFilterType('2000000')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${filterType === '2000000' ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            VIP (Rp 2.0M)
          </button>
        </div>

        {/* Room Grid (FinTrack Style Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRooms.map((room: any) => (
            <div
              key={room.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-xl transition-all flex flex-col group"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-4xl font-black text-slate-800 tracking-tighter">
                    {room.room_number}
                  </h3>
                  <p className="text-sm font-bold text-slate-500 mt-1">
                    {Number(room.monthly_price) === 1200000
                      ? 'Standar (Kipas)'
                      : Number(room.monthly_price) === 1500000
                        ? 'Menengah (AC)'
                        : Number(room.monthly_price) === 2000000
                          ? 'VIP (KM Dalam)'
                          : 'Tipe Custom'}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 text-xs font-bold rounded-full ${
                    room.status === 'VACANT'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : 'bg-rose-50 text-rose-600 border border-rose-100'
                  }`}
                >
                  {room.status === 'VACANT' ? 'Tersedia' : 'Disewa'}
                </span>
              </div>

              {room.status === 'VACANT' ? (
                <div className="flex-grow flex flex-col justify-center">
                  <p className="text-slate-400 text-sm font-medium mb-6">Belum ada penyewa.</p>
                  <button
                    onClick={() => openCheckIn(room.id)}
                    className="w-full mt-auto bg-slate-50 text-indigo-600 border border-indigo-100 font-bold py-3 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                  >
                    Isi Penghuni
                  </button>
                </div>
              ) : (
                <div className="flex-grow flex flex-col">
                  <p
                    className="text-slate-800 font-bold text-lg leading-tight mb-4 truncate"
                    title={room.tenant_name}
                  >
                    {room.tenant_name}
                  </p>

                  <div className="bg-slate-50 p-4 rounded-2xl mb-6 space-y-3 flex-grow border border-slate-100">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Masuk</span>
                      <span className="font-bold text-slate-700">
                        {new Date(room.start_date).toLocaleDateString('id-ID', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Jatuh Tempo</span>
                      <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                        Tgl {room.due_day_of_month}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setDetailRoom(room)}
                    className="w-full mb-3 bg-slate-50 text-indigo-600 border border-indigo-100 font-bold py-3 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                  >
                    Detail Penyewa
                  </button>
                  <button
                    onClick={() => setCheckOutRoom(room)}
                    className="w-full bg-white text-rose-600 border border-rose-200 font-bold py-3 rounded-2xl hover:bg-rose-50 hover:border-rose-300 transition-all shadow-sm"
                  >
                    Proses Check-Out
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Invoice History & Ledger Wrapper */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Invoice History */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Riwayat Tagihan Sewa</h3>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={invoiceStart}
                  onChange={(e) => {
                    setInvoiceStart(e.target.value);
                    setInvoicePage(1);
                  }}
                  className="text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:border-indigo-500 outline-none w-36"
                  title="Dari Tanggal"
                />
                <span className="text-slate-400 font-bold self-center">-</span>
                <input
                  type="date"
                  value={invoiceEnd}
                  onChange={(e) => {
                    setInvoiceEnd(e.target.value);
                    setInvoicePage(1);
                  }}
                  className="text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:border-indigo-500 outline-none w-36"
                  title="Sampai Tanggal"
                />
              </div>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] overflow-hidden flex flex-col h-full max-h-[500px]">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-6 font-bold text-slate-500">Penghuni / Kamar</th>
                    <th className="py-4 px-6 font-bold text-slate-500 text-center">Status</th>
                    <th className="py-4 px-6 font-bold text-slate-500 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedInvoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800">{inv.tenant_name}</div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5">
                          Kamar {inv.room_number} •{' '}
                          {new Date(inv.created_at).toLocaleDateString('id-ID')}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`px-3 py-1 text-xs font-bold rounded-full ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {inv.status === 'PAID' ? 'LUNAS' : 'BELUM BAYAR'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-black text-slate-700">
                        Rp {Number(inv.total_amount).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-400 font-medium">
                        Belum ada riwayat tagihan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {totalInvoicePages > 1 && (
                <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-between items-center mt-auto">
                  <button
                    disabled={invoicePage === 1}
                    onClick={() => setInvoicePage((p) => p - 1)}
                    className="text-xs font-bold text-slate-600 px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Prev
                  </button>
                  <span className="text-xs font-bold text-slate-400">
                    Hal {invoicePage} / {totalInvoicePages}
                  </span>
                  <button
                    disabled={invoicePage === totalInvoicePages}
                    onClick={() => setInvoicePage((p) => p + 1)}
                    className="text-xs font-bold text-slate-600 px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Ledger Recent Transactions */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Riwayat Kas Dapur</h3>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={ledgerStart}
                  onChange={(e) => {
                    setLedgerStart(e.target.value);
                    setLedgerPage(1);
                  }}
                  className="text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:border-indigo-500 outline-none w-36"
                  title="Dari Tanggal"
                />
                <span className="text-slate-400 font-bold self-center">-</span>
                <input
                  type="date"
                  value={ledgerEnd}
                  onChange={(e) => {
                    setLedgerEnd(e.target.value);
                    setLedgerPage(1);
                  }}
                  className="text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:border-indigo-500 outline-none w-36"
                  title="Sampai Tanggal"
                />
              </div>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] overflow-hidden flex flex-col h-full max-h-[500px]">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-6 font-bold text-slate-500">Keterangan</th>
                    <th className="py-4 px-6 font-bold text-slate-500">Tanggal</th>
                    <th className="py-4 px-6 font-bold text-slate-500 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedLedger.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td
                        className="py-4 px-6 font-medium text-slate-700 max-w-[150px] truncate"
                        title={tx.notes}
                      >
                        {tx.notes}
                      </td>
                      <td className="py-4 px-6 text-slate-500">
                        {new Date(tx.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span
                          className={`font-bold inline-flex items-center gap-1 ${tx.type === 'INFLOW' ? 'text-emerald-600' : 'text-rose-600'}`}
                        >
                          {tx.type === 'INFLOW' ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredLedger.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-400 font-medium">
                        Belum ada transaksi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {totalLedgerPages > 1 && (
                <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-between items-center mt-auto">
                  <button
                    disabled={ledgerPage === 1}
                    onClick={() => setLedgerPage((p) => p - 1)}
                    className="text-xs font-bold text-slate-600 px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Prev
                  </button>
                  <span className="text-xs font-bold text-slate-400">
                    Hal {ledgerPage} / {totalLedgerPages}
                  </span>
                  <button
                    disabled={ledgerPage === totalLedgerPages}
                    onClick={() => setLedgerPage((p) => p + 1)}
                    className="text-xs font-bold text-slate-600 px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Laporan Kerusakan (Ticketing) */}
        <div className="mt-12">
          <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-6">
            Laporan Kerusakan & Komplain
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map((t: any) => (
              <div
                key={t.id}
                className={`p-6 rounded-2xl border-2 transition-all shadow-sm ${t.status === 'PENDING' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Kamar {t.room_number}
                    </span>
                    <span className="font-bold text-slate-800">{t.tenant_name}</span>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${t.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}
                  >
                    {t.status === 'PENDING' ? 'Perlu Dicek' : 'Selesai'}
                  </span>
                </div>
                <p className="text-slate-700 font-medium mb-6 bg-white p-4 rounded-xl border border-slate-100 italic">
                  "{t.description}"
                </p>
                {t.status === 'PENDING' && (
                  <button
                    onClick={() => resolveTicket(t.id)}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-all shadow-sm"
                  >
                    Tandai Sudah Diperbaiki
                  </button>
                )}
              </div>
            ))}
            {tickets.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 font-medium bg-slate-50 rounded-3xl border border-slate-200">
                Belum ada laporan kerusakan dari penyewa.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Check-In Modal (FinTrack Style) */}
      {isCheckInOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-100">
            <h2 className="text-2xl font-black mb-6 text-slate-800 tracking-tight">
              Data Penghuni Baru
            </h2>
            <form onSubmit={handleCheckInSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Nama Lengkap</label>
                <input
                  required
                  type="text"
                  name="name"
                  className="w-full border border-slate-200 rounded-2xl p-4 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-800"
                  placeholder="Cth: Budi Santoso"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">
                  Nomor WhatsApp
                </label>
                <input
                  required
                  type="text"
                  name="phone"
                  className="w-full border border-slate-200 rounded-2xl p-4 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-800"
                  placeholder="62812345678"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">
                  Tanggal Tagihan (1-31)
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  max="31"
                  name="dueDay"
                  className="w-full border border-slate-200 rounded-2xl p-4 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-800"
                  placeholder="25"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Upload KTP</label>
                <input
                  type="file"
                  name="ktp"
                  accept="image/*"
                  className="w-full text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 transition-all cursor-pointer border border-dashed border-slate-300 rounded-2xl p-2"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCheckInOpen(false)}
                  className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 font-bold text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition-all"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal (FinTrack Style) */}
      {isExpenseOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-100">
            <h2 className="text-2xl font-black mb-6 text-slate-800 tracking-tight">
              Catat Pengeluaran
            </h2>
            <form onSubmit={handleExpenseSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Nominal (Rp)</label>
                <input
                  required
                  type="number"
                  min="1"
                  name="amount"
                  className="w-full border border-slate-200 rounded-2xl p-4 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-800 text-xl"
                  placeholder="20000"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">
                  Keterangan / Item
                </label>
                <input
                  required
                  type="text"
                  name="notes"
                  className="w-full border border-slate-200 rounded-2xl p-4 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-800"
                  placeholder="Cth: Isi Ulang Galon Aqua"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsExpenseOpen(false)}
                  className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 font-bold text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition-all"
                >
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {isAddRoomOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-100">
            <h2 className="text-2xl font-black mb-6 text-slate-800 tracking-tight">
              Tambah Kamar Baru
            </h2>
            <form onSubmit={handleAddRoomSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Nomor Kamar</label>
                <input
                  required
                  type="text"
                  name="roomNumber"
                  className="w-full border border-slate-200 rounded-2xl p-4 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-800 uppercase"
                  placeholder="Cth: D1"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">
                  Pilih Tipe & Harga Sewa
                </label>
                <div className="space-y-3">
                  <label className="block cursor-pointer">
                    <input
                      type="radio"
                      name="monthlyPrice"
                      value="1200000"
                      className="peer sr-only"
                      required
                      defaultChecked
                    />
                    <div className="p-4 rounded-2xl border-2 border-slate-200 peer-checked:border-indigo-600 peer-checked:bg-indigo-50 hover:bg-slate-50 transition-all flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-800">Tipe Standar (Kipas)</div>
                        <div className="text-sm text-slate-500 font-medium">Fasilitas Dasar</div>
                      </div>
                      <div className="font-black text-indigo-600">Rp 1.2jt</div>
                    </div>
                  </label>
                  <label className="block cursor-pointer">
                    <input
                      type="radio"
                      name="monthlyPrice"
                      value="1500000"
                      className="peer sr-only"
                      required
                    />
                    <div className="p-4 rounded-2xl border-2 border-slate-200 peer-checked:border-indigo-600 peer-checked:bg-indigo-50 hover:bg-slate-50 transition-all flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-800">Tipe Menengah (AC)</div>
                        <div className="text-sm text-slate-500 font-medium">AC + Lemari</div>
                      </div>
                      <div className="font-black text-indigo-600">Rp 1.5jt</div>
                    </div>
                  </label>
                  <label className="block cursor-pointer">
                    <input
                      type="radio"
                      name="monthlyPrice"
                      value="2000000"
                      className="peer sr-only"
                      required
                    />
                    <div className="p-4 rounded-2xl border-2 border-slate-200 peer-checked:border-indigo-600 peer-checked:bg-indigo-50 hover:bg-slate-50 transition-all flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-800">Tipe VIP</div>
                        <div className="text-sm text-slate-500 font-medium">
                          Kamar Mandi Dalam + AC
                        </div>
                      </div>
                      <div className="font-black text-indigo-600">Rp 2.0jt</div>
                    </div>
                  </label>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddRoomOpen(false)}
                  className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 font-bold text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition-all"
                >
                  Buat Kamar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tenant Detail Modal */}
      {detailRoom && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-100">
            <h2 className="text-2xl font-black mb-6 text-slate-800 tracking-tight">
              Info Penghuni Kamar {detailRoom.room_number}
            </h2>
            <div className="space-y-5 mb-8">
              <div>
                <span className="text-slate-500 block text-xs font-bold uppercase tracking-wider mb-1">
                  Nama Lengkap
                </span>
                <span className="font-black text-xl text-slate-800">{detailRoom.tenant_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs font-bold uppercase tracking-wider mb-1">
                  WhatsApp
                </span>
                <a
                  href={`https://wa.me/${detailRoom.tenant_phone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-black text-lg text-indigo-600 hover:underline"
                >
                  {detailRoom.tenant_phone || '-'}
                </a>
              </div>
              <div>
                <span className="text-slate-500 block text-xs font-bold uppercase tracking-wider mb-2">
                  Dokumen KTP
                </span>
                {detailRoom.tenant_ktp ? (
                  <a
                    href={detailRoom.tenant_ktp}
                    target="_blank"
                    rel="noreferrer"
                    className="block group"
                  >
                    <img
                      src={detailRoom.tenant_ktp}
                      alt="KTP"
                      className="w-full h-48 object-cover rounded-2xl border-2 border-slate-200 group-hover:border-indigo-400 transition-colors shadow-sm"
                    />
                  </a>
                ) : (
                  <div className="w-full h-32 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 text-sm font-medium border-2 border-dashed border-slate-200">
                    Tidak ada KTP terlampir
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setDetailRoom(null)}
              className="w-full py-4 font-bold text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
            >
              Tutup Jendela
            </button>
          </div>
        </div>
      )}

      {/* Check-Out Preview Modal */}
      {checkOutRoom && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-100">
            <h2 className="text-2xl font-black mb-6 text-slate-800 tracking-tight">
              Terbitkan Invoice Akhir
            </h2>
            <div className="space-y-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-sm text-slate-500 mb-1 font-medium">Penghuni Keluar</p>
                <p className="font-bold text-slate-800 text-lg">
                  {checkOutRoom.tenant_name}{' '}
                  <span className="text-slate-400 font-medium text-sm">
                    (Kamar {checkOutRoom.room_number})
                  </span>
                </p>
              </div>

              {(() => {
                const today = new Date().getDate();
                const price = Number(checkOutRoom.monthly_price);
                const isProrate = today <= 5;
                const finalBill = isProrate ? today * 50000 : price;

                return (
                  <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100">
                    <p className="text-sm text-rose-600 font-bold mb-4 uppercase tracking-wider">
                      Rincian Prorata Otomatis
                    </p>
                    <div className="flex justify-between items-center mb-2 text-sm text-slate-700">
                      <span className="font-medium">Tgl Keluar Hari Ini:</span>
                      <span className="font-bold">Tanggal {today}</span>
                    </div>
                    <div className="flex justify-between items-center mb-4 text-sm text-slate-700">
                      <span className="font-medium">Skema Denda:</span>
                      <span className="font-bold">
                        {isProrate
                          ? `Prorata (Rp 50rb x ${today} hari)`
                          : 'Sewa 1 Bulan Penuh (> Tgl 5)'}
                      </span>
                    </div>
                    <div className="pt-4 border-t border-rose-200 flex justify-between items-center">
                      <span className="font-black text-rose-800">Total Ditagih</span>
                      <span className="font-black text-2xl text-rose-600">
                        Rp {finalBill.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setCheckOutRoom(null)}
                className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleConfirmCheckOut(checkOutRoom.active_lease_id)}
                className="flex-1 py-3 font-bold text-white bg-rose-600 rounded-2xl hover:bg-rose-700 shadow-lg shadow-rose-600/30 transition-all flex flex-col items-center justify-center leading-tight"
              >
                <span>Konfirmasi Checkout</span>
                <span className="text-xs font-medium text-rose-200 mt-0.5">
                  & Terbitkan Invoice WA
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

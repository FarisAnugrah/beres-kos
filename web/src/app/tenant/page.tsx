'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TenantLogin() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1 = Input Phone, 2 = Input OTP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/tenant/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Simpan nomor yg sudah dinormalisasi (berawalan 62)
      setPhone(data.cleanPhone);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/tenant/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Jika berhasil, simpan nomor HP ini di localStorage sebagai sesi "Login" di frontend
      localStorage.setItem('tenant_phone', phone);
      router.push('/tenant/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-xl border border-slate-100 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 mx-auto mb-6">
            <span className="font-black text-3xl text-white leading-none">B</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Portal Penyewa</h1>
          <p className="text-slate-500 font-medium mt-2">
            Masuk untuk melihat tagihan dan laporan kos Anda.
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-4 rounded-xl font-medium text-sm mb-6 border border-rose-100 text-center">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Nomor WhatsApp Terdaftar
              </label>
              <input
                required
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 08123456789"
                className="w-full border-2 border-slate-200 rounded-2xl p-4 focus:border-indigo-600 outline-none transition-colors font-medium text-slate-800"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/25 disabled:opacity-50"
            >
              {loading ? 'Mengirim...' : 'Kirim Kode OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Kode OTP (6 Digit)
              </label>
              <p className="text-xs text-slate-500 mb-4">
                Kode telah dikirim ke WA <b>{phone}</b>
              </p>
              <input
                required
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="000000"
                className="w-full border-2 border-slate-200 rounded-2xl p-4 text-center text-3xl tracking-[1em] font-black focus:border-indigo-600 outline-none transition-colors text-slate-800"
              />
            </div>
            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/25 disabled:opacity-50"
              >
                {loading ? 'Memverifikasi...' : 'Verifikasi & Masuk'}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-slate-500 font-bold py-3 hover:text-slate-700 transition-colors"
              >
                Ganti Nomor
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

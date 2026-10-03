'use client';
import { useState } from 'react';
import { loginAction } from '../actions';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await loginAction(password);
    if (success) {
      router.push('/');
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-3xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.15)] border border-slate-100 max-w-sm w-full">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-6 mx-auto">
          <span className="font-black text-3xl text-white leading-none">B</span>
        </div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2 text-center">Admin BeresKos</h1>
        <p className="text-slate-500 text-sm font-medium mb-8 text-center">Silakan masukkan password untuk mengakses dashboard manajemen.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan Password..." 
              className="w-full border border-slate-200 rounded-2xl p-4 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-800 text-center text-lg tracking-widest"
            />
            {error && <p className="text-rose-500 text-sm mt-3 font-bold text-center">❌ Password salah!</p>}
          </div>
          <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl shadow-slate-900/20 transition-all mt-2">
            Masuk ke Sistem
          </button>
        </form>
      </div>
    </div>
  );
}
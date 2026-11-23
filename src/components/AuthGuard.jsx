'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';

export default function AuthGuard({ children }) {
  const { usuario, esAdmin, cargandoAuth } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [ingresando, setIngresando] = useState(false);

  // Solo el Administrador puede entrar a Reportes
  const esRutaSoloAdmin = pathname.startsWith('/reportes');

  useEffect(() => {
    if (!cargandoAuth && usuario && !esAdmin && esRutaSoloAdmin) {
      router.replace('/ventas');
    }
  }, [cargandoAuth, usuario, esAdmin, esRutaSoloAdmin, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIngresando(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError('Correo o contraseña incorrectos.');
    }
    setIngresando(false);
  };

  if (cargandoAuth) {
    return (
      <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center text-slate-400 font-semibold">
        Verificando acceso a TAYCON...
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 bg-slate-900/80 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center font-black text-slate-950 text-2xl shadow-lg shadow-amber-500/20 mb-3">
              T
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">TAYCON</h1>
            <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold mt-0.5">
              Ferretería & Herramientas — Acceso Privado
            </p>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-950/60 border-l-4 border-red-500 text-red-300 text-sm font-medium rounded-r-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                placeholder="tienda1@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950/90 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950/90 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={ingresando}
              className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold py-3 rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {ingresando ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!esAdmin && esRutaSoloAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center text-slate-400 font-semibold">
        Redirigiendo al Punto de Venta...
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

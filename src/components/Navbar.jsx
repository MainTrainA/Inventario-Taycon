'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const pathname = usePathname();
  const { perfil, esAdmin, cerrarSesion } = useAuth();

  const navItems = esAdmin
    ? [
        { href: '/ventas', label: 'Punto de Venta', icon: '⚡' },
        { href: '/productos', label: 'Inventario y Catálogo', icon: '🛠️' },
        { href: '/reportes', label: 'Reporte Diario', icon: '📊' },
      ]
    : [{ href: '/ventas', label: 'Punto de Venta', icon: '⚡' }];

  return (
    <header className="sticky top-0 z-40 bg-[#0d1322]/90 backdrop-blur-md text-white border-b border-slate-800/80 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:h-16 gap-3">
          <Link href="/ventas" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center font-black text-slate-950 text-lg shadow-lg shadow-amber-500/20 group-hover:scale-105 transition">
              T
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-lg text-white block leading-none">
                TAYCON
              </span>
              <span className="text-[11px] uppercase tracking-widest text-amber-400 font-semibold">
                Ferretería & Herramientas
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 overflow-x-auto">
            <nav className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
              {navItems.map((item) => {
                const activo = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                      activo
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${
                  esAdmin
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                }`}
              >
                {esAdmin ? 'Admin' : perfil?.nombre || 'Vendedor'}
              </span>
              <button
                onClick={cerrarSesion}
                title="Cerrar sesión"
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 bg-slate-800 hover:bg-red-950 hover:text-red-400 border border-slate-700 hover:border-red-800/60 transition cursor-pointer"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

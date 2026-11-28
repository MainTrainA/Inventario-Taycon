'use client';

import { useEffect, useState } from 'react';
import {
  obtenerProformasPendientes,
  actualizarEstadoProforma,
  abrirWhatsAppProforma,
} from '@/services/proformasService';
import { formatearMoneda, formatearFechaHora } from '@/lib/formatters';

export default function BotonProformasPendientes({ tiendaId, nombreTienda, onCargarCarrito }) {
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busquedaProf, setBusquedaProf] = useState('');

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await obtenerProformasPendientes(tiendaId || null);
      setLista(data);
    } catch (error) {
      console.error('Error cargando proformas:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (tiendaId) cargar();
    const onUpdate = () => cargar();
    window.addEventListener('proformas-actualizadas', onUpdate);
    return () => window.removeEventListener('proformas-actualizadas', onUpdate);
  }, [tiendaId]);

  const handleConvertir = async (prof) => {
    if (onCargarCarrito && Array.isArray(prof.items)) {
      onCargarCarrito(prof.items);
    }
    await actualizarEstadoProforma(prof.id, 'CONVERTIDA');
    setAbierto(false);
    cargar();
  };

  const handleDescartar = async (prof) => {
    if (!window.confirm(`¿Descartar la proforma de ${prof.cliente}?`)) return;
    await actualizarEstadoProforma(prof.id, 'CANCELADA');
    cargar();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAbierto(true);
          cargar();
        }}
        className="mt-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-amber-950/60 hover:bg-amber-900/70 text-amber-300 border border-amber-700/60 transition cursor-pointer inline-flex items-center gap-2"
      >
        <span>📋 Proformas Pendientes</span>
        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[11px]">
          {lista.length}
        </span>
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#111827] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-white">📋 Proformas Pendientes</h3>
                <p className="text-xs text-slate-400">
                  Carga una cotización al carrito para convertirla en venta real.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
                            <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Buscar proforma por nombre de cliente o teléfono..."
                  value={busquedaProf}
                  onChange={(e) => setBusquedaProf(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {busquedaProf && (
                  <button
                    type="button"
                    onClick={() => setBusquedaProf('')}
                    className="absolute right-3 top-2 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
              {cargando ? (
                <div className="py-8 text-center text-slate-400 text-sm">Cargando proformas...</div>
              ) : lista.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm">
                  No hay proformas pendientes en esta sucursal.
                </div>
              ) : (
                lista.filter((p) => { const q = busquedaProf.trim().toLowerCase(); if (!q) return true; return (p.cliente || '').toLowerCase().includes(q) || (p.telefono || '').toLowerCase().includes(q); }).map((prof) => (
                  <div
                    key={prof.id}
                    className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-extrabold text-white text-sm">
                        {prof.cliente}
                        {prof.telefono && (
                          <span className="ml-2 text-xs font-normal text-slate-400">
                            ({prof.telefono})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {formatearFechaHora(prof.fecha_creacion)} · {(prof.items || []).length} ítem(s)
                      </div>
                      <div className="text-sm font-black text-amber-400 mt-1">
                        Total: {formatearMoneda(prof.total)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleConvertir(prof)}
                        className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                      >
                        ⚡ Cargar al Carrito
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          abrirWhatsAppProforma({
                            nombreTienda,
                            cliente: prof.cliente,
                            telefono: prof.telefono,
                            items: prof.items,
                            total: prof.total,
                          })
                        }
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                      >
                        📱 WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDescartar(prof)}
                        className="px-2.5 py-2 rounded-xl text-xs font-bold bg-red-950/60 hover:bg-red-900/70 text-red-400 border border-red-800/60 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}


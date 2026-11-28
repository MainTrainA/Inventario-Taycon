'use client';

import { useState } from 'react';
import {
  crearProforma,
  calcularTotalItems,
  abrirWhatsAppProforma,
} from '@/services/proformasService';
import { formatearMoneda } from '@/lib/formatters';

export default function BotonProforma({ carrito = [], tiendaId, nombreTienda }) {
  const [abierto, setAbierto] = useState(false);
  const [cliente, setCliente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const total = calcularTotalItems(carrito);

  const handleGenerar = async (e) => {
    e.preventDefault();
    if (!carrito.length) return;
    setError('');
    setGuardando(true);
    try {
      await crearProforma({
        tiendaId,
        cliente,
        telefono,
        items: carrito,
      });

      abrirWhatsAppProforma({
        nombreTienda,
        cliente: cliente.trim() || 'Cliente General',
        telefono,
        items: carrito,
        total,
      });

      setCliente('');
      setTelefono('');
      setAbierto(false);
      window.dispatchEvent(new Event('proformas-actualizadas'));
    } catch (err) {
      setError(err.message || 'No se pudo generar la proforma.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={!carrito.length}
        onClick={() => setAbierto(true)}
        className="w-full mt-2.5 py-2.5 px-4 rounded-xl text-sm font-extrabold text-amber-300 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-600/50 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        📄 Generar Proforma por WhatsApp (Sin descontar stock)
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#111827] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-white">📄 Nueva Proforma</h3>
                <p className="text-xs text-slate-400">
                  {carrito.length} herramienta(s) · Total: {formatearMoneda(total)}
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

            <form onSubmit={handleGenerar} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-950/60 border-l-4 border-red-500 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nombre del Cliente / Maestro
                </label>
                <input
                  type="text"
                  placeholder="Ej: Maestro Juan Pérez"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  WhatsApp del Cliente (Opcional)
                </label>
                <input
                  type="tel"
                  placeholder="Ej: 71234567 (si lo dejas vacío va al 65638679)"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAbierto(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2.5 rounded-xl text-sm font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-300 transition cursor-pointer disabled:opacity-50"
                >
                  {guardando ? 'Generando...' : '📱 Guardar y Enviar WhatsApp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

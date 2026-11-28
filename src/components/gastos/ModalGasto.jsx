'use client';

import { useState } from 'react';
import { CATEGORIAS_GASTO, registrarGasto } from '@/services/gastosService';

export default function ModalGasto({ abierto, onCerrar, tiendaId, nombreTienda, onGuardado }) {
  const [categoria, setCategoria] = useState('Comida del día');
  const [monto, setMonto] = useState('');
  const [detalle, setDetalle] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  if (!abierto) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      await registrarGasto({
        tiendaId,
        categoria,
        detalle,
        monto,
      });
      setMonto('');
      setDetalle('');
      if (onGuardado) await onGuardado();
      onCerrar();
    } catch (err) {
      setError(err.message || 'No se pudo guardar el gasto.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111827] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-white">💸 Registrar Gasto</h3>
            {nombreTienda && (
              <p className="text-xs text-slate-400">Sucursal: {nombreTienda}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-950/60 border-l-4 border-red-500 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Tipo de Gasto *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIAS_GASTO.map((cat) => {
                const activo = categoria === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoria(cat.id)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold border text-left transition cursor-pointer flex items-center gap-2 ${
                      activo
                        ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-rose-400 uppercase tracking-wider mb-1.5">
              Monto Gastado (Bs) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.1"
              required
              placeholder="Ej: 6, 25, 180..."
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border-2 border-rose-500/60 rounded-xl text-white font-extrabold text-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Detalle (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Jugo, almuerzo, factura noviembre..."
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onCerrar}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2.5 rounded-xl text-sm font-extrabold text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 shadow-lg shadow-rose-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar Gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

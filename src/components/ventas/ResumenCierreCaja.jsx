'use client';

import { useEffect, useState, useMemo } from 'react';
import { obtenerGastosDesde } from '@/services/gastosService';
import { formatearMoneda } from '@/lib/formatters';

export default function ResumenCierreCaja({ ventasHoy = [], tiendaId, nombreTienda }) {
  const [gastosHoy, setGastosHoy] = useState(0);

  const cargarGastos = async () => {
    try {
      const inicioHoy = new Date();
      inicioHoy.setHours(0, 0, 0, 0);
      const lista = await obtenerGastosDesde(inicioHoy.toISOString(), tiendaId || null);
      const suma = lista.reduce((acc, g) => acc + (parseFloat(g.monto) || 0), 0);
      setGastosHoy(suma);
    } catch (error) {
      console.error('Error cargando gastos para cierre de caja:', error);
    }
  };

  useEffect(() => {
    if (tiendaId) cargarGastos();
  }, [tiendaId, ventasHoy.length]);

  const { totalEfectivo, totalQR, efectivoEnCaja } = useMemo(() => {
    let ef = 0;
    let qr = 0;

    (ventasHoy || []).forEach((v) => {
      const monto = parseFloat(v.total_venta) || 0;
      if ((v.metodo_pago || 'EFECTIVO') === 'QR') {
        qr += monto;
      } else {
        ef += monto;
      }
    });

    return {
      totalEfectivo: ef,
      totalQR: qr,
      efectivoEnCaja: ef - gastosHoy,
    };
  }, [ventasHoy, gastosHoy]);

  return (
    <div className="mt-4 bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <span>🧾 Cierre de Caja Hoy</span>
          {nombreTienda && <span className="text-amber-400">— {nombreTienda}</span>}
        </h3>
        <button
          type="button"
          onClick={cargarGastos}
          className="text-[11px] font-bold text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer"
        >
          ↻ Actualizar
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase">💵 Ventas Efectivo</span>
          <div className="text-lg font-black text-white mt-0.5">{formatearMoneda(totalEfectivo)}</div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
          <span className="text-[11px] font-bold text-sky-400 uppercase">📱 Ventas por QR</span>
          <div className="text-lg font-black text-sky-400 mt-0.5">{formatearMoneda(totalQR)}</div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
          <span className="text-[11px] font-bold text-rose-400 uppercase">➖ Gastos Hoy</span>
          <div className="text-lg font-black text-rose-400 mt-0.5">-{formatearMoneda(gastosHoy)}</div>
        </div>

        <div className="bg-emerald-950/40 border border-emerald-700/60 rounded-xl p-3">
          <span className="text-[11px] font-bold text-emerald-300 uppercase">🏦 Efectivo en Cajón</span>
          <div className="text-lg font-black text-emerald-400 mt-0.5">
            {formatearMoneda(efectivoEnCaja)}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { obtenerGastosDesde } from '@/services/gastosService';
import { formatearMoneda } from '@/lib/formatters';
import ModalGasto from '@/components/gastos/ModalGasto';

export default function BotonGastoRapido({ tiendaId, nombreTienda }) {
  const [abierto, setAbierto] = useState(false);
  const [gastoHoy, setGastoHoy] = useState(0);

  const cargarGastoHoy = async () => {
    try {
      const inicioHoy = new Date();
      inicioHoy.setHours(0, 0, 0, 0);
      const lista = await obtenerGastosDesde(inicioHoy.toISOString(), tiendaId || null);
      const suma = lista.reduce((acc, g) => acc + (parseFloat(g.monto) || 0), 0);
      setGastoHoy(suma);
    } catch (error) {
      console.error('Error cargando gastos de hoy:', error);
    }
  };

  useEffect(() => {
    if (tiendaId) cargarGastoHoy();
  }, [tiendaId]);

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="px-4 py-2 rounded-xl text-xs font-extrabold bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-700/60 transition cursor-pointer flex items-center gap-2"
        >
          <span>➖ Registrar Gasto (Luz, Agua, Gas, WiFi, Comida)</span>
        </button>

        <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 border border-slate-800 text-slate-300">
          Gastos hoy: <strong className="text-rose-400">{formatearMoneda(gastoHoy)}</strong>
        </span>
      </div>

      <ModalGasto
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        tiendaId={tiendaId}
        nombreTienda={nombreTienda}
        onGuardado={cargarGastoHoy}
      />
    </>
  );
}

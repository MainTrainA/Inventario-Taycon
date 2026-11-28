'use client';

import { useEffect, useState } from 'react';
import { obtenerAuditoria } from '@/services/auditoriaService';
import { formatearFechaHora } from '@/lib/formatters';

const estilosAccion = {
  ANULAR_VENTA: 'bg-red-950/70 text-red-400 border-red-800/60',
  EDITAR_PRODUCTO: 'bg-amber-950/70 text-amber-400 border-amber-700/60',
  AJUSTE_STOCK: 'bg-sky-950/70 text-sky-400 border-sky-800/60',
  TRASPASO_STOCK: 'bg-violet-950/70 text-violet-400 border-violet-800/60',
  ELIMINAR_PRODUCTO: 'bg-rose-950/70 text-rose-400 border-rose-800/60',
};

const etiquetasAccion = {
  ANULAR_VENTA: 'Anuló Venta',
  EDITAR_PRODUCTO: 'Editó Precio/Dato',
  AJUSTE_STOCK: 'Ajustó Stock',
  TRASPASO_STOCK: 'Traspaso',
  ELIMINAR_PRODUCTO: 'Eliminó Producto',
};

export default function TablaAuditoria() {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargarLogs = async () => {
    setCargando(true);
    try {
      const data = await obtenerAuditoria(60);
      setRegistros(data);
    } catch (error) {
      console.error('Error cargando auditoría:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarLogs();
  }, []);

  return (
    <div className="mt-8 bg-[#111827] rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
      <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-white text-lg">
            🛡️ Registro de Auditoría (Quién hizo qué)
          </h2>
          <p className="text-xs text-slate-400">
            Últimos 60 movimientos sensibles: anulaciones, cambios de precio, ajustes de stock y eliminaciones.
          </p>
        </div>

        <button
          type="button"
          onClick={cargarLogs}
          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
        >
          ↻ Actualizar
        </button>
      </div>

      {cargando ? (
        <div className="p-10 text-center text-slate-400 text-sm">Cargando registro de auditoría...</div>
      ) : registros.length === 0 ? (
        <div className="p-10 text-center text-slate-500 text-sm">
          Aún no hay movimientos registrados en la auditoría.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <th className="py-3.5 px-4 font-bold">Fecha y Hora</th>
                <th className="py-3.5 px-4 font-bold">Cuenta / Usuario</th>
                <th className="py-3.5 px-4 font-bold">Acción</th>
                <th className="py-3.5 px-4 font-bold">Detalle del Cambio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-sm">
              {registros.map((reg) => (
                <tr key={reg.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                    {formatearFechaHora(reg.creado_en)}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-200 whitespace-nowrap">
                    {reg.usuario_email}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        estilosAccion[reg.accion] || 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {etiquetasAccion[reg.accion] || reg.accion}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{reg.detalle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

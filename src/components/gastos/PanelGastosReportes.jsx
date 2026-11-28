'use client';

import { useEffect, useState, useMemo } from 'react';
import { CATEGORIAS_GASTO, obtenerGastosDesde, eliminarGasto } from '@/services/gastosService';
import { formatearMoneda, formatearFechaHora } from '@/lib/formatters';
import ModalGasto from '@/components/gastos/ModalGasto';

export default function PanelGastosReportes() {
  const [gastosAnio, setGastosAnio] = useState([]);
  const [periodo, setPeriodo] = useState('DIA');
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);

  const cargarGastos = async () => {
    setCargando(true);
    try {
      const inicioAnio = new Date(new Date().getFullYear(), 0, 1, 0, 0, 0, 0);
      const data = await obtenerGastosDesde(inicioAnio.toISOString());
      setGastosAnio(data);
    } catch (error) {
      console.error('Error cargando gastos:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarGastos();
  }, []);

  const { totalHoy, totalMes, totalAnio, listaFiltrada, porCategoria } = useMemo(() => {
    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0);

    let hoy = 0;
    let mes = 0;
    let anio = 0;

    gastosAnio.forEach((g) => {
      const f = new Date(g.fecha_gasto);
      const m = parseFloat(g.monto) || 0;
      anio += m;
      if (f >= inicioMes) mes += m;
      if (f >= inicioHoy) hoy += m;
    });

    const filtrados = gastosAnio.filter((g) => {
      const f = new Date(g.fecha_gasto);
      if (periodo === 'DIA') return f >= inicioHoy;
      if (periodo === 'MES') return f >= inicioMes;
      return true;
    });

    const mapaCat = {};
    CATEGORIAS_GASTO.forEach((c) => {
      mapaCat[c.id] = { ...c, total: 0 };
    });
    filtrados.forEach((g) => {
      if (!mapaCat[g.categoria]) {
        mapaCat[g.categoria] = { id: g.categoria, label: g.categoria, icon: '📦', total: 0 };
      }
      mapaCat[g.categoria].total += parseFloat(g.monto) || 0;
    });

    return {
      totalHoy: hoy,
      totalMes: mes,
      totalAnio: anio,
      listaFiltrada: filtrados,
      porCategoria: Object.values(mapaCat),
    };
  }, [gastosAnio, periodo]);

  const handleEliminar = async (gasto) => {
    if (!window.confirm(`¿Eliminar el gasto de ${formatearMoneda(gasto.monto)} (${gasto.categoria})?`)) {
      return;
    }
    await eliminarGasto(gasto);
    cargarGastos();
  };

  return (
    <div className="mt-8 bg-[#111827] rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
      <div className="p-5 border-b border-slate-800 bg-slate-900/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-white text-lg">
            💸 Control de Gastos Reales (Luz, Agua, Gas, WiFi, Comida)
          </h2>
          <p className="text-xs text-slate-400">
            Revisa exactamente cuánto gastaste hoy, este mes y en todo el año.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'DIA', label: 'Hoy' },
              { id: 'MES', label: 'Este Mes' },
              { id: 'ANIO', label: 'Este Año' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPeriodo(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  periodo === tab.id ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setModalAbierto(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-500 text-white transition cursor-pointer"
          >
            + Nuevo Gasto
          </button>
        </div>
      </div>

      {/* Tarjetas Hoy / Mes / Año */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-800">
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 border-l-4 border-l-rose-500">
          <span className="text-xs font-bold text-slate-400 uppercase">Gastado Hoy</span>
          <div className="text-2xl font-black text-rose-400 mt-1">{formatearMoneda(totalHoy)}</div>
        </div>
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 border-l-4 border-l-amber-500">
          <span className="text-xs font-bold text-slate-400 uppercase">Gastado Este Mes</span>
          <div className="text-2xl font-black text-amber-400 mt-1">{formatearMoneda(totalMes)}</div>
        </div>
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 border-l-4 border-l-violet-500">
          <span className="text-xs font-bold text-slate-400 uppercase">Gastado Este Año</span>
          <div className="text-2xl font-black text-white mt-1">{formatearMoneda(totalAnio)}</div>
        </div>
      </div>

      {/* Desglose por Categoría */}
      <div className="px-5 py-4 bg-slate-950/40 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {porCategoria.map((c) => (
          <div key={c.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 font-semibold">
              {c.icon} {c.label}
            </div>
            <div className="text-sm font-extrabold text-white mt-1">
              {formatearMoneda(c.total)}
            </div>
          </div>
        ))}
      </div>

      {/* Lista de Gastos */}
      {cargando ? (
        <div className="p-8 text-center text-slate-400 text-sm">Cargando gastos...</div>
      ) : listaFiltrada.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-sm">
          No hay gastos registrados en este período.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <th className="py-3 px-4 font-bold">Fecha y Hora</th>
                <th className="py-3 px-4 font-bold">Categoría</th>
                <th className="py-3 px-4 font-bold">Detalle</th>
                <th className="py-3 px-4 font-bold">Registrado por</th>
                <th className="py-3 px-4 font-bold text-rose-400">Monto</th>
                <th className="py-3 px-4 font-bold text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-sm">
              {listaFiltrada.map((g) => (
                <tr key={g.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 text-slate-400">{formatearFechaHora(g.fecha_gasto)}</td>
                  <td className="py-3 px-4 font-bold text-white">{g.categoria}</td>
                  <td className="py-3 px-4 text-slate-300">{g.detalle || '—'}</td>
                  <td className="py-3 px-4 text-xs text-slate-400">{g.usuario_email}</td>
                  <td className="py-3 px-4 font-extrabold text-rose-400">
                    -{formatearMoneda(g.monto)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleEliminar(g)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-red-400 bg-red-950/50 hover:bg-red-900/70 border border-red-800/60 cursor-pointer"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ModalGasto
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        tiendaId={null}
        nombreTienda="General / Administración"
        onGuardado={cargarGastos}
      />
    </div>
  );
}

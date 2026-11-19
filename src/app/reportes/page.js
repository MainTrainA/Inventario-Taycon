'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { obtenerTiendas } from '@/services/productosService';
import { formatearMoneda, formatearFechaHora } from '@/lib/formatters';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';

export default function PaginaReportes() {
  const [tiendas, setTiendas] = useState([]);
  const [filtroTienda, setFiltroTienda] = useState('TODAS');
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    const hoy = new Date();
    return hoy.toLocaleDateString('en-CA');
  });
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargarReporte = async () => {
    setCargando(true);
    try {
      const listaTiendas = await obtenerTiendas();
      setTiendas(listaTiendas);

      const [anio, mes, dia] = fechaSeleccionada.split('-').map(Number);
      const inicio = new Date(anio, mes - 1, dia, 0, 0, 0, 0);
      const fin = new Date(anio, mes - 1, dia, 23, 59, 59, 999);

      let query = supabase
        .from('ventas')
        .select(`
          *,
          tiendas ( nombre )
        `)
        .gte('fecha_venta', inicio.toISOString())
        .lte('fecha_venta', fin.toISOString())
        .order('fecha_venta', { ascending: false });

      if (filtroTienda !== 'TODAS') {
        query = query.eq('tienda_id', filtroTienda);
      }

      const { data, error } = await query;
      if (error) throw error;
      setVentas(data || []);
    } catch (error) {
      console.error('Error cargando reporte:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarReporte();
  }, [fechaSeleccionada, filtroTienda]);

  // Agrupar datos por código de herramienta para la gráfica de barras animada
  const datosGraficaProductos = useMemo(() => {
    const mapa = {};
    ventas.forEach((v) => {
      if (!mapa[v.codigo_producto]) {
        mapa[v.codigo_producto] = {
          codigo: v.codigo_producto,
          nombre: v.nombre_producto,
          Vendido: 0,
          Ganancia: 0,
          unidades: 0,
        };
      }
      mapa[v.codigo_producto].Vendido += parseFloat(v.total_venta) || 0;
      mapa[v.codigo_producto].Ganancia += parseFloat(v.ganancia_neta) || 0;
      mapa[v.codigo_producto].unidades += parseInt(v.cantidad, 10) || 0;
    });
    return Object.values(mapa);
  }, [ventas]);

  // Comparativa animada entre Tienda 1 y Tienda 2
  const datosGraficaTiendas = useMemo(() => {
    const mapa = {
      'Tienda 1': { tienda: 'Tienda 1', Ingresos: 0, Ganancia: 0 },
      'Tienda 2': { tienda: 'Tienda 2', Ingresos: 0, Ganancia: 0 },
    };
    ventas.forEach((v) => {
      const nombreT = v.tiendas?.nombre || 'Tienda 1';
      if (!mapa[nombreT]) {
        mapa[nombreT] = { tienda: nombreT, Ingresos: 0, Ganancia: 0 };
      }
      mapa[nombreT].Ingresos += parseFloat(v.total_venta) || 0;
      mapa[nombreT].Ganancia += parseFloat(v.ganancia_neta) || 0;
    });
    return Object.values(mapa);
  }, [ventas]);

  const totalIngresos = ventas.reduce((acc, v) => acc + parseFloat(v.total_venta), 0);
  const totalGanancia = ventas.reduce((acc, v) => acc + parseFloat(v.ganancia_neta), 0);
  const totalUnidades = ventas.reduce((acc, v) => acc + parseInt(v.cantidad, 10), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Reporte Diario y Analítica Visual
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Gráficas animadas de rendimiento por herramienta, sucursal y ganancia neta.
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-[#111827] p-5 rounded-2xl shadow-xl border border-slate-800 mb-8 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Fecha a Consultar
          </label>
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-950/90 border border-slate-700 rounded-xl font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition [color-scheme:dark]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Filtrar por Sucursal
          </label>
          <select
            value={filtroTienda}
            onChange={(e) => setFiltroTienda(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-950/90 border border-slate-700 rounded-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
          >
            <option value="TODAS">📊 Todas las Tiendas (Consolidado)</option>
            {tiendas.map((t) => (
              <option key={t.id} value={t.id}>
                🏪 Solo {t.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tarjetas Resumen KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-[#111827] p-5 rounded-2xl shadow-lg border border-slate-800 border-l-4 border-l-amber-500">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Vendido en el Día
          </div>
          <div className="text-3xl font-extrabold text-white mt-1">
            {formatearMoneda(totalIngresos)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Ingresos totales del filtro actual</div>
        </div>

        <div className="bg-[#111827] p-5 rounded-2xl shadow-lg border border-slate-800 border-l-4 border-l-emerald-500">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            Ganancia Neta del Día
          </div>
          <div
            className={`text-3xl font-extrabold mt-1 ${
              totalGanancia >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatearMoneda(totalGanancia)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Diferencia entre precio real y costo</div>
        </div>

        <div className="bg-[#111827] p-5 rounded-2xl shadow-lg border border-slate-800 border-l-4 border-l-sky-500">
          <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">
            Herramientas / Ítems Vendidos
          </div>
          <div className="text-3xl font-extrabold text-white mt-1">
            {totalUnidades} <span className="text-base font-semibold text-slate-500">unid.</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">En {ventas.length} operaciones</div>
        </div>
      </div>

      {/* SECCIÓN DE GRÁFICAS DE BARRAS ANIMADAS */}
      {!cargando && ventas.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Gráfica 1: Ventas vs Ganancia por Código de Herramienta */}
          <div className="lg:col-span-2 bg-[#111827] p-6 rounded-2xl shadow-xl border border-slate-800">
            <div className="mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                Rendimiento por Código de Herramienta (Bs)
              </h2>
              <p className="text-xs text-slate-400">
                Comparativa animada entre monto vendido y ganancia neta por cada código
              </p>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={datosGraficaProductos}
                  margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                  barGap={8}
                >
                  <defs>
                    <linearGradient id="gradVendido" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                      <stop offset="100%" stopColor="#d97706" stopOpacity={0.75} />
                    </linearGradient>
                    <linearGradient id="gradGanancia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.75} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="codigo"
                    stroke="#94a3b8"
                    tick={{ fill: '#f8fafc', fontWeight: 'bold', fontSize: 12 }}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#1e293b', opacity: 0.45 }}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)',
                    }}
                    formatter={(value) => formatearMoneda(value)}
                  />
                  <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '13px' }} />
                  <Bar
                    dataKey="Vendido"
                    name="Total Vendido"
                    fill="url(#gradVendido)"
                    radius={[8, 8, 0, 0]}
                    animationDuration={1100}
                    animationEasing="ease-out"
                  />
                  <Bar
                    dataKey="Ganancia"
                    name="Ganancia Neta"
                    fill="url(#gradGanancia)"
                    radius={[8, 8, 0, 0]}
                    animationDuration={1400}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfica 2: Comparativa Tienda 1 vs Tienda 2 */}
          <div className="bg-[#111827] p-6 rounded-2xl shadow-xl border border-slate-800">
            <div className="mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                Ingresos por Sucursal
              </h2>
              <p className="text-xs text-slate-400">Tienda 1 vs Tienda 2</p>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={datosGraficaTiendas}
                  margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="tienda"
                    stroke="#94a3b8"
                    tick={{ fill: '#f8fafc', fontWeight: 'bold', fontSize: 12 }}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#1e293b', opacity: 0.45 }}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                    }}
                    formatter={(value) => formatearMoneda(value)}
                  />
                  <Bar
                    dataKey="Ingresos"
                    name="Vendido (Bs)"
                    radius={[10, 10, 0, 0]}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  >
                    {datosGraficaTiendas.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? '#38bdf8' : '#a78bfa'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tabla Detallada */}
      <div className="bg-[#111827] rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <h2 className="font-bold text-white text-lg">Desglose Detallado de Ventas</h2>
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-800 text-amber-400 border border-slate-700">
            {ventas.length} registros
          </span>
        </div>

        {cargando ? (
          <div className="p-12 text-center text-slate-400 font-medium">Generando reporte...</div>
        ) : ventas.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-300 font-semibold">Sin ventas en esta fecha</p>
            <p className="text-sm text-slate-500 mt-1">
              Prueba seleccionando otra fecha o cambia el filtro de sucursal.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <th className="py-3.5 px-4 font-bold">Hora</th>
                  <th className="py-3.5 px-4 font-bold">Sucursal</th>
                  <th className="py-3.5 px-4 font-bold">Código</th>
                  <th className="py-3.5 px-4 font-bold">Producto / Potencia</th>
                  <th className="py-3.5 px-4 font-bold text-center">Cant.</th>
                  <th className="py-3.5 px-4 font-bold">P. Vendido</th>
                  <th className="py-3.5 px-4 font-bold">Costo</th>
                  <th className="py-3.5 px-4 font-bold">Total</th>
                  <th className="py-3.5 px-4 font-bold text-emerald-400">Ganancia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-sm">
                {ventas.map((v) => {
                  const esTienda1 = v.tiendas?.nombre === 'Tienda 1';
                  return (
                    <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 text-slate-400">{formatearFechaHora(v.fecha_venta)}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                            esTienda1
                              ? 'bg-sky-950 text-sky-400 border border-sky-800/60'
                              : 'bg-violet-950 text-violet-400 border border-violet-800/60'
                          }`}
                        >
                          {v.tiendas?.nombre || 'Tienda'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-amber-500/30 text-amber-400 font-mono font-bold text-xs">
                          {v.codigo_producto}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-100">{v.nombre_producto}</td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-white">{v.cantidad}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-200">
                        {formatearMoneda(v.precio_vendido)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{formatearMoneda(v.costo_unitario)}</td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        {formatearMoneda(v.total_venta)}
                      </td>
                      <td
                        className={`py-3.5 px-4 font-extrabold ${
                          parseFloat(v.ganancia_neta) >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {formatearMoneda(v.ganancia_neta)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

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

  // Estados para Analítica por Período (Día / Semana / Mes / Año)
  const [periodoTop, setPeriodoTop] = useState('MES');
  const [criterioTop, setCriterioTop] = useState('UNIDADES');
  const [ventasPeriodo, setVentasPeriodo] = useState([]);
  const [cargandoTop, setCargandoTop] = useState(true);

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

  const cargarRankingPeriodo = async () => {
    setCargandoTop(true);
    try {
      const ahora = new Date();
      let inicioPeriodo = new Date();

      if (periodoTop === 'DIA') {
        inicioPeriodo.setHours(0, 0, 0, 0);
      } else if (periodoTop === 'SEMANA') {
        const diaSemana = ahora.getDay();
        const diffLunes = diaSemana === 0 ? 6 : diaSemana - 1;
        inicioPeriodo = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - diffLunes, 0, 0, 0, 0);
      } else if (periodoTop === 'MES') {
        inicioPeriodo = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0);
      } else if (periodoTop === 'ANIO') {
        inicioPeriodo = new Date(ahora.getFullYear(), 0, 1, 0, 0, 0, 0);
      }

      let query = supabase
        .from('ventas')
        .select(`
          codigo_producto,
          nombre_producto,
          cantidad,
          total_venta,
          ganancia_neta,
          tienda_id,
          fecha_venta,
          tiendas ( nombre )
        `)
        .gte('fecha_venta', inicioPeriodo.toISOString())
        .lte('fecha_venta', ahora.toISOString());

      if (filtroTienda !== 'TODAS') {
        query = query.eq('tienda_id', filtroTienda);
      }

      const { data, error } = await query;
      if (error) throw error;
      setVentasPeriodo(data || []);
    } catch (error) {
      console.error('Error cargando ranking de productos:', error);
    } finally {
      setCargandoTop(false);
    }
  };

  useEffect(() => {
    cargarReporte();
  }, [fechaSeleccionada, filtroTienda]);

  useEffect(() => {
    cargarRankingPeriodo();
  }, [periodoTop, filtroTienda]);

  // 1. Ganancia y Total Vendido por cada Tienda en el período seleccionado
  const resumenPorTienda = useMemo(() => {
    const mapa = {};
    tiendas.forEach((t) => {
      mapa[t.nombre] = { nombre: t.nombre, vendido: 0, ganancia: 0, operaciones: 0 };
    });

    ventasPeriodo.forEach((v) => {
      const nombreT = v.tiendas?.nombre || 'Sucursal';
      if (!mapa[nombreT]) {
        mapa[nombreT] = { nombre: nombreT, vendido: 0, ganancia: 0, operaciones: 0 };
      }
      mapa[nombreT].vendido += parseFloat(v.total_venta) || 0;
      mapa[nombreT].ganancia += parseFloat(v.ganancia_neta) || 0;
      mapa[nombreT].operaciones += 1;
    });

    return Object.values(mapa);
  }, [ventasPeriodo, tiendas]);

  // 2. Evolución de ventas y Mejor Día / Mes del período
  const analisisTiempo = useMemo(() => {
    const mapa = {};
    const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    ventasPeriodo.forEach((v) => {
      const f = new Date(v.fecha_venta);
      let clave = '';
      let etiqueta = '';

      if (periodoTop === 'DIA') {
        const hora = String(f.getHours()).padStart(2, '0');
        clave = hora;
        etiqueta = `${hora}:00`;
      } else if (periodoTop === 'ANIO') {
        const m = f.getMonth();
        clave = String(m).padStart(2, '0');
        etiqueta = mesesNombres[m];
      } else {
        clave = f.toLocaleDateString('en-CA');
        etiqueta = `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!mapa[clave]) {
        mapa[clave] = { clave, etiqueta, Vendido: 0, Ganancia: 0, unidades: 0 };
      }
      mapa[clave].Vendido += parseFloat(v.total_venta) || 0;
      mapa[clave].Ganancia += parseFloat(v.ganancia_neta) || 0;
      mapa[clave].unidades += parseInt(v.cantidad, 10) || 0;
    });

    const serie = Object.values(mapa).sort((a, b) => a.clave.localeCompare(b.clave));
    const mejor = serie.length > 0
      ? serie.reduce((max, item) => (item.Vendido > max.Vendido ? item : max), serie[0])
      : null;

    return { serie, mejor };
  }, [ventasPeriodo, periodoTop]);

  // 3. Ranking de Productos Más Vendidos (con soporte de empates)
  const rankingProductos = useMemo(() => {
    const mapa = {};
    ventasPeriodo.forEach((v) => {
      if (!mapa[v.codigo_producto]) {
        mapa[v.codigo_producto] = {
          codigo: v.codigo_producto,
          nombre: v.nombre_producto,
          unidades: 0,
          vendido: 0,
          ganancia: 0,
        };
      }
      mapa[v.codigo_producto].unidades += parseInt(v.cantidad, 10) || 0;
      mapa[v.codigo_producto].vendido += parseFloat(v.total_venta) || 0;
      mapa[v.codigo_producto].ganancia += parseFloat(v.ganancia_neta) || 0;
    });

    const lista = Object.values(mapa).sort((a, b) => {
      if (criterioTop === 'UNIDADES') {
        return b.unidades - a.unidades || b.ganancia - a.ganancia;
      }
      return b.ganancia - a.ganancia || b.unidades - a.unidades;
    });

    if (lista.length === 0) return { items: [], lideres: [] };

    const getValor = (item) => (criterioTop === 'UNIDADES' ? item.unidades : item.ganancia);
    const maxValor = Math.max(...lista.map(getValor), 1);
    const valorTop1 = getValor(lista[0]);

    let puestoActual = 1;
    const itemsConRango = lista.slice(0, 10).map((item, index) => {
      const val = getValor(item);
      if (index > 0 && val < getValor(lista[index - 1])) {
        puestoActual = index + 1;
      }
      const esLider = val === valorTop1 && val > 0;
      const porcentajeBarra = Math.max(6, Math.round((val / maxValor) * 100));
      return { ...item, puesto: puestoActual, esLider, porcentajeBarra };
    });

    return { items: itemsConRango, lideres: itemsConRango.filter((i) => i.esLider) };
  }, [ventasPeriodo, criterioTop]);

  const totalIngresos = ventas.reduce((acc, v) => acc + parseFloat(v.total_venta), 0);
  const totalGanancia = ventas.reduce((acc, v) => acc + parseFloat(v.ganancia_neta), 0);
  const totalUnidades = ventas.reduce((acc, v) => acc + parseInt(v.cantidad, 10), 0);

  const etiquetasPeriodo = {
    DIA: 'Hoy',
    SEMANA: 'Esta Semana',
    MES: 'Este Mes',
    ANIO: 'Este Año',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Reportes y Control de Ganancias
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Control total de ventas por tienda, mejores días/meses y productos más vendidos.
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-[#111827] p-5 rounded-2xl shadow-xl border border-slate-800 mb-8 grid grid-cols-1 md:grid-cols-2 gap-5">
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

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Período de Análisis (Gráficas y Top)
          </label>
          <div className="grid grid-cols-4 gap-2 bg-slate-950/90 p-1.5 rounded-xl border border-slate-700">
            {[
              { id: 'DIA', label: 'Hoy' },
              { id: 'SEMANA', label: 'Semana' },
              { id: 'MES', label: 'Mes' },
              { id: 'ANIO', label: 'Año' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPeriodoTop(tab.id)}
                className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  periodoTop === tab.id
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 1. CUÁNTO VENDIÓ Y GANÓ CADA TIENDA EN EL PERÍODO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {resumenPorTienda.map((t, idx) => (
          <div
            key={t.nombre}
            className={`bg-[#111827] p-5 rounded-2xl shadow-lg border border-slate-800 border-l-4 ${
              idx === 0 ? 'border-l-sky-500' : 'border-l-violet-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t.nombre} — {etiquetasPeriodo[periodoTop]}
              </span>
              <span className="text-xs text-slate-500">{t.operaciones} ventas</span>
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {formatearMoneda(t.vendido)}
            </div>
            <div className="text-sm font-bold text-emerald-400 mt-1">
              Ganancia neta: {formatearMoneda(t.ganancia)}
            </div>
          </div>
        ))}

        {/* Tarjeta: Mejor Día / Mes / Hora del período */}
        <div className="bg-[#111827] p-5 rounded-2xl shadow-lg border border-slate-800 border-l-4 border-l-amber-500">
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            {periodoTop === 'DIA'
              ? 'Hora con Más Ventas'
              : periodoTop === 'ANIO'
              ? 'Mes con Más Ventas'
              : 'Día con Más Ventas'}
          </div>
          {analisisTiempo.mejor ? (
            <>
              <div className="text-2xl font-extrabold text-white mt-2">
                {analisisTiempo.mejor.etiqueta}
              </div>
              <div className="text-sm font-bold text-emerald-400 mt-1">
                {formatearMoneda(analisisTiempo.mejor.Vendido)} ({analisisTiempo.mejor.unidades} unid.)
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-500 mt-3">Sin ventas en este período</div>
          )}
        </div>
      </div>

      {/* 2. GRÁFICA: QUÉ DÍA / MES SE VENDIÓ MÁS */}
      <div className="bg-[#111827] p-6 rounded-2xl shadow-xl border border-slate-800 mb-8">
        <div className="mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            Evolución de Ventas y Ganancias — {etiquetasPeriodo[periodoTop]}
          </h2>
          <p className="text-xs text-slate-400">
            Compara rápidamente qué {periodoTop === 'DIA' ? 'hora' : periodoTop === 'ANIO' ? 'mes' : 'día'} tuvo mayor facturación y ganancia neta.
          </p>
        </div>

        {cargandoTop ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
            Cargando gráfica...
          </div>
        ) : analisisTiempo.serie.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
            No hay ventas registradas en {etiquetasPeriodo[periodoTop].toLowerCase()}.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analisisTiempo.serie} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="etiqueta"
                  stroke="#94a3b8"
                  tick={{ fill: '#f8fafc', fontWeight: 'bold', fontSize: 12 }}
                />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
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
                <Legend />
                <Bar dataKey="Vendido" name="Total Vendido (Bs)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Ganancia" name="Ganancia Neta (Bs)" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 3. RANKING DE PRODUCTOS MÁS VENDIDOS */}
      <div className="bg-[#111827] rounded-2xl shadow-xl border border-slate-800 overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-800 bg-slate-900/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-white">
              🏆 Productos Más Vendidos — {etiquetasPeriodo[periodoTop]}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ordenados por cantidad vendida o ganancia neta generada.
            </p>
          </div>

          <div className="inline-flex bg-slate-950/90 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setCriterioTop('UNIDADES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                criterioTop === 'UNIDADES' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Por Cantidad
            </button>
            <button
              type="button"
              onClick={() => setCriterioTop('GANANCIA')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                criterioTop === 'GANANCIA' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Por Ganancia
            </button>
          </div>
        </div>

        <div className="p-6">
          {cargandoTop ? (
            <div className="py-8 text-center text-slate-400 text-sm">Calculando ranking...</div>
          ) : rankingProductos.items.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              Aún no hay productos vendidos en {etiquetasPeriodo[periodoTop].toLowerCase()}.
            </div>
          ) : (
            <div className="space-y-3">
              {rankingProductos.items.map((item) => (
                <div key={item.codigo} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                          item.puesto === 1 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        #{item.puesto}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-amber-500/30 text-amber-400 font-mono font-bold text-xs">
                        {item.codigo}
                      </span>
                      <span className="font-bold text-slate-100 text-sm">{item.nombre}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs sm:text-sm">
                      <span className="font-extrabold text-sky-400">{item.unidades} unid.</span>
                      <span className="text-slate-600">|</span>
                      <span className="text-slate-300 font-semibold">{formatearMoneda(item.vendido)}</span>
                      <span className="text-slate-600">|</span>
                      <span className="font-extrabold text-emerald-400">+{formatearMoneda(item.ganancia)}</span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${item.porcentajeBarra}%` }}
                      className={`h-full rounded-full transition-all duration-700 ${
                        item.esLider
                          ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                          : 'bg-gradient-to-r from-sky-500 to-indigo-500'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. CONSULTA DE FECHA EXACTA (HISTORIAL DIARIO) */}
      <div className="bg-[#111827] rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-white text-lg">Detalle de Ventas por Fecha Exacta</h2>
            <p className="text-xs text-slate-400">
              Total del día: <strong className="text-white">{formatearMoneda(totalIngresos)}</strong> | Ganancia:{' '}
              <strong className="text-emerald-400">{formatearMoneda(totalGanancia)}</strong> ({totalUnidades} unid.)
            </p>
          </div>

          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            className="px-3.5 py-2 bg-slate-950/90 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-500 [color-scheme:dark]"
          />
        </div>

        {cargando ? (
          <div className="p-12 text-center text-slate-400 font-medium">Generando reporte...</div>
        ) : ventas.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Sin ventas en esta fecha.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <th className="py-3.5 px-4 font-bold">Hora</th>
                  <th className="py-3.5 px-4 font-bold">Sucursal</th>
                  <th className="py-3.5 px-4 font-bold">Código</th>
                  <th className="py-3.5 px-4 font-bold">Producto</th>
                  <th className="py-3.5 px-4 font-bold text-center">Cant.</th>
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
                      <td className="py-3.5 px-4 font-bold text-white">{formatearMoneda(v.total_venta)}</td>
                      <td className="py-3.5 px-4 font-extrabold text-emerald-400">
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

'use client';

import { useEffect, useState } from 'react';
import { obtenerTiendas, obtenerCatalogoConStock } from '@/services/productosService';
import { registrarVenta, obtenerVentasDelDia } from '@/services/ventasService';
import { formatearMoneda, formatearFechaHora } from '@/lib/formatters';

export default function PaginaVentas() {
  const [tiendas, setTiendas] = useState([]);
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState('');
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [precioVendido, setPrecioVendido] = useState('');
  const [ventasHoy, setVentasHoy] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const cargarTodo = async (idTiendaFiltro = null) => {
    setCargando(true);
    try {
      const [listaTiendas, listaProductos] = await Promise.all([
        obtenerTiendas(),
        obtenerCatalogoConStock(),
      ]);
      setTiendas(listaTiendas);
      setProductos(listaProductos);

      const tiendaActiva = idTiendaFiltro || tiendaSeleccionada || listaTiendas[0]?.id || '';
      if (!tiendaSeleccionada && tiendaActiva) {
        setTiendaSeleccionada(tiendaActiva);
      }

      const listaVentas = await obtenerVentasDelDia(tiendaActiva);
      setVentasHoy(listaVentas);
    } catch (error) {
      console.error('Error cargando datos de ventas:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  const handleCambioTienda = async (nuevoId) => {
    setTiendaSeleccionada(nuevoId);
    setProductoSeleccionadoId('');
    setPrecioVendido('');
    setMensaje({ tipo: '', texto: '' });
    const listaVentas = await obtenerVentasDelDia(nuevoId);
    setVentasHoy(listaVentas);
  };

  const productosFiltrados = productos.filter((p) => {
    const t = busqueda.toLowerCase();
    return (
      p.codigo.toLowerCase().includes(t) ||
      p.nombre.toLowerCase().includes(t) ||
      (p.potencia_detalle && p.potencia_detalle.toLowerCase().includes(t))
    );
  });

  const productoActual = productos.find((p) => p.id === productoSeleccionadoId);
  const inventarioEnTienda = productoActual?.inventario_tienda?.find(
    (inv) => inv.tienda_id === tiendaSeleccionada
  );
  const stockDisponible = inventarioEnTienda ? inventarioEnTienda.stock : 0;

  const handleSeleccionarProducto = (prodId) => {
    setProductoSeleccionadoId(prodId);
    const prod = productos.find((p) => p.id === prodId);
    if (prod) {
      setPrecioVendido(prod.precio_venta_sugerido);
      setCantidad(1);
    } else {
      setPrecioVendido('');
    }
  };

  const gananciaUnitariaEstimada =
    productoActual && precioVendido !== ''
      ? parseFloat(precioVendido) - parseFloat(productoActual.precio_costo)
      : 0;
  const gananciaTotalEstimada = gananciaUnitariaEstimada * (parseInt(cantidad, 10) || 0);
  const totalCobrarEstimado = (parseFloat(precioVendido) || 0) * (parseInt(cantidad, 10) || 0);

  const handleRegistrarVenta = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: '', texto: '' });

    if (!productoActual || !inventarioEnTienda) {
      setMensaje({ tipo: 'error', texto: 'Selecciona una herramienta válida.' });
      return;
    }

    setGuardando(true);
    try {
      await registrarVenta({
        tiendaId: tiendaSeleccionada,
        producto: productoActual,
        inventarioId: inventarioEnTienda.id,
        stockActual: stockDisponible,
        cantidad,
        precioVendido,
      });

      setMensaje({
        tipo: 'exito',
        texto: `Venta registrada: ${cantidad}x [${productoActual.codigo}] por ${formatearMoneda(totalCobrarEstimado)}.`,
      });
      setProductoSeleccionadoId('');
      setPrecioVendido('');
      setCantidad(1);
      setBusqueda('');
      await cargarTodo(tiendaSeleccionada);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setGuardando(false);
    }
  };

  const totalVendidoHoy = ventasHoy.reduce((acc, v) => acc + parseFloat(v.total_venta), 0);
  const gananciaNetaHoy = ventasHoy.reduce((acc, v) => acc + parseFloat(v.ganancia_neta), 0);
  const nombreTiendaActiva = tiendas.find((t) => t.id === tiendaSeleccionada)?.nombre || 'Sucursal';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Punto de Venta
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Registra salidas por mostrador con precio real y descuento automático de stock.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#111827] p-1.5 rounded-2xl shadow-lg border border-slate-800">
          {tiendas.map((t, idx) => {
            const esActiva = t.id === tiendaSeleccionada;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleCambioTienda(t.id)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  esActiva
                    ? idx === 0
                      ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                      : 'bg-violet-500 text-white shadow-md shadow-violet-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    esActiva ? (idx === 0 ? 'bg-slate-950' : 'bg-white') : 'bg-slate-600'
                  }`}
                ></span>
                <span>{t.nombre}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-[#111827] p-5 rounded-2xl shadow-lg border border-slate-800 border-l-4 border-l-sky-500">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Sucursal en Turno
          </div>
          <div className="text-2xl font-extrabold text-white mt-1">{nombreTiendaActiva}</div>
          <div className="text-xs text-sky-400 font-semibold mt-1">
            {ventasHoy.length} ventas registradas hoy
          </div>
        </div>

        <div className="bg-[#111827] p-5 rounded-2xl shadow-lg border border-slate-800 border-l-4 border-l-amber-500">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Ingresos Hoy ({nombreTiendaActiva})
          </div>
          <div className="text-2xl font-extrabold text-white mt-1">
            {formatearMoneda(totalVendidoHoy)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Monto bruto cobrado en mostrador</div>
        </div>

        <div className="bg-[#111827] p-5 rounded-2xl shadow-lg border border-slate-800 border-l-4 border-l-emerald-500">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            Ganancia Neta Hoy
          </div>
          <div
            className={`text-2xl font-extrabold mt-1 ${
              gananciaNetaHoy >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatearMoneda(gananciaNetaHoy)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Utilidad limpia después de costos</div>
        </div>
      </div>

      {/* Formulario de Venta */}
      <form
        onSubmit={handleRegistrarVenta}
        className="bg-[#111827] rounded-2xl shadow-xl border border-slate-800 overflow-hidden mb-8"
      >
        <div className="bg-slate-900/90 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
            Nueva Operación de Venta — {nombreTiendaActiva}
          </h2>
        </div>

        <div className="p-6">
          {mensaje.texto && (
            <div
              className={`mb-5 p-3.5 rounded-r-lg text-sm font-semibold border-l-4 ${
                mensaje.tipo === 'exito'
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                  : 'bg-red-950/60 border-red-500 text-red-300'
              }`}
            >
              {mensaje.texto}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                1. Filtrar por Código o Nombre
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Ej: AMO-850W..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                2. Seleccionar Herramienta *
              </label>
              <select
                required
                value={productoSeleccionadoId}
                onChange={(e) => handleSeleccionarProducto(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl font-medium text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              >
                <option value="">
                  -- Elige una herramienta ({productosFiltrados.length} en catálogo) --
                </option>
                {productosFiltrados.map((p) => {
                  const inv = p.inventario_tienda?.find((i) => i.tienda_id === tiendaSeleccionada);
                  const stk = inv ? inv.stock : 0;
                  return (
                    <option key={p.id} value={p.id} disabled={stk <= 0}>
                      [{p.codigo}] {p.nombre} {p.potencia_detalle ? `(${p.potencia_detalle})` : ''} — Stock: {stk} | Sugerido: {formatearMoneda(p.precio_venta_sugerido)}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {productoActual && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 p-5 bg-slate-950/70 rounded-2xl border border-slate-800 mb-6">
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">
                  Stock en {nombreTiendaActiva}
                </span>
                <span className="text-xl font-extrabold text-white mt-1 block">
                  {stockDisponible} <span className="text-sm font-medium text-slate-500">unid.</span>
                </span>
              </div>

              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">
                  Costo Unitario
                </span>
                <span className="text-xl font-bold text-slate-300 mt-1 block">
                  {formatearMoneda(productoActual.precio_costo)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Cantidad *
                </label>
                <input
                  type="number"
                  min="1"
                  max={stockDisponible}
                  required
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-700 rounded-xl bg-slate-900 font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">
                  Precio Real Vendido c/u (Bs) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={precioVendido}
                  onChange={(e) => setPrecioVendido(e.target.value)}
                  className="w-full px-3.5 py-2 border-2 border-emerald-500/80 rounded-xl bg-slate-900 font-extrabold text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            {productoActual ? (
              <div className="flex flex-wrap items-center gap-4 text-sm bg-slate-950/90 border border-slate-800 px-4 py-2.5 rounded-xl">
                <div>
                  <span className="text-slate-400">Total a cobrar: </span>
                  <span className="font-extrabold text-white text-base">
                    {formatearMoneda(totalCobrarEstimado)}
                  </span>
                </div>
                <span className="text-slate-700">|</span>
                <div>
                  <span className="text-slate-400">Ganancia neta: </span>
                  <span
                    className={`font-extrabold text-base ${
                      gananciaTotalEstimada >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {formatearMoneda(gananciaTotalEstimada)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                Selecciona una herramienta arriba para calcular el total y la ganancia.
              </div>
            )}

            <button
              type="submit"
              disabled={guardando || !productoActual || stockDisponible <= 0}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold px-7 py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {guardando ? 'Registrando venta...' : '✓ Confirmar Venta'}
            </button>
          </div>
        </div>
      </form>

      {/* Tabla de Ventas de Hoy */}
      <div className="bg-[#111827] rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <h2 className="font-bold text-white text-lg">
            Movimientos de Hoy — {nombreTiendaActiva}
          </h2>
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60">
            {ventasHoy.length} operaciones
          </span>
        </div>

        {cargando ? (
          <div className="p-10 text-center text-slate-400">Cargando ventas del día...</div>
        ) : ventasHoy.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            Aún no hay ventas registradas hoy en {nombreTiendaActiva}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <th className="py-3.5 px-4 font-bold">Hora</th>
                  <th className="py-3.5 px-4 font-bold">Código</th>
                  <th className="py-3.5 px-4 font-bold">Herramienta</th>
                  <th className="py-3.5 px-4 font-bold text-center">Cant.</th>
                  <th className="py-3.5 px-4 font-bold">Precio Vendido</th>
                  <th className="py-3.5 px-4 font-bold">Total Cobrado</th>
                  <th className="py-3.5 px-4 font-bold text-emerald-400">Ganancia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-sm">
                {ventasHoy.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 text-slate-400">{formatearFechaHora(v.fecha_venta)}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-amber-500/30 text-amber-400 font-mono font-bold text-xs">
                        {v.codigo_producto}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-100">{v.nombre_producto}</td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-white">{v.cantidad}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-300">
                      {formatearMoneda(v.precio_vendido)}
                    </td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

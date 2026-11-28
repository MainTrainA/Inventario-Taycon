'use client';

import { useEffect, useState } from 'react';
import { obtenerTiendas, obtenerCatalogoConStock } from '@/services/productosService';
import { registrarVenta, obtenerVentasDelDia, anularVenta } from '@/services/ventasService';
import { registrarAuditoria } from '@/services/auditoriaService';
import { formatearMoneda, formatearFechaHora } from '@/lib/formatters';
import { useAuth } from '@/context/AuthContext';
import BotonGastoRapido from '@/components/gastos/BotonGastoRapido';

export default function PaginaVentas() {
  const { esAdmin, tiendaAsignadaId } = useAuth();
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
  const [anulandoId, setAnulandoId] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Estados para Carrito, Vuelto y Recibo
  const [carrito, setCarrito] = useState([]);
  const [efectivoRecibido, setEfectivoRecibido] = useState('');
  const [nombreCliente, setNombreCliente] = useState('');
  const [reciboActual, setReciboActual] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const cargarTodo = async (idTiendaFiltro = null) => {
    setCargando(true);
    try {
      const [listaTiendas, listaProductos] = await Promise.all([
        obtenerTiendas(),
        obtenerCatalogoConStock(),
      ]);
      setTiendas(listaTiendas);
      setProductos(listaProductos);

      const tiendaActiva = !esAdmin && tiendaAsignadaId
        ? tiendaAsignadaId
        : idTiendaFiltro || tiendaSeleccionada || listaTiendas[0]?.id || '';

      setTiendaSeleccionada(tiendaActiva);

      if (tiendaActiva) {
        const listaVentas = await obtenerVentasDelDia(tiendaActiva);
        setVentasHoy(listaVentas);
      }
    } catch (error) {
      console.error('Error cargando datos de ventas:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, [esAdmin, tiendaAsignadaId]);

  const handleCambioTienda = async (nuevoId) => {
    if (!esAdmin) return;
    setTiendaSeleccionada(nuevoId);
    setProductoSeleccionadoId('');
    setPrecioVendido('');
    setCarrito([]);
    setEfectivoRecibido('');
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
  const stockRealEnTienda = inventarioEnTienda ? inventarioEnTienda.stock : 0;
  const cantidadEnCarrito = carrito.find((item) => item.producto.id === productoSeleccionadoId)?.cantidad || 0;
  const stockDisponibleRestante = Math.max(0, stockRealEnTienda - cantidadEnCarrito);

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

  const handleAgregarAlCarrito = (e) => {
    e.preventDefault();
    setMensaje({ tipo: '', texto: '' });

    if (!productoActual || !inventarioEnTienda) {
      setMensaje({ tipo: 'error', texto: 'Selecciona una herramienta válida.' });
      return;
    }

    const cantNum = parseInt(cantidad, 10) || 0;
    const precioNum = parseFloat(precioVendido);

    if (cantNum <= 0 || isNaN(precioNum) || precioNum < 0) {
      setMensaje({ tipo: 'error', texto: 'Verifica la cantidad y el precio de venta.' });
      return;
    }

    if (cantNum > stockDisponibleRestante) {
      setMensaje({
        tipo: 'error',
        texto: `Stock insuficiente. Solo quedan ${stockDisponibleRestante} unidad(es) disponibles para agregar.`,
      });
      return;
    }

    setCarrito((prev) => {
      const existente = prev.find((i) => i.producto.id === productoActual.id);
      if (existente) {
        const nuevaCant = existente.cantidad + cantNum;
        return prev.map((i) =>
          i.producto.id === productoActual.id
            ? {
                ...i,
                cantidad: nuevaCant,
                precioVendido: precioNum,
                subtotal: nuevaCant * precioNum,
                ganancia: (precioNum - parseFloat(productoActual.precio_costo)) * nuevaCant,
              }
            : i
        );
      }
      return [
        ...prev,
        {
          producto: productoActual,
          inventarioId: inventarioEnTienda.id,
          stockActual: stockRealEnTienda,
          cantidad: cantNum,
          precioVendido: precioNum,
          subtotal: cantNum * precioNum,
          ganancia: (precioNum - parseFloat(productoActual.precio_costo)) * cantNum,
        },
      ];
    });

    setProductoSeleccionadoId('');
    setPrecioVendido('');
    setCantidad(1);
    setBusqueda('');
  };

  const handleQuitarDelCarrito = (productoId) => {
    setCarrito((prev) => prev.filter((item) => item.producto.id !== productoId));
  };

  const totalCarrito = carrito.reduce((acc, item) => acc + item.subtotal, 0);
  const gananciaCarrito = carrito.reduce((acc, item) => acc + item.ganancia, 0);
  const efectivoNum = parseFloat(efectivoRecibido) || 0;
  const vuelto = efectivoRecibido !== '' ? efectivoNum - totalCarrito : 0;

  const nombreTiendaActiva = tiendas.find((t) => t.id === tiendaSeleccionada)?.nombre || 'Sucursal';

  const handleConfirmarVentaCarrito = async () => {
    if (carrito.length === 0) return;
    setMensaje({ tipo: '', texto: '' });
    setGuardando(true);

    try {
      for (const item of carrito) {
        await registrarVenta({
          tiendaId: tiendaSeleccionada,
          producto: item.producto,
          inventarioId: item.inventarioId,
          stockActual: item.stockActual,
          cantidad: item.cantidad,
          precioVendido: item.precioVendido,
        });
      }

      const ahora = new Date();
      const nuevoRecibo = {
        nroNota: `TC-${String(ahora.getTime()).slice(-6)}`,
        fecha: ahora.toLocaleString('es-BO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        tienda: nombreTiendaActiva,
        cliente: nombreCliente.trim() || 'Cliente Mostrador',
        items: carrito.map((i) => ({
          codigo: i.producto.codigo,
          nombre: i.producto.nombre,
          cantidad: i.cantidad,
          precioUnitario: i.precioVendido,
          subtotal: i.subtotal,
        })),
        total: totalCarrito,
        efectivo: efectivoRecibido !== '' ? efectivoNum : null,
        vuelto: efectivoRecibido !== '' ? vuelto : null,
      };

      setReciboActual(nuevoRecibo);
      setCopiado(false);
      setCarrito([]);
      setEfectivoRecibido('');
      setNombreCliente('');
      setMensaje({
        tipo: 'exito',
        texto: `Venta confirmada (${nuevoRecibo.items.length} ítem/s) por ${formatearMoneda(nuevoRecibo.total)}.`,
      });
      await cargarTodo(tiendaSeleccionada);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error al confirmar venta: ' + err.message });
    } finally {
      setGuardando(false);
    }
  };

  const generarTextoRecibo = (recibo) => {
    const lineasItems = recibo.items
      .map(
        (i) =>
          `• ${i.cantidad}x ${i.nombre} [${i.codigo}] — ${formatearMoneda(i.subtotal)}`
      )
      .join('\n');

    let texto = `*TAYCON — Ferretería & Herramientas*\n`;
    texto += `Nota de Venta: ${recibo.nroNota}\n`;
    texto += `Sucursal: ${recibo.tienda}\n`;
    texto += `Fecha: ${recibo.fecha}\n`;
    texto += `Cliente: ${recibo.cliente}\n`;
    texto += `----------------------------\n`;
    texto += `${lineasItems}\n`;
    texto += `----------------------------\n`;
    texto += `*TOTAL A PAGAR: ${formatearMoneda(recibo.total)}*\n`;
    if (recibo.efectivo !== null && recibo.vuelto >= 0) {
      texto += `Efectivo: ${formatearMoneda(recibo.efectivo)}\n`;
      texto += `Cambio/Vuelto: ${formatearMoneda(recibo.vuelto)}\n`;
    }
    texto += `\n¡Gracias por su preferencia!`;
    return texto;
  };

  const handleEnviarWhatsApp = () => {
    if (!reciboActual) return;
    const texto = encodeURIComponent(generarTextoRecibo(reciboActual));
    window.open(`https://wa.me/59165638679?text=${texto}`, '_blank');
  };

  const handleCopiarRecibo = async () => {
    if (!reciboActual) return;
    try {
      await navigator.clipboard.writeText(generarTextoRecibo(reciboActual));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      alert('No se pudo copiar automáticamente.');
    }
  };

  const handleImprimirRecibo = () => {
    if (!reciboActual) return;
    const ventana = window.open('', '_blank', 'width=420,height=650');
    if (!ventana) return;

    const filas = reciboActual.items
      .map(
        (i) => `
        <tr>
          <td style="padding:6px 0; border-bottom:1px dashed #cbd5e1;">
            <strong>${i.cantidad}x</strong> ${i.nombre}<br/>
            <span style="font-size:11px; color:#64748b;">[${i.codigo}] · ${formatearMoneda(i.precioUnitario)} c/u</span>
          </td>
          <td style="padding:6px 0; text-align:right; font-weight:bold; border-bottom:1px dashed #cbd5e1;">
            ${formatearMoneda(i.subtotal)}
          </td>
        </tr>`
      )
      .join('');

    ventana.document.write(`
      <html>
        <head>
          <title>Nota de Venta ${reciboActual.nroNota} - TAYCON</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; padding: 20px; max-width: 340px; margin: 0 auto; }
            .logo { width: 44px; height: 44px; background: #f59e0b; color: #0f172a; font-weight: 900; font-size: 22px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 6px; }
            .center { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
            .totales { border-top: 2px solid #0f172a; padding-top: 10px; font-size: 14px; }
            .fila-total { display: flex; justify-content: space-between; margin-bottom: 4px; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="logo">T</div>
            <h2 style="margin:0; letter-spacing:1px;">TAYCON</h2>
            <div style="font-size:11px; color:#475569; text-transform:uppercase;">Ferretería & Herramientas</div>
            <div style="font-size:12px; margin-top:8px;"><strong>${reciboActual.tienda}</strong></div>
            <div style="font-size:11px; color:#64748b;">Nota: ${reciboActual.nroNota} · ${reciboActual.fecha}</div>
            <div style="font-size:12px; margin-top:4px;">Cliente: ${reciboActual.cliente}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align:left; border-bottom:2px solid #0f172a; padding-bottom:4px;">Detalle</th>
                <th style="text-align:right; border-bottom:2px solid #0f172a; padding-bottom:4px;">Importe</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
          <div class="totales">
            <div class="fila-total" style="font-size:16px; font-weight:bold;">
              <span>TOTAL:</span>
              <span>${formatearMoneda(reciboActual.total)}</span>
            </div>
            ${
              reciboActual.efectivo !== null && reciboActual.vuelto >= 0
                ? `<div class="fila-total"><span>Efectivo:</span><span>${formatearMoneda(reciboActual.efectivo)}</span></div>
                   <div class="fila-total"><span>Cambio:</span><span>${formatearMoneda(reciboActual.vuelto)}</span></div>`
                : ''
            }
          </div>
          <p class="center" style="font-size:11px; color:#64748b; margin-top:20px;">¡Gracias por su compra!</p>
        </body>
      </html>
    `);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => ventana.print(), 250);
  };

  const handleAnularVenta = async (venta) => {
    const confirmar = window.confirm(
      `¿Anular la venta de ${venta.cantidad}x [${venta.codigo_producto}] ${venta.nombre_producto}?\n\nLas ${venta.cantidad} unidades se devolverán automáticamente al stock.`
    );
    if (!confirmar) return;

    setAnulandoId(venta.id);
    setMensaje({ tipo: '', texto: '' });
    try {
      await anularVenta(venta);
      await registrarAuditoria('ANULAR_VENTA', `Anuló venta de ${venta.cantidad}x [${venta.codigo_producto}] ${venta.nombre_producto} (Bs ${venta.total_venta}) en ${nombreTiendaActiva}`);
      setMensaje({
        tipo: 'exito',
        texto: `Venta anulada: se devolvieron ${venta.cantidad} unidad(es) de [${venta.codigo_producto}] al inventario.`,
      });
      await cargarTodo(tiendaSeleccionada);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error al anular venta: ' + err.message });
    } finally {
      setAnulandoId(null);
    }
  };

  const totalVendidoHoy = ventasHoy.reduce((acc, v) => acc + parseFloat(v.total_venta), 0);
  const gananciaNetaHoy = ventasHoy.reduce((acc, v) => acc + parseFloat(v.ganancia_neta), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Punto de Venta
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Carrito rápido, cálculo de vuelto automático y recibo digital para WhatsApp o impresión.
          </p>
          <BotonGastoRapido tiendaId={tiendaSeleccionada} nombreTienda={nombreTiendaActiva} />
        </div>

        {esAdmin ? (
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
        ) : (
          <div className="inline-flex items-center gap-2 bg-[#111827] px-4 py-2.5 rounded-2xl shadow-lg border border-sky-500/40 text-sky-400 font-bold text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            <span>Sucursal asignada: {nombreTiendaActiva}</span>
          </div>
        )}
      </div>

      {/* Tarjetas KPI */}
      <div className={`grid grid-cols-1 ${esAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-5 mb-8`}>
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

        {esAdmin && (
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
        )}
      </div>

      {mensaje.texto && (
        <div
          className={`mb-6 p-3.5 rounded-r-lg text-sm font-semibold border-l-4 ${
            mensaje.tipo === 'exito'
              ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
              : 'bg-red-950/60 border-red-500 text-red-300'
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      {/* Grid: Selector de Herramienta + Carrito de Venta */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Columna izquierda: Agregar al carrito */}
        <form
          onSubmit={handleAgregarAlCarrito}
          className="lg:col-span-7 bg-[#111827] rounded-2xl shadow-xl border border-slate-800 overflow-hidden"
        >
          <div className="bg-slate-900/90 px-6 py-4 border-b border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              1. Agregar Herramientas — {nombreTiendaActiva}
            </h2>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Buscar por Código o Nombre
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Ej: AMO-850W o Amoladora..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                />

                {busqueda.trim().length > 0 && (
                  <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-amber-500/40 bg-slate-950 shadow-2xl divide-y divide-slate-800">
                    {productosFiltrados.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 text-center">
                        No se encontró ninguna herramienta con "{busqueda}"
                      </div>
                    ) : (
                      productosFiltrados.slice(0, 8).map((p) => {
                        const inv = p.inventario_tienda?.find((i) => i.tienda_id === tiendaSeleccionada);
                        const stk = inv ? inv.stock : 0;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            disabled={stk <= 0}
                            onClick={() => {
                              handleSeleccionarProducto(p.id);
                              setBusqueda('');
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-slate-800/80 transition flex items-center justify-between gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <div className="min-w-0">
                              <span className="text-xs font-mono font-bold text-amber-400 mr-2">
                                [{p.codigo}]
                              </span>
                              <span className="text-sm font-bold text-white">{p.nombre}</span>
                            </div>
                            <div className="shrink-0 text-xs flex items-center gap-2">
                              <span className={stk > 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                                Stock: {stk}
                              </span>
                              <span className="text-slate-300 font-semibold">
                                {formatearMoneda(p.precio_venta_sugerido)}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Seleccionar Herramienta *
              </label>
              <select
                required
                value={productoSeleccionadoId}
                onChange={(e) => handleSeleccionarProducto(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl font-medium text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
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

            {productoActual && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-950/70 rounded-xl border border-slate-800">
                <div>
                  <span className="block text-xs font-bold text-slate-400 uppercase">
                    Disponible
                  </span>
                  <span className="text-xl font-extrabold text-white mt-1 block">
                    {stockDisponibleRestante}{' '}
                    <span className="text-xs font-medium text-slate-500">unid.</span>
                  </span>
                  {esAdmin && (
                    <span className="text-[11px] text-slate-400">
                      Costo: {formatearMoneda(productoActual.precio_costo)}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                    Cantidad *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={stockDisponibleRestante}
                    required
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-700 rounded-xl bg-slate-900 font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">
                    Precio c/u (Bs) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={precioVendido}
                    onChange={(e) => setPrecioVendido(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-emerald-500/70 rounded-xl bg-slate-900 font-extrabold text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={!productoActual || stockDisponibleRestante <= 0}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold py-3 rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-40 cursor-pointer"
            >
              ➕ Agregar al Carrito
            </button>
          </div>
        </form>

        {/* Columna derecha: Carrito + Cálculo de Vuelto + Confirmar */}
        <div className="lg:col-span-5 bg-[#111827] rounded-2xl shadow-xl border border-slate-800 overflow-hidden flex flex-col">
          <div className="bg-slate-900/90 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              2. Carrito y Cobro
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-800 text-amber-400 border border-slate-700">
              {carrito.length} {carrito.length === 1 ? 'ítem' : 'ítems'}
            </span>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
            {carrito.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-sm">
                Agrega una o más herramientas desde la izquierda para armar la venta.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {carrito.map((item) => (
                  <div
                    key={item.producto.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">
                        {item.cantidad}x {item.producto.nombre}
                      </div>
                      <div className="text-xs text-slate-400">
                        <span className="text-amber-400 font-mono">{item.producto.codigo}</span> ·{' '}
                        {formatearMoneda(item.precioVendido)} c/u
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-extrabold text-white text-sm">
                        {formatearMoneda(item.subtotal)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuitarDelCarrito(item.producto.id)}
                        title="Quitar del carrito"
                        className="w-7 h-7 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-400 font-bold text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Resumen de Totales y Vuelto */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-lg">
                <span className="font-bold text-slate-300">Total a Cobrar:</span>
                <span className="font-black text-white text-2xl">
                  {formatearMoneda(totalCarrito)}
                </span>
              </div>

              {esAdmin && carrito.length > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Ganancia neta estimada:</span>
                  <span
                    className={`font-bold ${
                      gananciaCarrito >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {formatearMoneda(gananciaCarrito)}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Efectivo Recibido (Bs)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ej: 500"
                    value={efectivoRecibido}
                    onChange={(e) => setEfectivoRecibido(e.target.value)}
                    disabled={carrito.length === 0}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-40"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Cliente (Para Recibo)
                  </label>
                  <input
                    type="text"
                    placeholder="Opcional"
                    value={nombreCliente}
                    onChange={(e) => setNombreCliente(e.target.value)}
                    disabled={carrito.length === 0}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-40"
                  />
                </div>
              </div>

              {efectivoRecibido !== '' && carrito.length > 0 && (
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    vuelto >= 0
                      ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300'
                      : 'bg-red-950/50 border-red-700/60 text-red-300'
                  }`}
                >
                  <span className="text-xs font-bold uppercase">
                    {vuelto >= 0 ? 'Cambio / Vuelto:' : 'Falta completar:'}
                  </span>
                  <span className="text-lg font-black">
                    {formatearMoneda(Math.abs(vuelto))}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={handleConfirmarVentaCarrito}
                disabled={guardando || carrito.length === 0}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40 cursor-pointer"
              >
                {guardando ? 'Registrando venta...' : '✓ Confirmar Venta y Generar Recibo'}
              </button>
            </div>
          </div>
        </div>
      </div>

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
                  {esAdmin && <th className="py-3.5 px-4 font-bold text-emerald-400">Ganancia</th>}
                  <th className="py-3.5 px-4 font-bold text-center">Acción</th>
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
                    {esAdmin && (
                      <td
                        className={`py-3.5 px-4 font-extrabold ${
                          parseFloat(v.ganancia_neta) >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {formatearMoneda(v.ganancia_neta)}
                      </td>
                    )}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleAnularVenta(v)}
                        disabled={anulandoId === v.id}
                        title="Anular venta y devolver stock"
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 bg-red-950/50 hover:bg-red-900/70 border border-red-800/60 transition cursor-pointer disabled:opacity-50"
                      >
                        {anulandoId === v.id ? 'Anulando...' : 'Anular'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Recibo Digital */}
      {reciboActual && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#111827] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 bg-slate-900 border-b border-slate-800 text-center relative">
              <button
                type="button"
                onClick={() => setReciboActual(null)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
              <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center font-black text-slate-950 text-xl mb-2">
                T
              </div>
              <h3 className="text-xl font-extrabold text-white tracking-tight">TAYCON</h3>
              <p className="text-[11px] uppercase tracking-widest text-amber-400 font-semibold">
                Ferretería & Herramientas — Comprobante
              </p>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-xs text-slate-400 space-y-1 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between">
                  <span>Nota Nro:</span>
                  <strong className="text-white font-mono">{reciboActual.nroNota}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Sucursal:</span>
                  <strong className="text-white">{reciboActual.tienda}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Fecha:</span>
                  <span className="text-slate-200">{reciboActual.fecha}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cliente:</span>
                  <strong className="text-white">{reciboActual.cliente}</strong>
                </div>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {reciboActual.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-sm border-b border-slate-800/80 pb-2"
                  >
                    <div>
                      <div className="font-bold text-slate-100">
                        {item.cantidad}x {item.nombre}
                      </div>
                      <div className="text-xs text-slate-500">
                        [{item.codigo}] · {formatearMoneda(item.precioUnitario)} c/u
                      </div>
                    </div>
                    <div className="font-extrabold text-white">
                      {formatearMoneda(item.subtotal)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-700 space-y-1">
                <div className="flex justify-between text-base font-black text-white">
                  <span>TOTAL PAGADO:</span>
                  <span className="text-emerald-400">{formatearMoneda(reciboActual.total)}</span>
                </div>
                {reciboActual.efectivo !== null && reciboActual.vuelto >= 0 && (
                  <>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Efectivo recibido:</span>
                      <span>{formatearMoneda(reciboActual.efectivo)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-emerald-400 font-bold">
                      <span>Cambio / Vuelto:</span>
                      <span>{formatearMoneda(reciboActual.vuelto)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleEnviarWhatsApp}
                  className="py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
                >
                  📱 WhatsApp
                </button>
                <button
                  type="button"
                  onClick={handleCopiarRecibo}
                  className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs border border-slate-700 transition cursor-pointer"
                >
                  {copiado ? '✓ Copiado' : '📋 Copiar'}
                </button>
                <button
                  type="button"
                  onClick={handleImprimirRecibo}
                  className="py-2.5 px-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition cursor-pointer"
                >
                  🖨️ Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





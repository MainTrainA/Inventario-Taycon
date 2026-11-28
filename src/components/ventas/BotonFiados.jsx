'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  obtenerFiados,
  crearFiado,
  registrarAbono,
  abrirWhatsAppCobro,
} from '@/services/fiadosService';
import { formatearMoneda, formatearFechaHora } from '@/lib/formatters';

export default function BotonFiados({ tiendaId, nombreTienda }) {
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [tab, setTab] = useState('PENDIENTE'); // PENDIENTE | PAGADO | NUEVO

  // Catálogo para búsqueda rápida
  const [catalogo, setCatalogo] = useState([]);
  const [busquedaProd, setBusquedaProd] = useState('');
  const [itemsSeleccionados, setItemsSeleccionados] = useState([]);

  // Formulario nuevo fiado
  const [cliente, setCliente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [detalle, setDetalle] = useState('');
  const [montoTotal, setMontoTotal] = useState('');
  const [adelanto, setAdelanto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Abono rápido por fila
  const [abonoActivoId, setAbonoActivoId] = useState(null);
  const [montoAbono, setMontoAbono] = useState('');

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await obtenerFiados(tiendaId || null);
      setLista(data);
    } catch (err) {
      console.error('Error cargando fiados:', err);
    } finally {
      setCargando(false);
    }
  };

  const cargarCatalogo = async () => {
    try {
      const { data, error: err } = await supabase
        .from('productos')
        .select('id, codigo, nombre, precio_venta_sugerido')
        .eq('activo', true)
        .order('nombre', { ascending: true });
      if (!err && data) setCatalogo(data);
    } catch (err) {
      console.error('Error cargando catálogo:', err);
    }
  };

  useEffect(() => {
    if (tiendaId) cargar();
  }, [tiendaId]);

  useEffect(() => {
    if (abierto && catalogo.length === 0) {
      cargarCatalogo();
    }
  }, [abierto]);

  const productosFiltrados = useMemo(() => {
    const q = busquedaProd.trim().toLowerCase();
    if (!q) return [];
    return catalogo.filter(
      (p) =>
        (p.codigo || '').toLowerCase().includes(q) ||
        (p.nombre || '').toLowerCase().includes(q)
    );
  }, [catalogo, busquedaProd]);

  const sincronizarDesdeItems = (nuevosItems) => {
    setItemsSeleccionados(nuevosItems);
    if (nuevosItems.length > 0) {
      const suma = nuevosItems.reduce((acc, it) => acc + it.precio * it.cantidad, 0);
      setMontoTotal(suma.toFixed(2));
      setDetalle(nuevosItems.map((it) => `${it.cantidad}x ${it.nombre}`).join(' + '));
    } else {
      setMontoTotal('');
      setDetalle('');
    }
  };

  const agregarHerramienta = (prod) => {
    const existe = itemsSeleccionados.find((i) => i.id === prod.id);
    let nuevos;
    if (existe) {
      nuevos = itemsSeleccionados.map((i) =>
        i.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i
      );
    } else {
      nuevos = [
        ...itemsSeleccionados,
        {
          id: prod.id,
          codigo: prod.codigo,
          nombre: prod.nombre,
          precio: parseFloat(prod.precio_venta_sugerido) || 0,
          cantidad: 1,
        },
      ];
    }
    sincronizarDesdeItems(nuevos);
    setBusquedaProd('');
  };

  const cambiarCantidad = (id, delta) => {
    const nuevos = itemsSeleccionados
      .map((i) => (i.id === id ? { ...i, cantidad: i.cantidad + delta } : i))
      .filter((i) => i.cantidad > 0);
    sincronizarDesdeItems(nuevos);
  };

  const cambiarPrecioItem = (id, nuevoPrecio) => {
    const num = parseFloat(nuevoPrecio);
    const nuevos = itemsSeleccionados.map((i) =>
      i.id === id ? { ...i, precio: isNaN(num) ? 0 : num } : i
    );
    sincronizarDesdeItems(nuevos);
  };

  const quitarItem = (id) => {
    sincronizarDesdeItems(itemsSeleccionados.filter((i) => i.id !== id));
  };

  const { pendientes, pagados, totalPorCobrar } = useMemo(() => {
    const pend = lista.filter((f) => f.estado === 'PENDIENTE');
    const pag = lista.filter((f) => f.estado === 'PAGADO');
    const suma = pend.reduce(
      (acc, f) => acc + Math.max(0, parseFloat(f.monto_total) - parseFloat(f.monto_pagado)),
      0
    );
    return { pendientes: pend, pagados: pag, totalPorCobrar: suma };
  }, [lista]);

  const handleCrear = async (e) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      await crearFiado({ tiendaId, cliente, telefono, detalle, montoTotal, adelanto });
      setCliente('');
      setTelefono('');
      setDetalle('');
      setMontoTotal('');
      setAdelanto('');
      setItemsSeleccionados([]);
      setBusquedaProd('');
      setTab('PENDIENTE');
      await cargar();
    } catch (err) {
      setError(err.message || 'No se pudo registrar la cuenta.');
    } finally {
      setGuardando(false);
    }
  };

  const handleAbonar = async (fiado) => {
    setError('');
    try {
      await registrarAbono(fiado, montoAbono);
      setAbonoActivoId(null);
      setMontoAbono('');
      await cargar();
    } catch (err) {
      setError(err.message || 'Error al registrar abono.');
    }
  };

  const listaVisible = tab === 'PENDIENTE' ? pendientes : pagados;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAbierto(true);
          cargar();
        }}
        className="mt-2 ml-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-violet-950/60 hover:bg-violet-900/70 text-violet-300 border border-violet-700/60 transition cursor-pointer inline-flex items-center gap-2"
      >
        <span>📒 Fiados / Por Cobrar</span>
        <span className="px-2 py-0.5 rounded-full bg-violet-500 text-white font-black text-[11px]">
          {pendientes.length} · {formatearMoneda(totalPorCobrar)}
        </span>
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#111827] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-white">📒 Cuentas por Cobrar (Fiados / Adelantos)</h3>
                <p className="text-xs text-slate-400">
                  Total pendiente por cobrar: <strong className="text-violet-400">{formatearMoneda(totalPorCobrar)}</strong>
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

            {/* Pestañas */}
            <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => { setTab('PENDIENTE'); setError(''); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  tab === 'PENDIENTE' ? 'bg-violet-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                ⏳ Pendientes ({pendientes.length})
              </button>
              <button
                type="button"
                onClick={() => { setTab('PAGADO'); setError(''); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  tab === 'PAGADO' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                ✅ Pagados ({pagados.length})
              </button>
              <button
                type="button"
                onClick={() => { setTab('NUEVO'); setError(''); }}
                className={`ml-auto px-3.5 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer ${
                  tab === 'NUEVO' ? 'bg-amber-400 text-slate-950' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                }`}
              >
                + Nuevo Fiado / Adelanto
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              {error && (
                <div className="p-3 rounded-lg bg-red-950/60 border-l-4 border-red-500 text-red-300 text-sm">
                  {error}
                </div>
              )}

              {tab === 'NUEVO' ? (
                <form onSubmit={handleCrear} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre del Cliente *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Maestro Carlos Mamani"
                        value={cliente}
                        onChange={(e) => setCliente(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Teléfono / WhatsApp</label>
                      <input
                        type="tel"
                        placeholder="Ej: 71234567"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                      />
                    </div>
                  </div>

                  {/* Buscador rápido de herramientas */}
                  <div>
                    <label className="block text-xs font-bold text-amber-400 uppercase mb-1">
                      🔍 Buscar y Agregar Herramientas (Puedes elegir varias)
                    </label>
                    <input
                      type="text"
                      placeholder="Escribe código o nombre (Ej: AMO, Taladro, Disco)..."
                      value={busquedaProd}
                      onChange={(e) => setBusquedaProd(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />

                    {busquedaProd.trim().length > 0 && (
                      <div className="mt-1.5 max-h-44 overflow-y-auto rounded-xl border border-amber-500/40 bg-slate-950 shadow-2xl divide-y divide-slate-800">
                        {productosFiltrados.length === 0 ? (
                          <div className="p-3 text-xs text-slate-400 text-center">
                            No se encontró "{busquedaProd}" en el catálogo
                          </div>
                        ) : (
                          productosFiltrados.slice(0, 8).map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => agregarHerramienta(p)}
                              className="w-full px-3.5 py-2.5 text-left hover:bg-slate-800/80 transition flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <div className="min-w-0">
                                <span className="text-xs font-mono font-bold text-amber-400 mr-2">
                                  [{p.codigo}]
                                </span>
                                <span className="text-sm font-bold text-white">{p.nombre}</span>
                              </div>
                              <div className="shrink-0 text-xs font-extrabold text-emerald-400">
                                + {formatearMoneda(p.precio_venta_sugerido)}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Lista de herramientas agregadas */}
                  {itemsSeleccionados.length > 0 && (
                    <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-3 space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase">
                        Herramientas seleccionadas ({itemsSeleccionados.reduce((a, b) => a + b.cantidad, 0)} unid.)
                      </div>
                      {itemsSeleccionados.map((it) => (
                        <div
                          key={it.id}
                          className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-mono text-amber-400 font-bold mr-1.5">[{it.codigo}]</span>
                            <span className="font-bold text-white">{it.nombre}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg">
                              <button
                                type="button"
                                onClick={() => cambiarCantidad(it.id, -1)}
                                className="px-2 py-1 text-slate-300 hover:text-white font-bold cursor-pointer"
                              >
                                −
                              </button>
                              <span className="px-2 font-extrabold text-white">{it.cantidad}</span>
                              <button
                                type="button"
                                onClick={() => cambiarCantidad(it.id, 1)}
                                className="px-2 py-1 text-slate-300 hover:text-white font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={it.precio}
                              onChange={(e) => cambiarPrecioItem(it.id, e.target.value)}
                              title="Precio unitario (Bs)"
                              className="w-20 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-emerald-400 font-bold text-right"
                            />
                            <button
                              type="button"
                              onClick={() => quitarItem(it.id)}
                              className="px-2 py-1 rounded-lg bg-red-950/60 text-red-400 hover:bg-red-900 font-bold cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                      Detalle (Se llena solo o puedes escribirlo manual) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: 1x Amoladora Angular 850W + 2 discos"
                      value={detalle}
                      onChange={(e) => setDetalle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-violet-400 uppercase mb-1">Monto Total (Bs) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        required
                        placeholder="Ej: 350"
                        value={montoTotal}
                        onChange={(e) => setMontoTotal(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-violet-500/60 rounded-xl text-white font-bold text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">Adelanto Inicial (Bs) (Opcional)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        value={adelanto}
                        onChange={(e) => setAdelanto(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-base"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setTab('PENDIENTE')}
                      className="px-4 py-2 rounded-xl text-sm font-bold text-slate-300 bg-slate-800 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={guardando}
                      className="px-5 py-2 rounded-xl text-sm font-extrabold text-white bg-violet-600 hover:bg-violet-500 cursor-pointer disabled:opacity-50"
                    >
                      {guardando ? 'Guardando...' : 'Guardar Cuenta'}
                    </button>
                  </div>
                </form>
              ) : cargando ? (
                <div className="py-8 text-center text-slate-400 text-sm">Cargando cuentas...</div>
              ) : listaVisible.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm">
                  No hay cuentas en esta sección.
                </div>
              ) : (
                listaVisible.map((f) => {
                  const saldo = Math.max(0, parseFloat(f.monto_total) - parseFloat(f.monto_pagado));
                  return (
                    <div key={f.id} className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-white text-sm">{f.cliente}</span>
                            {f.telefono && <span className="text-xs text-slate-400">({f.telefono})</span>}
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                f.estado === 'PAGADO'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60'
                                  : 'bg-amber-950 text-amber-400 border border-amber-700/60'
                              }`}
                            >
                              {f.estado}
                            </span>
                          </div>
                          <div className="text-xs text-slate-300 mt-1">{f.detalle}</div>
                          <div className="text-[11px] text-slate-400 mt-1 space-y-0.5">
                            <div>📅 Sacó el: <strong className="text-slate-300">{formatearFechaHora(f.fecha_registro)}</strong></div>
                            {f.fecha_saldado && (
                              <div>✅ Terminó de pagar el: <strong className="text-emerald-400">{formatearFechaHora(f.fecha_saldado)}</strong></div>
                            )}
                          </div>
                        </div>

                        <div className="text-left sm:text-right text-xs space-y-0.5 shrink-0">
                          <div className="text-slate-400">Total: <strong className="text-white">{formatearMoneda(f.monto_total)}</strong></div>
                          <div className="text-emerald-400">Pagado: <strong>{formatearMoneda(f.monto_pagado)}</strong></div>
                          {f.estado === 'PENDIENTE' && (
                            <div className="text-sm font-black text-rose-400">Debe: {formatearMoneda(saldo)}</div>
                          )}
                        </div>
                      </div>

                      {Array.isArray(f.abonos) && f.abonos.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                          {f.abonos.map((ab, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300"
                            >
                              +{formatearMoneda(ab.monto)} ({new Date(ab.fecha).toLocaleDateString('es-BO')})
                            </span>
                          ))}
                        </div>
                      )}

                      {f.estado === 'PENDIENTE' && (
                        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                          {abonoActivoId === f.id ? (
                            <>
                              <input
                                type="number"
                                step="0.01"
                                min="0.1"
                                placeholder={`Máx ${saldo.toFixed(2)}`}
                                value={montoAbono}
                                onChange={(e) => setMontoAbono(e.target.value)}
                                className="w-32 px-2.5 py-1.5 bg-slate-900 border border-emerald-500 rounded-lg text-white text-xs font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => handleAbonar(f)}
                                className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                              >
                                Guardar Abono
                              </button>
                              <button
                                type="button"
                                onClick={() => { setAbonoActivoId(null); setMontoAbono(''); }}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => { setAbonoActivoId(f.id); setMontoAbono(String(saldo)); }}
                                className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                              >
                                💵 Registrar Abono / Pago
                              </button>
                              <button
                                type="button"
                                onClick={() => abrirWhatsAppCobro(f, nombreTienda)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                              >
                                📱 Cobrar por WhatsApp
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

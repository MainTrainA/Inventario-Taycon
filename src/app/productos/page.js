'use client';

import { useEffect, useState } from 'react';
import {
  obtenerTiendas,
  obtenerCatalogoConStock,
  actualizarStockTienda,
  actualizarProducto,
  eliminarProducto,
} from '@/services/productosService';
import { formatearMoneda } from '@/lib/formatters';
import FormularioProducto from '@/components/productos/FormularioProducto';
import { useAuth } from '@/context/AuthContext';

export default function PaginaProductos() {
  const { esAdmin, tiendaAsignadaId } = useAuth();
  const [tiendas, setTiendas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  // Estados para el modal de edición
  const [productoEditando, setProductoEditando] = useState(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState('');

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [listaTiendas, listaProductos] = await Promise.all([
        obtenerTiendas(),
        obtenerCatalogoConStock(),
      ]);
      setTiendas(listaTiendas);
      setProductos(listaProductos);
    } catch (error) {
      console.error('Error cargando inventario:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const tiendasVisibles = esAdmin
    ? tiendas
    : tiendas.filter((t) => t.id === tiendaAsignadaId);

  const cambiarStock = async (inventarioId, stockActual, delta) => {
    const nuevoStock = Math.max(0, stockActual + delta);
    await actualizarStockTienda(inventarioId, nuevoStock);
    cargarDatos();
  };

  const abrirEdicion = (prod) => {
    setErrorEdicion('');
    setProductoEditando({
      id: prod.id,
      codigo: prod.codigo,
      nombre: prod.nombre,
      potencia_detalle: prod.potencia_detalle || '',
      precio_costo: prod.precio_costo,
      precio_venta_sugerido: prod.precio_venta_sugerido,
    });
  };

  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    setErrorEdicion('');
    setGuardandoEdicion(true);

    try {
      await actualizarProducto(productoEditando.id, {
        codigo: productoEditando.codigo,
        nombre: productoEditando.nombre,
        potencia_detalle: productoEditando.potencia_detalle,
        precio_venta_sugerido: productoEditando.precio_venta_sugerido,
        ...(esAdmin ? { precio_costo: productoEditando.precio_costo } : {}),
      });
      setProductoEditando(null);
      await cargarDatos();
    } catch (error) {
      setErrorEdicion(
        error.message?.includes('duplicate')
          ? 'Ya existe otro producto con ese mismo código.'
          : 'Error al guardar cambios: ' + error.message
      );
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const handleEliminar = async (prod) => {
    const confirmar = window.confirm(
      `¿Eliminar [${prod.codigo}] ${prod.nombre} del catálogo?`
    );
    if (!confirmar) return;

    try {
      await eliminarProducto(prod.id);
      cargarDatos();
    } catch (error) {
      alert(
        'No se pudo eliminar el producto (puede que ya tenga ventas registradas): ' +
          error.message
      );
    }
  };

  const productosFiltrados = productos.filter((prod) => {
    const texto = busqueda.toLowerCase();
    return (
      prod.codigo.toLowerCase().includes(texto) ||
      prod.nombre.toLowerCase().includes(texto) ||
      (prod.potencia_detalle && prod.potencia_detalle.toLowerCase().includes(texto))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {esAdmin ? 'Inventario y Catálogo Maestro' : 'Inventario de mi Sucursal'}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {esAdmin
            ? 'Administra tus códigos personalizados por potencia y controla las existencias de cada sucursal.'
            : 'Añade, edita y controla el stock de las herramientas de tu tienda.'}
        </p>
      </div>

      <FormularioProducto tiendas={tiendasVisibles} onProductoCreado={cargarDatos} />

      <div className="bg-[#111827] rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <h2 className="font-bold text-white text-lg">Existencias Disponibles</h2>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-800 text-amber-400 border border-slate-700">
              {productosFiltrados.length} ítems
            </span>
          </div>

          <div className="relative w-full sm:w-80">
            <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Buscar código (AMO-850W) o nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-950/90 text-slate-100 placeholder-slate-500 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        </div>

        {cargando ? (
          <div className="p-12 text-center text-slate-400 font-medium">Cargando catálogo...</div>
        ) : productosFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-300 font-semibold">No se encontraron herramientas</p>
            <p className="text-sm text-slate-500 mt-1">
              Registra una nueva herramienta arriba o limpia el filtro de búsqueda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <th className="py-3.5 px-4 font-bold">Código</th>
                  <th className="py-3.5 px-4 font-bold">Herramienta / Potencia</th>
                  {esAdmin && <th className="py-3.5 px-4 font-bold">Costo</th>}
                  <th className="py-3.5 px-4 font-bold">P. Sugerido</th>
                  {tiendasVisibles.map((t, idx) => (
                    <th
                      key={t.id}
                      className={`py-3.5 px-4 font-bold text-center ${
                        idx === 0 ? 'text-sky-400' : 'text-violet-400'
                      }`}
                    >
                      {t.nombre}
                    </th>
                  ))}
                  <th className="py-3.5 px-4 font-bold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-sm">
                {productosFiltrados.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-950 border border-amber-500/30 text-amber-400 font-mono font-bold text-xs tracking-wide">
                        {prod.codigo}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-100">{prod.nombre}</div>
                      {prod.potencia_detalle && (
                        <span className="inline-block mt-1 text-xs font-medium text-slate-400 bg-slate-800/90 px-2 py-0.5 rounded">
                          {prod.potencia_detalle}
                        </span>
                      )}
                    </td>
                    {esAdmin && (
                      <td className="py-3.5 px-4 text-slate-400 font-medium">
                        {formatearMoneda(prod.precio_costo)}
                      </td>
                    )}
                    <td className="py-3.5 px-4 font-bold text-white">
                      {formatearMoneda(prod.precio_venta_sugerido)}
                    </td>
                    {tiendasVisibles.map((tienda) => {
                      const inv = prod.inventario_tienda?.find((i) => i.tienda_id === tienda.id);
                      const stock = inv ? inv.stock : 0;
                      const badgeColor =
                        stock === 0
                          ? 'bg-red-950/60 text-red-400 border-red-800/60'
                          : stock <= 2
                          ? 'bg-amber-950/60 text-amber-300 border-amber-700/60'
                          : 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60';

                      return (
                        <td key={tienda.id} className="py-3.5 px-4 text-center">
                          {inv ? (
                            <div
                              className={`inline-flex items-center gap-2 px-2 py-1 rounded-xl border ${badgeColor}`}
                            >
                              <button
                                onClick={() => cambiarStock(inv.id, stock, -1)}
                                title="Restar 1 unidad"
                                className="w-6 h-6 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold transition cursor-pointer"
                              >
                                -
                              </button>
                              <span className="font-extrabold min-w-[26px] text-center">{stock}</span>
                              <button
                                onClick={() => cambiarStock(inv.id, stock, 1)}
                                title="Sumar 1 unidad"
                                className="w-6 h-6 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold transition cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-600">0</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => abrirEdicion(prod)}
                          title="Editar datos o precios"
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-400 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/50 transition cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleEliminar(prod)}
                          title="Eliminar herramienta del catálogo"
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 bg-red-950/50 hover:bg-red-900/70 border border-red-800/60 transition cursor-pointer"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Edición */}
      {productoEditando && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#111827] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-white">Editar Herramienta</h3>
              <button
                type="button"
                onClick={() => setProductoEditando(null)}
                className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarEdicion} className="p-6 space-y-4">
              {errorEdicion && (
                <div className="p-3 rounded-lg bg-red-950/60 border-l-4 border-red-500 text-red-300 text-sm font-medium">
                  {errorEdicion}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Código *
                  </label>
                  <input
                    type="text"
                    required
                    value={productoEditando.codigo}
                    onChange={(e) =>
                      setProductoEditando({ ...productoEditando, codigo: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-amber-400 font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Potencia / Detalle
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 850W - 4.5 pulgadas"
                    value={productoEditando.potencia_detalle}
                    onChange={(e) =>
                      setProductoEditando({
                        ...productoEditando,
                        potencia_detalle: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nombre de la Herramienta *
                </label>
                <input
                  type="text"
                  required
                  value={productoEditando.nombre}
                  onChange={(e) =>
                    setProductoEditando({ ...productoEditando, nombre: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className={`grid grid-cols-1 ${esAdmin ? 'sm:grid-cols-2' : ''} gap-4`}>
                {esAdmin && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Precio de Costo (Bs) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={productoEditando.precio_costo}
                      onChange={(e) =>
                        setProductoEditando({
                          ...productoEditando,
                          precio_costo: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1.5">
                    Precio Sugerido (Bs) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={productoEditando.precio_venta_sugerido}
                    onChange={(e) =>
                      setProductoEditando({
                        ...productoEditando,
                        precio_venta_sugerido: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-emerald-600/60 rounded-xl text-emerald-300 font-extrabold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setProductoEditando(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoEdicion}
                  className="px-5 py-2.5 rounded-xl text-sm font-extrabold text-slate-950 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {guardandoEdicion ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

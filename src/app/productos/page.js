'use client';

import { useEffect, useState } from 'react';
import {
  obtenerTiendas,
  obtenerCatalogoConStock,
  actualizarStockTienda,
  eliminarProducto,
} from '@/services/productosService';
import { formatearMoneda } from '@/lib/formatters';
import FormularioProducto from '@/components/productos/FormularioProducto';

export default function PaginaProductos() {
  const [tiendas, setTiendas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

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

  const cambiarStock = async (inventarioId, stockActual, delta) => {
    const nuevoStock = Math.max(0, stockActual + delta);
    await actualizarStockTienda(inventarioId, nuevoStock);
    cargarDatos();
  };

  const handleEliminar = async (prod) => {
    const confirmar = window.confirm(
      `¿Eliminar [${prod.codigo}] ${prod.nombre} del catálogo y de todas las tiendas?`
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
          Inventario y Catálogo Maestro
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Administra tus códigos personalizados por potencia y controla las existencias de cada sucursal.
        </p>
      </div>

      <FormularioProducto tiendas={tiendas} onProductoCreado={cargarDatos} />

      <div className="bg-[#111827] rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <h2 className="font-bold text-white text-lg">Existencias en Sucursales</h2>
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
                  <th className="py-3.5 px-4 font-bold">Costo</th>
                  <th className="py-3.5 px-4 font-bold">P. Sugerido</th>
                  {tiendas.map((t, idx) => (
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
                    <td className="py-3.5 px-4 text-slate-400 font-medium">
                      {formatearMoneda(prod.precio_costo)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      {formatearMoneda(prod.precio_venta_sugerido)}
                    </td>
                    {tiendas.map((tienda) => {
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
                      <button
                        onClick={() => handleEliminar(prod)}
                        title="Eliminar herramienta del catálogo"
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 bg-red-950/50 hover:bg-red-900/70 border border-red-800/60 transition cursor-pointer"
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
      </div>
    </div>
  );
}

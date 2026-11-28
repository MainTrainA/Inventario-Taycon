'use client';

import { useState } from 'react';
import { crearProductoConInventario } from '@/services/productosService';

export default function FormularioProducto({ tiendas, onProductoCreado }) {
  const [form, setForm] = useState({
    codigo: '',
    nombre: '',
    potencia_detalle: '',
    precio_costo: '',
    precio_venta_sugerido: '',
  });
  const [stocks, setStocks] = useState({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const handleStockChange = (tiendaId, valor) => {
    setStocks((prev) => ({ ...prev, [tiendaId]: valor }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');
    setCargando(true);

    try {
      await crearProductoConInventario(form, stocks);
      setExito(`Herramienta [${form.codigo.toUpperCase()}] agregada al catálogo.`);
      setForm({
        codigo: '',
        nombre: '',
        potencia_detalle: '',
        precio_costo: '',
        precio_venta_sugerido: '',
      });
      setStocks({});
      onProductoCreado();
      setTimeout(() => setExito(''), 4000);
    } catch (err) {
      if (err.code === '23505') {
        setError('Ya existe un producto registrado con ese código personalizado.');
      } else {
        setError('Error al guardar el producto: ' + err.message);
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#111827] rounded-2xl shadow-xl border border-slate-800 overflow-hidden mb-8"
    >
      <div className="bg-slate-900/90 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500"></span>
            Registrar Nueva Herramienta / Producto
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Asigna un código único por potencia y define el stock inicial por sucursal
          </p>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-5 p-3.5 bg-red-950/60 border-l-4 border-red-500 text-red-300 rounded-r-lg text-sm font-medium">
            {error}
          </div>
        )}

        {exito && (
          <div className="mb-5 p-3.5 bg-emerald-950/60 border-l-4 border-emerald-500 text-emerald-300 rounded-r-lg text-sm font-medium">
            ✓ {exito}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Código Personalizado *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: AMO-850W"
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl font-mono font-bold text-amber-400 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 uppercase transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Nombre de la Herramienta *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Amoladora Angular Bosch"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Potencia / Especificación
            </label>
            <input
              type="text"
              placeholder="Ej: 850W - 4.5 pulgadas"
              value={form.potencia_detalle}
              onChange={(e) => setForm({ ...form, potencia_detalle: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6 pt-4 border-t border-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Precio Costo (Bs) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-500 font-semibold text-sm">Bs</span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={form.precio_costo}
                onChange={(e) => setForm({ ...form, precio_costo: e.target.value })}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 font-semibold placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Precio Sugerido (Bs) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-500 font-semibold text-sm">Bs</span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={form.precio_venta_sugerido}
                onChange={(e) => setForm({ ...form, precio_venta_sugerido: e.target.value })}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 font-semibold placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              />
            </div>
          </div>

          {tiendas.map((tienda, idx) => (
            <div key={tienda.id}>
              <label
                className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                  idx === 0 ? 'text-sky-400' : 'text-violet-400'
                }`}
              >
                Stock {tienda.nombre}
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={stocks[tienda.id] ?? ''}
                onChange={(e) => handleStockChange(tienda.id, e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-white border bg-slate-950/80 placeholder-slate-600 focus:outline-none focus:ring-2 transition ${
                  idx === 0
                    ? 'border-sky-500/40 focus:ring-sky-500'
                    : 'border-violet-500/40 focus:ring-violet-500'
                }`}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={cargando}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold px-6 py-3 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <span>+</span>
            <span>{cargando ? 'Guardando en catálogo...' : 'Guardar en Inventario'}</span>
          </button>
        </div>
      </div>
      </form>
  );
}





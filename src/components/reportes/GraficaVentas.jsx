'use client';

import { useState } from 'react';
import { formatearMoneda } from '@/lib/formatters';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from 'recharts';

const formatearCorto = (valor) => {
  const num = Number(valor) || 0;
  if (num === 0) return '';
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return `${Math.round(num)}`;
};

const TooltipPersonalizado = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  const datos = payload[0]?.payload;

  return (
    <div className="bg-slate-950 border border-slate-700 rounded-xl p-3.5 shadow-2xl text-xs space-y-1.5 min-w-[180px]">
      <div className="font-extrabold text-white text-sm border-b border-slate-800 pb-1.5">
        📅 {label}
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-amber-400 font-semibold">● Total Vendido:</span>
        <span className="font-extrabold text-white">{formatearMoneda(datos?.Vendido || 0)}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-emerald-400 font-semibold">● Ganancia Neta:</span>
        <span className="font-extrabold text-emerald-400">{formatearMoneda(datos?.Ganancia || 0)}</span>
      </div>
      <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800/80 text-slate-400">
        <span>Unidades vendidas:</span>
        <span className="font-bold text-slate-200">{datos?.unidades || 0} unid.</span>
      </div>
    </div>
  );
};

export default function GraficaVentas({ serie, cargando, periodoTop, etiquetaPeriodo }) {
  const [vista, setVista] = useState('AMBOS'); // AMBOS | VENDIDO | GANANCIA

  const totalVendido = serie.reduce((acc, item) => acc + (item.Vendido || 0), 0);
  const totalGanancia = serie.reduce((acc, item) => acc + (item.Ganancia || 0), 0);

  return (
    <div className="bg-[#111827] p-6 rounded-2xl shadow-xl border border-slate-800 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            Gráfica de Ventas y Ganancias — {etiquetaPeriodo}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Montos en Bolivianos (Bs) por {periodoTop === 'DIA' ? 'hora' : periodoTop === 'ANIO' ? 'mes' : 'día'}.
          </p>
        </div>

        {/* Selector de vista */}
        <div className="inline-flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start">
          {[
            { id: 'AMBOS', label: 'Ambos' },
            { id: 'VENDIDO', label: 'Solo Vendido' },
            { id: 'GANANCIA', label: 'Solo Ganancia' },
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setVista(btn.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                vista === btn.id
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leyenda clara con totales */}
      {!cargando && serie.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 mb-5 text-xs">
          {(vista === 'AMBOS' || vista === 'VENDIDO') && (
            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="w-3 h-3 rounded-sm bg-amber-500"></span>
              <span className="text-slate-400">Vendido:</span>
              <strong className="text-white">{formatearMoneda(totalVendido)}</strong>
            </div>
          )}
          {(vista === 'AMBOS' || vista === 'GANANCIA') && (
            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>
              <span className="text-slate-400">Ganancia Neta:</span>
              <strong className="text-emerald-400">{formatearMoneda(totalGanancia)}</strong>
            </div>
          )}
        </div>
      )}

      {cargando ? (
        <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
          Cargando gráfica...
        </div>
      ) : serie.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-slate-500 text-sm">
          No hay ventas registradas en {etiquetaPeriodo.toLowerCase()}.
        </div>
      ) : (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={serie}
              margin={{ top: 24, right: 16, left: 4, bottom: 8 }}
              barGap={6}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="etiqueta"
                stroke="#64748b"
                tick={{ fill: '#f8fafc', fontWeight: 700, fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `Bs ${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              />
              <Tooltip content={<TooltipPersonalizado />} cursor={{ fill: '#1e293b', opacity: 0.35 }} />

              {(vista === 'AMBOS' || vista === 'VENDIDO') && (
                <Bar
                  dataKey="Vendido"
                  name="Total Vendido"
                  fill="#f59e0b"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={42}
                >
                  <LabelList
                    dataKey="Vendido"
                    position="top"
                    formatter={formatearCorto}
                    style={{ fill: '#fbbf24', fontSize: 11, fontWeight: 800 }}
                  />
                </Bar>
              )}

              {(vista === 'AMBOS' || vista === 'GANANCIA') && (
                <Bar
                  dataKey="Ganancia"
                  name="Ganancia Neta"
                  fill="#10b981"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={42}
                >
                  <LabelList
                    dataKey="Ganancia"
                    position="top"
                    formatter={formatearCorto}
                    style={{ fill: '#34d399', fontSize: 11, fontWeight: 800 }}
                  />
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

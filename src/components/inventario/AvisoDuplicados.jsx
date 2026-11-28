'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AvisoDuplicados({ codigo = '', nombre = '' }) {
  const [productos, setProductos] = useState([]);

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      const { data, error } = await supabase
        .from('productos')
        .select('id, codigo, nombre')
        .eq('activo', true);
      if (!error && data && activo) setProductos(data);
    };
    cargar();
    return () => { activo = false; };
  }, []);

  const { codigoExacto, similares } = useMemo(() => {
    const cod = String(codigo || '').trim().toLowerCase();
    const nom = String(nombre || '').trim().toLowerCase();

    if (cod.length < 1 && nom.length < 2) {
      return { codigoExacto: null, similares: [] };
    }

    const exacto = cod
      ? productos.find((p) => (p.codigo || '').trim().toLowerCase() === cod)
      : null;

    const parecidos = productos.filter((p) => {
      if (exacto && p.id === exacto.id) return false;
      const pCod = (p.codigo || '').toLowerCase();
      const pNom = (p.nombre || '').toLowerCase();
      const matchCod = cod.length >= 1 && pCod.includes(cod);
      const matchNom = nom.length >= 2 && pNom.includes(nom);
      return matchCod || matchNom;
    });

    return { codigoExacto: exacto, similares: parecidos.slice(0, 6) };
  }, [productos, codigo, nombre]);

  if (!codigoExacto && similares.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {codigoExacto && (
        <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/60 text-xs text-red-200">
          <span className="font-black text-red-400">⚠️ CÓDIGO DUPLICADO:</span>{' '}
          Ya existe <strong className="text-white">[{codigoExacto.codigo}] {codigoExacto.nombre}</strong> en tu inventario.
        </div>
      )}

      {similares.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-500/40 text-xs text-amber-200">
          <div className="font-extrabold text-amber-400 mb-1.5">
            🔎 Herramientas similares que ya existen en tu catálogo:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {similares.map((p) => (
              <span
                key={p.id}
                className="px-2.5 py-1 rounded-lg bg-slate-950/90 border border-slate-800 text-slate-200"
              >
                <strong className="font-mono text-amber-400">[{p.codigo}]</strong> {p.nombre}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

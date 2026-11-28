import { supabase } from '@/lib/supabaseClient';
import { registrarAuditoria } from '@/services/auditoriaService';

export const CATEGORIAS_GASTO = [
  { id: 'Factura de Luz', label: 'Factura de Luz', icon: '💡' },
  { id: 'Agua', label: 'Agua', icon: '💧' },
  { id: 'Gas', label: 'Gas', icon: '🔥' },
  { id: 'Factura de WiFi', label: 'Factura de WiFi', icon: '📶' },
  { id: 'Comida del día', label: 'Comida del día', icon: '🍽️' },
  { id: 'Otros', label: 'Otros', icon: '📦' },
];

export const registrarGasto = async ({ tiendaId, categoria, detalle, monto }) => {
  const montoNum = parseFloat(monto);
  if (isNaN(montoNum) || montoNum <= 0) {
    throw new Error('Ingresa un monto válido mayor a 0.');
  }

  const { data: { user } } = await supabase.auth.getUser();
  const usuarioEmail = user?.email || 'Usuario';

  const { data, error } = await supabase
    .from('gastos')
    .insert([
      {
        tienda_id: tiendaId || null,
        categoria,
        detalle: (detalle || '').trim(),
        monto: montoNum,
        usuario_email: usuarioEmail,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  await registrarAuditoria(
    'REGISTRAR_GASTO',
    `Gasto de Bs ${montoNum.toFixed(2)} en [${categoria}]${detalle ? ` — ${detalle.trim()}` : ''}`
  );

  return data;
};

export const obtenerGastosDesde = async (fechaInicioISO, tiendaId = null) => {
  let query = supabase
    .from('gastos')
    .select('*, tiendas ( nombre )')
    .gte('fecha_gasto', fechaInicioISO)
    .order('fecha_gasto', { ascending: false });

  if (tiendaId) {
    query = query.eq('tienda_id', tiendaId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const eliminarGasto = async (gasto) => {
  const { error } = await supabase
    .from('gastos')
    .delete()
    .eq('id', gasto.id);

  if (error) throw error;

  await registrarAuditoria(
    'ELIMINAR_GASTO',
    `Eliminó gasto de Bs ${parseFloat(gasto.monto).toFixed(2)} [${gasto.categoria}]`
  );
};

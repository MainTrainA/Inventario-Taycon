import { supabase } from '@/lib/supabaseClient';
import { formatearMoneda } from '@/lib/formatters';

export const calcularTotalItems = (items = []) => {
  return items.reduce((acc, item) => {
    const precio = parseFloat(item.precio_vendido ?? item.precio ?? item.precio_venta_sugerido ?? 0);
    const cant = parseInt(item.cantidad ?? 1, 10);
    return acc + precio * cant;
  }, 0);
};

export const crearProforma = async ({ tiendaId, cliente, telefono, items }) => {
  const { data: { user } } = await supabase.auth.getUser();
  const total = calcularTotalItems(items);

  const { data, error } = await supabase
    .from('proformas')
    .insert([
      {
        tienda_id: tiendaId || null,
        cliente: (cliente || '').trim() || 'Cliente General',
        telefono: (telefono || '').trim(),
        items,
        total,
        estado: 'PENDIENTE',
        usuario_email: user?.email || 'Usuario',
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const obtenerProformasPendientes = async (tiendaId = null) => {
  let query = supabase
    .from('proformas')
    .select('*')
    .eq('estado', 'PENDIENTE')
    .order('fecha_creacion', { ascending: false });

  if (tiendaId) {
    query = query.eq('tienda_id', tiendaId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const actualizarEstadoProforma = async (id, estado) => {
  const { error } = await supabase
    .from('proformas')
    .update({ estado })
    .eq('id', id);

  if (error) throw error;
};

export const abrirWhatsAppProforma = ({ nombreTienda, cliente, telefono, items, total }) => {
  const fecha = new Date().toLocaleDateString('es-BO');
  const lineas = (items || []).map((item) => {
    const cant = parseInt(item.cantidad ?? 1, 10);
    const precio = parseFloat(item.precio_vendido ?? item.precio ?? item.precio_venta_sugerido ?? 0);
    const nombre = item.nombre || item.nombre_producto || 'Herramienta';
    const sub = cant * precio;
    return `• ${cant}x ${nombre} (${formatearMoneda(precio)} c/u) = ${formatearMoneda(sub)}`;
  });

  const mensaje = [
    `*COTIZACIÓN / PROFORMA — TAYCON*`,
    `Sucursal: ${nombreTienda || 'Ferretería TAYCON'}`,
    `Fecha: ${fecha}`,
    cliente ? `Cliente: ${cliente}` : null,
    `--------------------------------`,
    ...lineas,
    `--------------------------------`,
    `*TOTAL ESTIMADO: ${formatearMoneda(total)}*`,
    `_Precios sujetos a disponibilidad de stock._`,
  ]
    .filter(Boolean)
    .join('\n');

  const texto = encodeURIComponent(mensaje);
  const telLimpio = (telefono || '').replace(/\D/g, '');
  const destino = telLimpio
    ? (telLimpio.startsWith('591') ? telLimpio : `591${telLimpio}`)
    : '59165638679';

  window.open(`https://wa.me/${destino}?text=${texto}`, '_blank');
};

import { supabase } from '@/lib/supabaseClient';

export const registrarVenta = async ({
  tiendaId,
  producto,
  inventarioId,
  stockActual,
  cantidad,
  precioVendido,
}) => {
  const cant = parseInt(cantidad, 10);
  const precioReal = parseFloat(precioVendido);
  const costoUnit = parseFloat(producto.precio_costo);

  if (cant <= 0) throw new Error('La cantidad debe ser mayor a 0.');
  if (cant > stockActual) {
    throw new Error(`Stock insuficiente en esta tienda. Solo quedan ${stockActual} unidades.`);
  }

  const totalVenta = precioReal * cant;
  const gananciaNeta = (precioReal - costoUnit) * cant;
  const nombreCompleto = producto.potencia_detalle
    ? `${producto.nombre} (${producto.potencia_detalle})`
    : producto.nombre;

  // 1. Insertar registro en la tabla ventas
  const { data: venta, error: ventaError } = await supabase
    .from('ventas')
    .insert([
      {
        tienda_id: tiendaId,
        producto_id: producto.id,
        codigo_producto: producto.codigo,
        nombre_producto: nombreCompleto,
        cantidad: cant,
        precio_vendido: precioReal,
        costo_unitario: costoUnit,
        total_venta: totalVenta,
        ganancia_neta: gananciaNeta,
      },
    ])
    .select()
    .single();

  if (ventaError) throw ventaError;

  // 2. Descontar stock únicamente en la tienda donde se realizó la venta
  const nuevoStock = stockActual - cant;
  const { error: stockError } = await supabase
    .from('inventario_tienda')
    .update({ stock: nuevoStock })
    .eq('id', inventarioId);

  if (stockError) throw stockError;

  return venta;
};

export const obtenerVentasDelDia = async (tiendaId = null) => {
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);

  let query = supabase
    .from('ventas')
    .select(`
      *,
      tiendas ( nombre )
    `)
    .gte('fecha_venta', inicioDia.toISOString())
    .order('fecha_venta', { ascending: false });

  if (tiendaId) {
    query = query.eq('tienda_id', tiendaId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const anularVenta = async (venta) => {
  // 1. Buscar el registro de inventario de ese producto en esa tienda
  const { data: inv, error: invBuscarError } = await supabase
    .from('inventario_tienda')
    .select('id, stock')
    .eq('tienda_id', venta.tienda_id)
    .eq('producto_id', venta.producto_id)
    .single();

  if (invBuscarError && invBuscarError.code !== 'PGRST116') {
    throw invBuscarError;
  }

  // 2. Devolver las unidades al stock de la sucursal
  if (inv) {
    const stockRestaurado = (parseInt(inv.stock, 10) || 0) + (parseInt(venta.cantidad, 10) || 0);
    const { error: invUpdateError } = await supabase
      .from('inventario_tienda')
      .update({ stock: stockRestaurado })
      .eq('id', inv.id);

    if (invUpdateError) throw invUpdateError;
  }

  // 3. Eliminar la venta anulada
  const { error: deleteError } = await supabase
    .from('ventas')
    .delete()
    .eq('id', venta.id);

  if (deleteError) throw deleteError;
};

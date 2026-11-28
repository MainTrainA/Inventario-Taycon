import { supabase } from '@/lib/supabaseClient';
import { registrarAuditoria } from '@/services/auditoriaService';

export const obtenerTiendas = async () => {
  const { data, error } = await supabase
    .from('tiendas')
    .select('*')
    .order('nombre', { ascending: true });
  if (error) throw error;
  return data;
};

export const obtenerCatalogoConStock = async () => {
  const { data, error } = await supabase
    .from('productos')
    .select(`
      *,
      inventario_tienda (
        id,
        tienda_id,
        stock,
        tiendas ( nombre )
      )
    `)
    .eq('activo', true)
    .order('creado_en', { ascending: false });

  if (error) throw error;
  return data;
};

export const crearProductoConInventario = async (datosProducto, stockPorTienda) => {
  const { data: producto, error: prodError } = await supabase
    .from('productos')
    .insert([{
      codigo: datosProducto.codigo.trim().toUpperCase(),
      nombre: datosProducto.nombre.trim(),
      potencia_detalle: datosProducto.potencia_detalle.trim(),
      precio_costo: parseFloat(datosProducto.precio_costo),
      precio_venta_sugerido: parseFloat(datosProducto.precio_venta_sugerido),
      activo: true,
    }])
    .select()
    .single();

  if (prodError) throw prodError;

  const todasLasTiendas = await obtenerTiendas();
  const registrosInventario = todasLasTiendas.map((tienda) => ({
    tienda_id: tienda.id,
    producto_id: producto.id,
    stock: parseInt(stockPorTienda[tienda.id], 10) || 0,
  }));

  const { error: invError } = await supabase
    .from('inventario_tienda')
    .insert(registrosInventario);

  if (invError) throw invError;
  return producto;
};

export const actualizarProducto = async (productoId, datos) => {
  const payload = {
    codigo: datos.codigo.trim().toUpperCase(),
    nombre: datos.nombre.trim(),
    potencia_detalle: (datos.potencia_detalle || '').trim(),
    precio_venta_sugerido: parseFloat(datos.precio_venta_sugerido),
  };

  if (datos.precio_costo !== undefined && datos.precio_costo !== '') {
    payload.precio_costo = parseFloat(datos.precio_costo);
  }

  const { error } = await supabase
    .from('productos')
    .update(payload)
    .eq('id', productoId);

  if (error) throw error;

  const detalleCosto = payload.precio_costo !== undefined ? ` | Costo: Bs ${payload.precio_costo}` : '';
  await registrarAuditoria(
    'EDITAR_PRODUCTO',
    `Editó [${payload.codigo}] ${payload.nombre} — P. Sugerido: Bs ${payload.precio_venta_sugerido}${detalleCosto}`
  );
};

export const actualizarStockTienda = async (inventarioId, nuevoStock) => {
  const stockFinal = Math.max(0, parseInt(nuevoStock, 10) || 0);
  const { data, error } = await supabase
    .from('inventario_tienda')
    .update({ stock: stockFinal })
    .eq('id', inventarioId)
    .select('stock, productos(codigo, nombre), tiendas(nombre)')
    .single();

  if (error) throw error;

  if (data) {
    await registrarAuditoria(
      'AJUSTE_STOCK',
      `Ajustó stock de [${data.productos?.codigo}] ${data.productos?.nombre} en ${data.tiendas?.nombre} → Nuevo stock: ${stockFinal}`
    );
  }
};

export const traspasarStock = async ({
  invOrigenId,
  stockOrigenActual,
  invDestinoId,
  stockDestinoActual,
  cantidad,
}) => {
  const cant = parseInt(cantidad, 10) || 0;
  if (cant <= 0) throw new Error('La cantidad a traspasar debe ser mayor a 0.');
  if (cant > stockOrigenActual) {
    throw new Error(`Stock insuficiente en la tienda de origen (disponible: ${stockOrigenActual}).`);
  }

  const { data: dataOrigen, error: errOrigen } = await supabase
    .from('inventario_tienda')
    .update({ stock: stockOrigenActual - cant })
    .eq('id', invOrigenId)
    .select('productos(codigo, nombre), tiendas(nombre)')
    .single();

  if (errOrigen) throw errOrigen;

  const { data: dataDestino, error: errDestino } = await supabase
    .from('inventario_tienda')
    .update({ stock: stockDestinoActual + cant })
    .eq('id', invDestinoId)
    .select('tiendas(nombre)')
    .single();

  if (errDestino) {
    await supabase
      .from('inventario_tienda')
      .update({ stock: stockOrigenActual })
      .eq('id', invOrigenId);
    throw errDestino;
  }

  await registrarAuditoria(
    'TRASPASO_STOCK',
    `Traspasó ${cant} unid. de [${dataOrigen?.productos?.codigo}] ${dataOrigen?.productos?.nombre}: ${dataOrigen?.tiendas?.nombre} → ${dataDestino?.tiendas?.nombre}`
  );
};

export const eliminarProducto = async (productoId) => {
  const { data, error } = await supabase
    .from('productos')
    .update({ activo: false })
    .eq('id', productoId)
    .select('codigo, nombre')
    .single();

  if (error) throw error;

  if (data) {
    await registrarAuditoria(
      'ELIMINAR_PRODUCTO',
      `Archivó/eliminó [${data.codigo}] ${data.nombre} del catálogo`
    );
  }
};

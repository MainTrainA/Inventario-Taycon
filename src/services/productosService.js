import { supabase } from '@/lib/supabaseClient';

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
};

export const actualizarStockTienda = async (inventarioId, nuevoStock) => {
  const { error } = await supabase
    .from('inventario_tienda')
    .update({ stock: Math.max(0, parseInt(nuevoStock, 10) || 0) })
    .eq('id', inventarioId);

  if (error) throw error;
};

export const eliminarProducto = async (productoId) => {
  const { error: invError } = await supabase
    .from('inventario_tienda')
    .delete()
    .eq('producto_id', productoId);

  if (invError) throw invError;

  const { error: prodError } = await supabase
    .from('productos')
    .delete()
    .eq('id', productoId);

  if (prodError) throw prodError;
};

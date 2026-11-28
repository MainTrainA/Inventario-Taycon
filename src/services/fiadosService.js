import { supabase } from '@/lib/supabaseClient';
import { registrarAuditoria } from '@/services/auditoriaService';
import { formatearMoneda } from '@/lib/formatters';

export const obtenerFiados = async (tiendaId = null) => {
  let query = supabase
    .from('cuentas_por_cobrar')
    .select('*')
    .order('fecha_registro', { ascending: false });

  if (tiendaId) {
    query = query.eq('tienda_id', tiendaId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const crearFiado = async ({ tiendaId, cliente, telefono, detalle, montoTotal, adelanto = 0 }) => {
  const total = parseFloat(montoTotal);
  const pagoInicial = parseFloat(adelanto) || 0;

  if (!cliente?.trim()) throw new Error('Ingresa el nombre del cliente.');
  if (!detalle?.trim()) throw new Error('Ingresa qué herramienta o detalle sacó.');
  if (isNaN(total) || total <= 0) throw new Error('Ingresa un monto total válido.');
  if (pagoInicial < 0 || pagoInicial > total) throw new Error('El adelanto no puede ser mayor al total.');

  const { data: { user } } = await supabase.auth.getUser();
  const ahora = new Date().toISOString();
  const abonosIniciales = pagoInicial > 0
    ? [{ monto: pagoInicial, fecha: ahora, nota: 'Adelanto inicial' }]
    : [];

  const yaSaldado = pagoInicial >= total;

  const { data, error } = await supabase
    .from('cuentas_por_cobrar')
    .insert([
      {
        tienda_id: tiendaId || null,
        cliente: cliente.trim(),
        telefono: (telefono || '').trim(),
        detalle: detalle.trim(),
        monto_total: total,
        monto_pagado: pagoInicial,
        abonos: abonosIniciales,
        estado: yaSaldado ? 'PAGADO' : 'PENDIENTE',
        usuario_email: user?.email || 'Usuario',
        fecha_registro: ahora,
        fecha_saldado: yaSaldado ? ahora : null,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  await registrarAuditoria(
    'CREAR_FIADO',
    `Fiado a ${cliente.trim()} por ${formatearMoneda(total)} (Adelanto: ${formatearMoneda(pagoInicial)}) — ${detalle.trim()}`
  );

  return data;
};

export const registrarAbono = async (fiado, montoAbono) => {
  const abono = parseFloat(montoAbono);
  const saldoActual = parseFloat(fiado.monto_total) - parseFloat(fiado.monto_pagado);

  if (isNaN(abono) || abono <= 0) throw new Error('Ingresa un abono válido mayor a 0.');
  if (abono > saldoActual + 0.01) throw new Error(`El abono supera el saldo pendiente (${formatearMoneda(saldoActual)}).`);

  const ahora = new Date().toISOString();
  const nuevoPagado = Math.min(parseFloat(fiado.monto_total), parseFloat(fiado.monto_pagado) + abono);
  const saldado = nuevoPagado >= parseFloat(fiado.monto_total) - 0.01;
  const nuevosAbonos = [
    ...(Array.isArray(fiado.abonos) ? fiado.abonos : []),
    { monto: abono, fecha: ahora, nota: saldado ? 'Pago final' : 'Abono' },
  ];

  const { data, error } = await supabase
    .from('cuentas_por_cobrar')
    .update({
      monto_pagado: nuevoPagado,
      abonos: nuevosAbonos,
      estado: saldado ? 'PAGADO' : 'PENDIENTE',
      fecha_saldado: saldado ? ahora : null,
    })
    .eq('id', fiado.id)
    .select()
    .single();

  if (error) throw error;

  await registrarAuditoria(
    'ABONO_FIADO',
    `Abono de ${formatearMoneda(abono)} de ${fiado.cliente}${saldado ? ' (SALDADO)' : ''}`
  );

  return data;
};

export const abrirWhatsAppCobro = (fiado, nombreTienda) => {
  const saldo = Math.max(0, parseFloat(fiado.monto_total) - parseFloat(fiado.monto_pagado));
  const mensaje = [
    `*RECORDATORIO DE CUENTA — TAYCON*`,
    `Sucursal: ${nombreTienda || 'Ferretería TAYCON'}`,
    `Cliente: ${fiado.cliente}`,
    `Detalle: ${fiado.detalle}`,
    `Total: ${formatearMoneda(fiado.monto_total)}`,
    `Pagado hasta hoy: ${formatearMoneda(fiado.monto_pagado)}`,
    `*Saldo Pendiente: ${formatearMoneda(saldo)}*`,
  ].join('\n');

  const telLimpio = (fiado.telefono || '').replace(/\D/g, '');
  const destino = telLimpio
    ? (telLimpio.startsWith('591') ? telLimpio : `591${telLimpio}`)
    : '59165638679';

  window.open(`https://wa.me/${destino}?text=${encodeURIComponent(mensaje)}`, '_blank');
};

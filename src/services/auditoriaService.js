import { supabase } from '@/lib/supabaseClient';

export const registrarAuditoria = async (accion, detalle) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const usuarioEmail = user?.email || 'Desconocido';

    await supabase.from('auditoria').insert([
      {
        usuario_email: usuarioEmail,
        accion,
        detalle,
      },
    ]);
  } catch (error) {
    console.error('Error registrando auditoría:', error);
  }
};

export const obtenerAuditoria = async (limite = 60) => {
  const { data, error } = await supabase
    .from('auditoria')
    .select('*')
    .order('creado_en', { ascending: false })
    .limit(limite);

  if (error) throw error;
  return data || [];
};

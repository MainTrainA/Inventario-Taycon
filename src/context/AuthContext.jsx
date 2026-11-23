'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext({});

const EMAIL_ADMIN = 'administrador@gmail.com';

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);

  const cargarPerfil = async (user) => {
    if (!user) {
      setPerfil(null);
      return;
    }

    const emailLimpio = (user.email || '').trim().toLowerCase();
    const esCorreoAdmin = emailLimpio === EMAIL_ADMIN;

    const { data } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setPerfil({
        ...data,
        rol: esCorreoAdmin ? 'admin' : data.rol,
        nombre: esCorreoAdmin ? 'Administrador' : data.nombre,
      });
    } else {
      setPerfil({
        id: user.id,
        email: user.email,
        nombre: esCorreoAdmin ? 'Administrador' : user.email?.split('@')[0] || 'Usuario',
        rol: esCorreoAdmin ? 'admin' : 'vendedor',
        tienda_id: null,
      });
    }
  };

  useEffect(() => {
    const iniciarSesion = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      setUsuario(user);
      await cargarPerfil(user);
      setCargandoAuth(false);
    };

    iniciarSesion();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      setUsuario(user);
      await cargarPerfil(user);
      setCargandoAuth(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    setUsuario(null);
    setPerfil(null);
  };

  const esAdmin =
    perfil?.rol === 'admin' ||
    (usuario?.email || '').trim().toLowerCase() === EMAIL_ADMIN;
  const tiendaAsignadaId = esAdmin ? null : perfil?.tienda_id || null;

  return (
    <AuthContext.Provider value={{ usuario, perfil, esAdmin, tiendaAsignadaId, cargandoAuth, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

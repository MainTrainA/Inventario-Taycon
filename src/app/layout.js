import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';

export const metadata = {
  title: 'TAYCON | Ferretería & Herramientas',
  description: 'Sistema de Inventario, Punto de Venta y Reportes para TAYCON',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-[#0a0f1c] text-slate-100 min-h-screen antialiased">
        <AuthProvider>
          <AuthGuard>{children}</AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}

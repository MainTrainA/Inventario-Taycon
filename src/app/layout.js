import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Taycon | Gestión de Inventario y Ventas',
  description: 'Sistema de control de inventario, códigos personalizados y ventas diarias para sucursales Taycon',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="dark">
      <body className="bg-[#090d16] text-slate-100 antialiased min-h-screen flex flex-col selection:bg-amber-500 selection:text-slate-950">
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}

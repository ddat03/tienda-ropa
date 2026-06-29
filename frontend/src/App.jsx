import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { auth, registrarNotificaciones, escucharNotificaciones } from './firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { Toaster, toast } from 'react-hot-toast';
import { Radio, Package, Settings } from 'lucide-react';

import Login from './pages/Login/Login';
import PanelLive from './pages/Live/PanelLive';
import PanelInventario from './pages/Inventory/PanelInventario';
import PanelAdmin from './pages/Admin/PanelAdmin';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function App() {
  const [usuario, setUsuario] = useState(undefined); // undefined = cargando

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setUsuario(user);
      if (user) {
        const token = await user.getIdToken();
        registrarNotificaciones(API_URL, token);
        escucharNotificaciones(payload => {
          toast(payload.notification?.body || 'Nueva notificación', { icon: '🔔', duration: 5000 });
        });
      }
    });
  }, []);

  if (usuario === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!usuario) return <Login />;

  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />

      <Routes>
        <Route path="/" element={<Navigate to="/live" replace />} />
        <Route path="/live" element={<PanelLive />} />
        <Route path="/inventario" element={<PanelInventario />} />
        <Route path="/admin" element={<PanelAdmin />} />
      </Routes>

      {/* Barra de navegación inferior */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 safe-area-inset-bottom z-20">
        <div className="flex">
          <NavItem to="/live" icon={Radio} label="Live" />
          <NavItem to="/inventario" icon={Package} label="Inventario" />
          <NavItem to="/admin" icon={Settings} label="Admin" />
        </div>
      </nav>
    </BrowserRouter>
  );
}

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
          isActive ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={`w-5 h-5 ${isActive ? 'text-brand-600' : ''}`} />
          {label}
        </>
      )}
    </NavLink>
  );
}

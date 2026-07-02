import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { PedidoBadge } from '../../components/shared/Badge';
import toast from 'react-hot-toast';
import { Users, ShoppingBag, TrendingUp, DollarSign, CheckCircle, Clock, Download, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PanelAdmin() {
  const [seccion, setSeccion] = useState('clientes');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-brand-600 text-white px-4 pt-10 pb-4">
        <h1 className="text-xl font-bold">Administración</h1>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-200 sticky top-0 z-10">
        {[
          { id: 'suscripciones', icon: UserPlus, label: 'Suscripciones' },
          { id: 'clientes', icon: Users, label: 'Clientes' },
          { id: 'ventas', icon: ShoppingBag, label: 'Ventas' },
          { id: 'stats', icon: TrendingUp, label: 'Stats' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSeccion(tab.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              seccion === tab.id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {seccion === 'suscripciones' && <SeccionSuscripciones />}
        {seccion === 'clientes' && <SeccionClientes />}
        {seccion === 'ventas' && <SeccionVentas />}
        {seccion === 'stats' && <SeccionEstadisticas />}
      </div>
    </div>
  );
}

// ── Sección Suscripciones ─────────────────────────────────────────────────────
const BANCOS = ['Banco Pichincha', 'Banco Guayaquil', 'Banco Pacífico', 'Produbanco', 'Banco Internacional', 'Banco del Austro', 'Cooperativa JEP', 'Cooperativa 29 de Octubre', 'Transferencia Nequi', 'Transferencia efectivo', 'Otro'];

function SeccionSuscripciones() {
  const api = useApi();
  const [clientes, setClientes] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState({
    nombre: '', telefono: '', tiktokUser: '', banco: '', montoSuscripcion: '20', prendaSuscripcion: '',
  });

  useEffect(() => {
    cargarClientes();
  }, []);

  async function cargarClientes() {
    try {
      const data = await api.get('/clientes');
      setClientes(data.filter(c => c.origen === 'manual' || c.banco));
    } catch (e) {
      toast.error(e.message);
    }
  }

  function setField(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }));
  }

  async function registrar(e) {
    e.preventDefault();
    if (!form.nombre.trim()) return toast.error('Nombre requerido');
    setGuardando(true);
    try {
      const res = await api.post('/clientes/registrar', form);
      toast.success(`✅ Registrado — Código: ${res.codigo}`);
      setForm({ nombre: '', telefono: '', tiktokUser: '', banco: '', montoSuscripcion: '20', prendaSuscripcion: '' });
      setMostrarForm(false);
      await cargarClientes();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  }

  function exportarCSV() {
    const filas = [
      ['Código', 'Nombre completo', 'Usuario TikTok', 'Banco', 'Monto suscripción', 'Prenda suscripción', 'Fecha registro'],
      ...clientesFiltrados.map(c => [
        c.codigo || '',
        c.nombre || '',
        c.tiktokUser || '',
        c.banco || '',
        c.montoSuscripcion || '',
        c.prendaSuscripcion || '',
        c.creadoEn ? format(new Date(c.creadoEn), 'dd/MM/yyyy') : '',
      ]),
    ];
    const csv = '﻿' + filas.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `suscripciones_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  }

  const clientesFiltrados = clientes.filter(c =>
    !busqueda || [c.nombre, c.codigo, c.tiktokUser, c.banco].some(v => v?.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div>
      {/* Barra superior */}
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text" placeholder="Buscar nombre, código, TikTok..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
        />
        <button onClick={exportarCSV}
          className="flex items-center gap-1.5 bg-green-600 text-white text-xs px-3 py-2 rounded-xl font-medium whitespace-nowrap">
          <Download className="w-3.5 h-3.5" /> Excel
        </button>
        <button onClick={() => setMostrarForm(f => !f)}
          className="flex items-center gap-1.5 bg-brand-600 text-white text-xs px-3 py-2 rounded-xl font-medium whitespace-nowrap">
          <UserPlus className="w-3.5 h-3.5" />
          {mostrarForm ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Formulario de registro */}
      {mostrarForm && (
        <form onSubmit={registrar} className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-4 space-y-3">
          <h3 className="font-bold text-brand-800 text-sm">Nueva suscripción</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-600 font-medium">Nombre completo *</label>
              <input value={form.nombre} onChange={e => setField('nombre', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-brand-400"
                placeholder="Ej: María García" />
            </div>
            <div>
              <label className="text-xs text-gray-600 font-medium">Teléfono WhatsApp</label>
              <input value={form.telefono} onChange={e => setField('telefono', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-brand-400"
                placeholder="593987654321" />
            </div>
            <div>
              <label className="text-xs text-gray-600 font-medium">Usuario TikTok</label>
              <input value={form.tiktokUser} onChange={e => setField('tiktokUser', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-brand-400"
                placeholder="sin @" />
            </div>
            <div>
              <label className="text-xs text-gray-600 font-medium">Banco / método de pago</label>
              <select value={form.banco} onChange={e => setField('banco', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-brand-400 bg-white">
                <option value="">Seleccionar...</option>
                {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 font-medium">Monto suscripción ($)</label>
              <input type="number" value={form.montoSuscripcion} onChange={e => setField('montoSuscripcion', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-brand-400"
                placeholder="20" min="0" step="0.01" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-600 font-medium">Prenda al suscribirse</label>
              <input value={form.prendaSuscripcion} onChange={e => setField('prendaSuscripcion', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-brand-400"
                placeholder="Ej: blusa rosada M" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={guardando}
              className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
              {guardando ? 'Registrando...' : '✅ Registrar y generar código'}
            </button>
            <button type="button" onClick={() => setMostrarForm(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-2.5 px-4 rounded-xl text-sm transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Contador */}
      <p className="text-xs text-gray-400 mb-2">{clientesFiltrados.length} suscripción{clientesFiltrados.length !== 1 ? 'es' : ''}</p>

      {/* Tabla */}
      <div className="overflow-x-auto -mx-4">
        <table className="w-full text-xs min-w-[600px]">
          <thead>
            <tr className="bg-gray-100 text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-2 text-left font-semibold">Código</th>
              <th className="px-3 py-2 text-left font-semibold">Nombre</th>
              <th className="px-3 py-2 text-left font-semibold">TikTok</th>
              <th className="px-3 py-2 text-left font-semibold">Banco</th>
              <th className="px-3 py-2 text-right font-semibold">Monto</th>
              <th className="px-3 py-2 text-left font-semibold">Prenda</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clientesFiltrados.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-3 py-2">
                  <span className="font-mono font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                    {c.codigo || '—'}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium text-gray-800">{c.nombre || '—'}</td>
                <td className="px-3 py-2 text-gray-500">{c.tiktokUser ? `@${c.tiktokUser}` : '—'}</td>
                <td className="px-3 py-2 text-gray-500">{c.banco || '—'}</td>
                <td className="px-3 py-2 text-right font-semibold text-green-600">
                  {c.montoSuscripcion ? `$${c.montoSuscripcion}` : '—'}
                </td>
                <td className="px-3 py-2 text-gray-500 capitalize">{c.prendaSuscripcion || '—'}</td>
              </tr>
            ))}
            {clientesFiltrados.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-10">Sin registros</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Sección Clientes ──────────────────────────────────────────────────────────
function SeccionClientes() {
  const api = useApi();
  const [clientes, setClientes] = useState([]);
  const [filtro, setFiltro] = useState('todos');

  useEffect(() => {
    api.get('/clientes').then(setClientes).catch(e => toast.error(e.message));
  }, []);

  const pendientes = clientes.filter(c => c.estado === 'pendiente_confirmacion');
  const activos = clientes.filter(c => c.activo);

  const mostrar = filtro === 'pendientes' ? pendientes
    : filtro === 'activos' ? activos
    : clientes;

  async function confirmarAbono(clienteId) {
    try {
      const res = await api.post(`/clientes/confirmar-abono/${clienteId}`);
      toast.success(`✅ Código asignado: ${res.codigo}`);
      setClientes(prev => prev.map(c => c.id === clienteId
        ? { ...c, activo: true, estado: 'activo', codigo: res.codigo }
        : c
      ));
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      {pendientes.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <p className="text-sm text-orange-700">
            <strong>{pendientes.length}</strong> abono{pendientes.length > 1 ? 's' : ''} esperando confirmación
          </p>
        </div>
      )}

      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {[['todos', 'Todos'], ['pendientes', '⏳ Pendientes'], ['activos', '✅ Activos']].map(([id, label]) => (
          <button key={id} onClick={() => setFiltro(id)}
            className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium ${
              filtro === id ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {mostrar.map(cliente => (
          <TarjetaCliente key={cliente.id} cliente={cliente} onConfirmar={confirmarAbono} />
        ))}
        {mostrar.length === 0 && (
          <p className="text-center text-gray-400 py-10">Sin clientes</p>
        )}
      </div>
    </div>
  );
}

function TarjetaCliente({ cliente, onConfirmar }) {
  const esPendiente = cliente.estado === 'pendiente_confirmacion';
  const urgente = cliente.diasRestantes !== null && cliente.diasRestantes <= 3 && cliente.activo;

  return (
    <div className={`bg-white rounded-xl p-3 shadow-sm ${urgente ? 'border border-orange-300' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900">{cliente.nombre || 'Sin nombre'}</p>
          <p className="text-xs text-gray-400 mt-0.5">{cliente.telefono?.replace('whatsapp:', '')}</p>
        </div>
        {esPendiente ? (
          <button onClick={() => onConfirmar(cliente.id)}
            className="bg-brand-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Confirmar abono
          </button>
        ) : (
          <div className="text-right">
            {cliente.codigo && (
              <span className="font-mono font-bold text-brand-600 text-sm bg-brand-50 px-2 py-0.5 rounded-lg">
                {cliente.codigo}
              </span>
            )}
            {cliente.diasRestantes !== null && (
              <p className={`text-xs mt-1 ${urgente ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
                {cliente.diasRestantes > 0
                  ? `${cliente.diasRestantes} días restantes`
                  : 'Vencido'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sección Ventas ────────────────────────────────────────────────────────────
function SeccionVentas() {
  const api = useApi();
  const [ventas, setVentas] = useState([]);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    api.get('/pedidos/historial').then(setVentas).catch(e => toast.error(e.message));
  }, []);

  const ventasFiltradas = ventas.filter(v =>
    !busqueda || [v.nombre, v.codigoCliente, v.prenda, v.color, v.tiktokUser]
      .some(val => val?.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const totalIngresos = ventasFiltradas.reduce((s, v) => s + (Number(v.precio) || 0), 0);

  function exportarCSV() {
    const filas = [
      ['Fecha', 'Código', 'Nombre', 'TikTok', 'Prenda', 'Color', 'Talla', 'Precio'],
      ...ventasFiltradas.map(v => [
        v.ventaEn ? format(new Date(v.ventaEn), 'dd/MM/yyyy HH:mm') : '',
        v.codigoCliente || '',
        v.nombre || '',
        v.tiktokUser ? `@${v.tiktokUser}` : '',
        v.prenda || '',
        v.color || '',
        v.talla || '',
        v.precio || 0,
      ]),
    ];
    const csv = '﻿' + filas.map(r => r.map(val => `"${val}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ventas_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  }

  return (
    <div>
      {/* Barra superior */}
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text" placeholder="Buscar nombre, código, prenda..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
        />
        <button onClick={exportarCSV}
          className="flex items-center gap-1.5 bg-green-600 text-white text-xs px-3 py-2 rounded-xl font-medium whitespace-nowrap">
          <Download className="w-3.5 h-3.5" /> Excel
        </button>
      </div>

      {/* Resumen */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs text-gray-400">{ventasFiltradas.length} venta{ventasFiltradas.length !== 1 ? 's' : ''}</span>
        <span className="text-sm font-bold text-green-600">${totalIngresos.toFixed(2)}</span>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto -mx-4">
        <table className="w-full text-xs min-w-[620px]">
          <thead>
            <tr className="bg-gray-100 text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-2 text-left font-semibold">Fecha</th>
              <th className="px-3 py-2 text-left font-semibold">Código</th>
              <th className="px-3 py-2 text-left font-semibold">Nombre / TikTok</th>
              <th className="px-3 py-2 text-left font-semibold">Prenda</th>
              <th className="px-3 py-2 text-left font-semibold">Color</th>
              <th className="px-3 py-2 text-center font-semibold">Talla</th>
              <th className="px-3 py-2 text-right font-semibold">Precio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ventasFiltradas.map(v => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                  {v.ventaEn ? format(new Date(v.ventaEn), 'dd/MM HH:mm') : '—'}
                </td>
                <td className="px-3 py-2">
                  <span className="font-mono font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                    {v.codigoCliente || '—'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <p className="font-medium text-gray-800 truncate max-w-[120px]">{v.nombre || '—'}</p>
                  {v.tiktokUser && (
                    <p className="text-[10px] text-gray-400">@{v.tiktokUser}</p>
                  )}
                </td>
                <td className="px-3 py-2 text-gray-700 capitalize">{v.prenda || '—'}</td>
                <td className="px-3 py-2 text-gray-500 capitalize">{v.color || '—'}</td>
                <td className="px-3 py-2 text-center">
                  <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{v.talla || '—'}</span>
                </td>
                <td className="px-3 py-2 text-right font-semibold text-green-600">
                  {v.precio > 0 ? `$${v.precio}` : '—'}
                </td>
              </tr>
            ))}
            {ventasFiltradas.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-gray-400 py-10">Sin ventas registradas</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Sección Estadísticas ──────────────────────────────────────────────────────
function SeccionEstadisticas() {
  const api = useApi();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/pedidos/estadisticas').then(setStats).catch(e => toast.error(e.message));
  }, []);

  if (!stats) return <div className="text-center py-12 text-gray-400">Cargando estadísticas...</div>;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard icon={ShoppingBag} label="Total ventas" value={stats.totalVentas} color="brand" />
        <KpiCard icon={DollarSign} label="Ingresos" value={`$${stats.ingresos}`} color="green" />
      </div>

      {/* Ranking prendas más vendidas */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-600" /> Más vendidas
        </h3>
        {stats.rankingPrendas.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Sin datos aún</p>
        ) : (
          <div className="space-y-2">
            {stats.rankingPrendas.map((item, i) => (
              <div key={item.prenda} className="flex items-center gap-3">
                <span className={`text-sm font-bold w-6 text-center ${
                  i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-600' : 'text-gray-300'
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium capitalize truncate">{item.prenda}</p>
                  <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full"
                      style={{ width: `${(item.total / stats.rankingPrendas[0].total) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-700">{item.total}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }) {
  const colors = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-green-50 text-green-600',
  };
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

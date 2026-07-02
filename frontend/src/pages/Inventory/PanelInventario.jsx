import { useState } from 'react';
import { useInventarioRT } from '../../hooks/useInventario';
import { useApi } from '../../hooks/useApi';
import { EstadoBadge } from '../../components/shared/Badge';
import toast from 'react-hot-toast';
import { Plus, Package, Search, Edit2, Trash2, PlusCircle } from 'lucide-react';

export default function PanelInventario() {
  const { inventario, loading } = useInventarioRT();
  const api = useApi();
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalStock, setModalStock] = useState(null); // { id, nombre }
  const [modalEditar, setModalEditar] = useState(null);

  const filtrado = inventario.filter(item => {
    const coincideBusqueda =
      item.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.color?.toLowerCase().includes(busqueda.toLowerCase());
    const coincideEstado = filtroEstado === 'todos' || item.estado === filtroEstado;
    return coincideBusqueda && coincideEstado;
  });

  const resumen = {
    total: inventario.length,
    agotados: inventario.filter(i => i.estado === 'agotado').length,
    bajos: inventario.filter(i => i.estado === 'bajo').length,
  };

  async function eliminar(id, nombre) {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    try {
      await api.del(`/inventario/${id}`);
      toast.success('Prenda eliminada');
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-brand-600 text-white px-4 pt-10 pb-6">
        <h1 className="text-xl font-bold">Inventario</h1>
        <div className="flex gap-3 mt-3">
          <StatChip label="Total" value={resumen.total} />
          <StatChip label="🟡 Bajos" value={resumen.bajos} warn />
          <StatChip label="🔴 Agotados" value={resumen.agotados} danger />
        </div>
      </div>

      {/* Buscador y filtros */}
      <div className="px-4 py-3 bg-white shadow-sm sticky top-0 z-10">
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar prenda o color..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['todos', 'disponible', 'bajo', 'agotado'].map(f => (
            <button
              key={f}
              onClick={() => setFiltroEstado(f)}
              className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filtroEstado === f
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'todos' ? 'Todos' : f === 'disponible' ? '🟢 Disponible' : f === 'bajo' ? '🟡 Pocas' : '🔴 Agotado'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="px-4 py-3 space-y-2">
        {loading ? (
          <SkeletonList />
        ) : filtrado.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Sin prendas{busqueda ? ` con "${busqueda}"` : ''}</p>
          </div>
        ) : (
          filtrado.map(item => (
            <TarjetaPrenda
              key={item.id}
              item={item}
              onAgregarStock={() => setModalStock({ id: item.id, nombre: `${item.nombre} ${item.color} ${item.talla}` })}
              onEditar={() => setModalEditar(item)}
              onEliminar={() => eliminar(item.id, item.nombre)}
            />
          ))
        )}
      </div>

      {/* FAB agregar */}
      <button
        onClick={() => setModalAgregar(true)}
        className="fixed bottom-24 right-4 bg-brand-600 hover:bg-brand-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl active:scale-95 transition-transform z-10"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modales */}
      {modalAgregar && (
        <ModalNuevaPrenda
          onClose={() => setModalAgregar(false)}
          onGuardar={async (datos) => {
            await api.post('/inventario', datos);
            toast.success('Prenda agregada');
            setModalAgregar(false);
          }}
        />
      )}
      {modalStock && (
        <ModalAgregarStock
          prenda={modalStock}
          onClose={() => setModalStock(null)}
          onGuardar={async (cantidad) => {
            await api.post(`/inventario/${modalStock.id}/agregar-stock`, { cantidad });
            toast.success(`+${cantidad} unidades agregadas`);
            setModalStock(null);
          }}
        />
      )}
      {modalEditar && (
        <ModalEditarPrenda
          item={modalEditar}
          onClose={() => setModalEditar(null)}
          onGuardar={async (datos) => {
            await api.put(`/inventario/${modalEditar.id}`, datos);
            toast.success('Prenda actualizada');
            setModalEditar(null);
          }}
        />
      )}
    </div>
  );
}

function TarjetaPrenda({ item, onAgregarStock, onEditar, onEliminar }) {
  return (
    <div className={`bg-white rounded-xl p-3 shadow-sm border-l-4 ${
      item.estado === 'agotado' ? 'border-red-400' :
      item.estado === 'bajo' ? 'border-yellow-400' : 'border-green-400'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 capitalize truncate">{item.nombre}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-gray-500 capitalize">{item.color}</span>
            <span className="text-gray-300">·</span>
            <span className="text-sm font-mono text-gray-500">{item.talla}</span>
            {item.precio && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-sm text-brand-600 font-medium">${item.precio}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <EstadoBadge estado={item.estado} />
          <span className="text-2xl font-bold text-gray-800 w-8 text-right">{item.cantidad}</span>
        </div>
      </div>
      <div className="flex gap-2 mt-2">
        <button
          onClick={onAgregarStock}
          className="flex items-center gap-1 text-xs text-brand-600 font-medium bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded-lg transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" /> Stock
        </button>
        <button
          onClick={onEditar}
          className="flex items-center gap-1 text-xs text-gray-600 font-medium bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-lg transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" /> Editar
        </button>
        <button
          onClick={onEliminar}
          className="flex items-center gap-1 text-xs text-red-600 font-medium bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors ml-auto"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function StatChip({ label, value, warn, danger }) {
  return (
    <div className={`rounded-xl px-3 py-1.5 text-center min-w-[70px] ${
      danger ? 'bg-red-500' : warn ? 'bg-yellow-500' : 'bg-white/20'
    }`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs opacity-80">{label}</p>
    </div>
  );
}

function SkeletonList() {
  return Array.from({ length: 5 }).map((_, i) => (
    <div key={i} className="bg-white rounded-xl p-3 shadow-sm animate-pulse h-16" />
  ));
}

function ModalNuevaPrenda({ onClose, onGuardar }) {
  const [form, setForm] = useState({ nombre: '', color: '', talla: 'M', cantidad: 1, precio: '', codigoPrenda: '', imagen: '' });
  const api = useApi();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal titulo="Nueva Prenda" onClose={onClose}>
      <FormPrenda form={form} set={set} />
      <button
        onClick={async () => {
          if (!form.nombre || !form.color) return toast.error('Nombre y color requeridos');
          await onGuardar(form);
        }}
        disabled={api.loading}
        className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold mt-4 disabled:opacity-50"
      >
        {api.loading ? 'Guardando...' : 'Agregar Prenda'}
      </button>
    </Modal>
  );
}

function ModalEditarPrenda({ item, onClose, onGuardar }) {
  const [form, setForm] = useState({
    nombre: item.nombre,
    color: item.color,
    talla: item.talla,
    cantidad: item.cantidad,
    precio: item.precio || '',
    codigoPrenda: item.codigoPrenda || '',
    imagen: item.imagen || '',
  });
  const api = useApi();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal titulo="Editar Prenda" onClose={onClose}>
      <FormPrenda form={form} set={set} />
      <button
        onClick={async () => onGuardar(form)}
        disabled={api.loading}
        className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold mt-4 disabled:opacity-50"
      >
        Guardar Cambios
      </button>
    </Modal>
  );
}

function ModalAgregarStock({ prenda, onClose, onGuardar }) {
  const [cantidad, setCantidad] = useState(1);
  return (
    <Modal titulo="Agregar Stock" onClose={onClose}>
      <p className="text-gray-600 text-sm mb-3">{prenda.nombre}</p>
      <div className="flex items-center gap-4 justify-center my-4">
        <button onClick={() => setCantidad(c => Math.max(1, c - 1))}
          className="w-10 h-10 rounded-full bg-gray-200 text-xl font-bold">−</button>
        <span className="text-3xl font-bold w-12 text-center">{cantidad}</span>
        <button onClick={() => setCantidad(c => c + 1)}
          className="w-10 h-10 rounded-full bg-gray-200 text-xl font-bold">+</button>
      </div>
      <button onClick={() => onGuardar(cantidad)}
        className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold">
        Agregar {cantidad} unidad{cantidad > 1 ? 'es' : ''}
      </button>
    </Modal>
  );
}

function FormPrenda({ form, set }) {
  const tallas = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ÚNICA'];
  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';
  return (
    <div className="space-y-3">
      <input placeholder="Nombre de la prenda" value={form.nombre}
        onChange={e => set('nombre', e.target.value)} className={inputCls} />
      <input placeholder="Código de prenda (ej: BL-001)" value={form.codigoPrenda || ''}
        onChange={e => set('codigoPrenda', e.target.value)} className={inputCls} />
      <input placeholder="Color" value={form.color}
        onChange={e => set('color', e.target.value)} className={inputCls} />
      <select value={form.talla} onChange={e => set('talla', e.target.value)} className={inputCls}>
        {tallas.map(t => <option key={t}>{t}</option>)}
      </select>
      <div className="flex gap-2">
        <input type="number" placeholder="Cantidad" min={0} value={form.cantidad}
          onChange={e => set('cantidad', Number(e.target.value))}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <input type="number" placeholder="Precio $" min={0} value={form.precio}
          onChange={e => set('precio', e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      <input placeholder="URL de imagen (opcional)" value={form.imagen || ''}
        onChange={e => set('imagen', e.target.value)} className={inputCls} />
    </div>
  );
}

function Modal({ titulo, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={onClose}>
      <div className="bg-white w-full rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">{titulo}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

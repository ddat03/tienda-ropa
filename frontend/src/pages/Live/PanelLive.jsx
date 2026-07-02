import { useState, useEffect } from 'react';
import { usePedidosLive } from '../../hooks/usePedidosLive';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, X, Radio, Wifi, Shirt } from 'lucide-react';

export default function PanelLive() {
  const { pedidos, loading } = usePedidosLive();
  const api = useApi();
  const [procesando, setProcesando] = useState(null);
  const [liveUsuario, setLiveUsuario] = useState('');
  const [inputUsuario, setInputUsuario] = useState('');
  const [conectando, setConectando] = useState(false);
  const [estadoTiktok, setEstadoTiktok] = useState(null);
  const [prendaActiva, setPrendaActiva] = useState(null);
  const [prendasDisponibles, setPrendasDisponibles] = useState([]);

  useEffect(() => {
    // Cargar inventario para el selector de prendas
    api.get('/inventario').then(data => {
      const seen = new Map();
      (data || []).forEach(item => {
        if (item.nombre && !seen.has(item.nombre)) {
          seen.set(item.nombre, { nombre: item.nombre, codigoPrenda: item.codigoPrenda || '', imagen: item.imagen || '' });
        }
      });
      setPrendasDisponibles([...seen.values()]);
    }).catch(() => {});

    // Cargar estado TikTok
    api.get('/tiktok/estado').then(data => {
      if (data.vigilando) {
        setLiveUsuario(data.usuario);
        setEstadoTiktok(data.enLive ? 'en_live' : 'esperando');
      }
      if (data.prendaActiva) setPrendaActiva(data.prendaActiva);
    }).catch(() => {});

    const intervalo = setInterval(() => {
      api.get('/tiktok/estado').then(data => {
        if (!data.vigilando) { setEstadoTiktok(null); setLiveUsuario(''); return; }
        setLiveUsuario(data.usuario);
        setEstadoTiktok(data.enLive ? 'en_live' : 'esperando');
        setPrendaActiva(data.prendaActiva || null);
      }).catch(() => {});
    }, 15000);

    return () => clearInterval(intervalo);
  }, []);

  async function iniciarVigilancia() {
    if (!inputUsuario.trim()) return toast.error('Escribe el usuario de TikTok');
    setConectando(true);
    try {
      const data = await api.post('/tiktok/iniciar', { usuario: inputUsuario.trim() });
      setLiveUsuario(data.usuario);
      setEstadoTiktok('esperando');
      setInputUsuario('');
      toast.success(`👁️ Vigilando @${data.usuario}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setConectando(false);
    }
  }

  async function detenerVigilancia() {
    setConectando(true);
    try {
      await api.post('/tiktok/detener');
      setEstadoTiktok(null);
      setLiveUsuario('');
      toast.success('⏹️ Vigilancia desactivada');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setConectando(false);
    }
  }

  async function activarPrenda(nombre) {
    try {
      await api.post('/tiktok/prenda', { prenda: nombre });
      setPrendaActiva(nombre);
      toast.success(`👗 ${nombre}`);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function limpiarPrenda() {
    try {
      await api.post('/tiktok/prenda', { prenda: null });
      setPrendaActiva(null);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function confirmar(pedidoId) {
    setProcesando(pedidoId);
    try {
      await api.post(`/pedidos/${pedidoId}/confirmar`);
      toast.success('✅ Confirmado');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcesando(null);
    }
  }

  async function rechazar(pedidoId) {
    setProcesando(pedidoId);
    try {
      await api.post(`/pedidos/${pedidoId}/rechazar`, { motivo: 'no está disponible en este momento' });
      toast.success('❌ Rechazado');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcesando(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-2 pb-20">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1 bg-red-600 rounded-full px-2.5 py-1">
          <Radio className="w-3 h-3 animate-pulse" />
          <span className="text-xs font-bold tracking-wide">EN VIVO</span>
        </div>
        <h1 className="text-base font-bold">Panel Live</h1>
        <span className="ml-auto bg-gray-800 rounded-full px-2 py-0.5 text-xs text-gray-400">
          {pedidos.length} pendientes
        </span>
      </div>

      {/* Control TikTok */}
      <div className="mb-2 bg-gray-900 rounded-xl p-2.5 border border-gray-800">
        {estadoTiktok === 'en_live' ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-green-400 animate-pulse" />
              <span className="text-xs text-green-400 font-semibold">@{liveUsuario}</span>
              <span className="text-xs bg-red-600 text-white px-1 py-0.5 rounded">EN LIVE</span>
            </div>
            <button onClick={detenerVigilancia} disabled={conectando}
              className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg px-2.5 py-1.5 font-medium">
              Detener
            </button>
          </div>
        ) : estadoTiktok === 'esperando' ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              <span className="text-xs text-yellow-400">Esperando @{liveUsuario}</span>
            </div>
            <button onClick={detenerVigilancia} disabled={conectando}
              className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg px-2.5 py-1.5 font-medium">
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text" placeholder="usuario TikTok sin @"
              value={inputUsuario} onChange={e => setInputUsuario(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && iniciarVigilancia()}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs placeholder-gray-600 focus:outline-none focus:border-gray-500"
            />
            <button onClick={iniciarVigilancia} disabled={conectando}
              className="flex items-center gap-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap">
              <Wifi className="w-3 h-3" />
              {conectando ? '...' : 'Vigilar'}
            </button>
          </div>
        )}
      </div>

      {/* Selector de Prenda Activa */}
      {prendasDisponibles.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Shirt className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Prenda en cámara</span>
            {prendaActiva && (
              <button onClick={limpiarPrenda} className="ml-auto text-[10px] text-gray-600 hover:text-gray-400 underline">
                quitar
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {prendasDisponibles.map(({ nombre, codigoPrenda, imagen }) => (
              <TarjetaPrendaSelector
                key={nombre}
                nombre={nombre}
                codigoPrenda={codigoPrenda}
                imagen={imagen}
                activa={prendaActiva === nombre}
                onIniciar={() => activarPrenda(nombre)}
                onParar={limpiarPrenda}
              />
            ))}
          </div>
        </div>
      )}

      {/* Grid de pedidos */}
      {loading ? (
        <div className="text-center text-gray-500 py-12">Cargando...</div>
      ) : pedidos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">📦</p>
          <p className="text-gray-400 text-sm">Esperando pedidos del live...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {pedidos.map((pedido) => (
            <TarjetaPedido
              key={pedido.id}
              pedido={pedido}
              procesando={procesando === pedido.id}
              onConfirmar={() => confirmar(pedido.id)}
              onRechazar={() => rechazar(pedido.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TarjetaPrendaSelector({ nombre, codigoPrenda, imagen, activa, onIniciar, onParar }) {
  return (
    <div className={`flex-none rounded-xl p-2 border transition-colors min-w-[96px] max-w-[120px] ${
      activa ? 'bg-brand-900/60 border-brand-500' : 'bg-gray-900 border-gray-700'
    }`}>
      {imagen ? (
        <img src={imagen} alt={nombre} className="w-full h-14 object-cover rounded-lg mb-1.5" />
      ) : (
        <div className="w-full h-14 bg-gray-800 rounded-lg mb-1.5 flex items-center justify-center">
          <Shirt className="w-6 h-6 text-gray-600" />
        </div>
      )}
      <p className="text-[11px] font-semibold capitalize truncate leading-tight">{nombre}</p>
      {codigoPrenda && (
        <p className="text-[9px] text-gray-500 font-mono truncate">{codigoPrenda}</p>
      )}
      {activa ? (
        <div className="mt-1.5 flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          <button
            onClick={onParar}
            className="flex-1 text-[10px] bg-red-700 hover:bg-red-600 active:bg-red-800 rounded-lg py-1 font-bold transition-colors"
          >
            PARE
          </button>
        </div>
      ) : (
        <button
          onClick={onIniciar}
          className="mt-1.5 w-full text-[10px] bg-brand-700 hover:bg-brand-600 active:bg-brand-800 rounded-lg py-1 font-bold transition-colors"
        >
          INICIO
        </button>
      )}
    </div>
  );
}

function TarjetaPedido({ pedido, procesando, onConfirmar, onRechazar }) {
  const tiempoAtras = formatDistanceToNow(pedido.creadoEn, { locale: es, addSuffix: true });

  return (
    <div className="bg-gray-800 rounded-xl p-2.5 border border-gray-700 flex flex-col gap-2">
      {/* Código + origen */}
      <div className="flex items-center justify-between gap-1">
        <span className="bg-brand-600 text-white text-xs font-mono font-bold px-1.5 py-0.5 rounded-md leading-none">
          {pedido.codigoCliente}
        </span>
        <div className="flex items-center gap-1">
          {pedido.origen === 'tiktok' && (
            <span className="bg-pink-900 text-pink-300 text-[10px] px-1 py-0.5 rounded leading-none">TT</span>
          )}
          {pedido.aproximado && (
            <span className="bg-yellow-800 text-yellow-300 text-[10px] px-1 py-0.5 rounded leading-none">~</span>
          )}
        </div>
      </div>

      {/* Detalle prenda */}
      <div className="flex-1 min-w-0">
        {pedido.prenda && pedido.prenda !== 'prenda' && (
          <p className="text-[10px] text-brand-400 font-medium capitalize truncate leading-tight">{pedido.prenda}</p>
        )}
        <p className="text-sm font-bold capitalize truncate leading-tight">{pedido.color}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="bg-gray-700 text-gray-300 text-[10px] px-1.5 py-0.5 rounded font-mono">{pedido.talla}</span>
          <span className="text-gray-500 text-[10px] truncate">{tiempoAtras}</span>
        </div>
        {pedido.nombre && (
          <p className="text-gray-500 text-[10px] truncate mt-0.5">{pedido.nombre}</p>
        )}
      </div>

      {/* Texto original pequeño */}
      {pedido.textoOriginal && (
        <p className="text-gray-600 text-[10px] italic truncate">"{pedido.textoOriginal}"</p>
      )}

      {/* Botones */}
      <div className="flex gap-1">
        <button
          onClick={onConfirmar} disabled={procesando}
          className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-500 active:bg-green-700 disabled:opacity-50 rounded-lg py-2 text-xs font-bold transition-colors"
        >
          <Check className="w-3.5 h-3.5" /> OK
        </button>
        <button
          onClick={onRechazar} disabled={procesando}
          className="flex-1 flex items-center justify-center gap-1 bg-red-700 hover:bg-red-600 active:bg-red-800 disabled:opacity-50 rounded-lg py-2 text-xs font-bold transition-colors"
        >
          <X className="w-3.5 h-3.5" /> NO
        </button>
      </div>
    </div>
  );
}

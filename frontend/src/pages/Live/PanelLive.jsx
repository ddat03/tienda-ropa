import { useState, useEffect } from 'react';
import { usePedidosLive } from '../../hooks/usePedidosLive';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, X, Radio, Wifi, WifiOff } from 'lucide-react';

export default function PanelLive() {
  const { pedidos, loading } = usePedidosLive();
  const api = useApi();
  const [procesando, setProcesando] = useState(null);
  const [liveUsuario, setLiveUsuario] = useState('');
  const [inputUsuario, setInputUsuario] = useState('');
  const [conectando, setConectando] = useState(false);
  // null | 'esperando' | 'en_live'
  const [estadoTiktok, setEstadoTiktok] = useState(null);

  useEffect(() => {
    api.get('/tiktok/estado').then(data => {
      if (data.vigilando) {
        setLiveUsuario(data.usuario);
        setEstadoTiktok(data.enLive ? 'en_live' : 'esperando');
      }
    }).catch(() => {});

    // Refresca el estado TikTok cada 15s para detectar cuando arranca el live
    const intervalo = setInterval(() => {
      api.get('/tiktok/estado').then(data => {
        if (!data.vigilando) { setEstadoTiktok(null); setLiveUsuario(''); return; }
        setLiveUsuario(data.usuario);
        setEstadoTiktok(data.enLive ? 'en_live' : 'esperando');
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
      toast.success(`👁️ Vigilando @${data.usuario} — se conectará al iniciar el live`);
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

  async function confirmar(pedidoId) {
    setProcesando(pedidoId);
    try {
      await api.post(`/pedidos/${pedidoId}/confirmar`);
      toast.success('✅ Pedido confirmado — inventario descontado');
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
      toast.success('❌ Pedido rechazado — cliente notificado');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcesando(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5 bg-red-600 rounded-full px-3 py-1">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span className="text-xs font-bold tracking-wide">EN VIVO</span>
        </div>
        <h1 className="text-lg font-bold">Panel del Live</h1>
        <span className="ml-auto bg-gray-800 rounded-full px-2 py-0.5 text-xs text-gray-400">
          {pedidos.length} pendientes
        </span>
      </div>

      {/* Control TikTok Live */}
      <div className="mb-4 bg-gray-900 rounded-2xl p-3 border border-gray-800">
        {estadoTiktok === 'en_live' ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-green-400 animate-pulse" />
              <span className="text-sm text-green-400 font-semibold">@{liveUsuario}</span>
              <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded-md">EN LIVE</span>
            </div>
            <button
              onClick={detenerVigilancia}
              disabled={conectando}
              className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-xl px-3 py-2 text-xs font-bold transition-colors"
            >
              <WifiOff className="w-3.5 h-3.5" />
              Desactivar
            </button>
          </div>
        ) : estadoTiktok === 'esperando' ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              <span className="text-sm text-yellow-400">Esperando live de</span>
              <span className="text-sm text-white font-semibold">@{liveUsuario}</span>
            </div>
            <button
              onClick={detenerVigilancia}
              disabled={conectando}
              className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-xl px-3 py-2 text-xs font-bold transition-colors"
            >
              <WifiOff className="w-3.5 h-3.5" />
              Cancelar
            </button>
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-500 mb-2">Usuario TikTok a vigilar (se conecta automático cuando empiece el live)</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="usuario sin @"
                value={inputUsuario}
                onChange={e => setInputUsuario(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && iniciarVigilancia()}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500"
              />
              <button
                onClick={iniciarVigilancia}
                disabled={conectando}
                className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 rounded-xl px-3 py-2 text-xs font-bold transition-colors whitespace-nowrap"
              >
                <Wifi className="w-3.5 h-3.5" />
                {conectando ? 'Activando...' : 'Vigilar'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de pedidos */}
      {loading ? (
        <div className="text-center text-gray-500 py-16">Cargando pedidos...</div>
      ) : pedidos.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-gray-400">Esperando pedidos del live...</p>
          <p className="text-gray-600 text-sm mt-1">Los pedidos aparecen aquí en tiempo real</p>
        </div>
      ) : (
        <div className="space-y-3">
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

function TarjetaPedido({ pedido, procesando, onConfirmar, onRechazar }) {
  const tiempoAtras = formatDistanceToNow(pedido.creadoEn, { locale: es, addSuffix: true });

  return (
    <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 active:scale-98 transition-transform">
      {/* Cabecera */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-brand-600 text-white text-xs font-mono font-bold px-2 py-0.5 rounded-lg">
            {pedido.codigoCliente}
          </span>
          {pedido.origen === 'tiktok' && (
            <span className="bg-pink-900 text-pink-300 text-xs px-2 py-0.5 rounded-lg">
              TikTok {pedido.tiktokUser ? `@${pedido.tiktokUser}` : ''}
            </span>
          )}
          {pedido.nombre && (
            <span className="text-gray-400 text-xs">{pedido.nombre}</span>
          )}
        </div>
        <span className="text-gray-500 text-xs">{tiempoAtras}</span>
      </div>

      {/* Detalle de prenda */}
      <div className="mb-4">
        <p className="text-xl font-bold capitalize">{pedido.prenda}</p>
        <div className="flex gap-2 mt-1">
          <span className="bg-gray-700 rounded-lg px-2 py-0.5 text-sm capitalize">{pedido.color}</span>
          <span className="bg-gray-700 rounded-lg px-2 py-0.5 text-sm font-mono">{pedido.talla}</span>
        </div>
        {pedido.textoOriginal && (
          <p className="text-gray-600 text-xs mt-2 italic">"{pedido.textoOriginal}"</p>
        )}
      </div>

      {/* Botones acción */}
      <div className="flex gap-2">
        <button
          onClick={onConfirmar}
          disabled={procesando}
          className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 active:bg-green-700 disabled:opacity-50 rounded-xl py-3 font-bold text-sm transition-colors"
        >
          <Check className="w-4 h-4" />
          CONFIRMAR
        </button>
        <button
          onClick={onRechazar}
          disabled={procesando}
          className="flex-1 flex items-center justify-center gap-2 bg-red-700 hover:bg-red-600 active:bg-red-800 disabled:opacity-50 rounded-xl py-3 font-bold text-sm transition-colors"
        >
          <X className="w-4 h-4" />
          RECHAZAR
        </button>
      </div>
    </div>
  );
}

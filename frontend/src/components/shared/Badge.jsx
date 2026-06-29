export function EstadoBadge({ estado }) {
  const config = {
    disponible: { icon: '🟢', label: 'Disponible', cls: 'bg-green-100 text-green-800' },
    bajo: { icon: '🟡', label: 'Pocas', cls: 'bg-yellow-100 text-yellow-800' },
    agotado: { icon: '🔴', label: 'Agotado', cls: 'bg-red-100 text-red-800' },
  };
  const { icon, label, cls } = config[estado] || config.agotado;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {icon} {label}
    </span>
  );
}

export function PedidoBadge({ estado }) {
  const config = {
    pendiente: { label: 'Pendiente', cls: 'bg-orange-100 text-orange-800' },
    confirmado: { label: 'Confirmado', cls: 'bg-green-100 text-green-800' },
    rechazado: { label: 'Rechazado', cls: 'bg-red-100 text-red-800' },
    entregado: { label: 'Entregado', cls: 'bg-blue-100 text-blue-800' },
  };
  const { label, cls } = config[estado] || { label: estado, cls: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

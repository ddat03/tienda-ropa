import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';

export function usePedidosLive() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'pedidos'),
      where('estado', '==', 'pendiente'),
      orderBy('creadoEn', 'asc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setPedidos(snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        creadoEn: doc.data().creadoEn?.toDate?.() || new Date(),
      })));
      setLoading(false);
    });

    return unsub;
  }, []);

  return { pedidos, loading };
}

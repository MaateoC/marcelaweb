import { NextRequest, NextResponse } from 'next/server';

// Fallback values in case Argly is offline
const FALLBACK_IPC_RATES = [
  { anio: 2023, mes: 1, valor: 6.0 },
  { anio: 2023, mes: 2, valor: 6.6 },
  { anio: 2023, mes: 3, valor: 7.7 },
  { anio: 2023, mes: 4, valor: 8.4 },
  { anio: 2023, mes: 5, valor: 7.8 },
  { anio: 2023, mes: 6, valor: 6.0 },
  { anio: 2023, mes: 7, valor: 6.3 },
  { anio: 2023, mes: 8, valor: 12.4 },
  { anio: 2023, mes: 9, valor: 12.7 },
  { anio: 2023, mes: 10, valor: 8.3 },
  { anio: 2023, mes: 11, valor: 12.8 },
  { anio: 2023, mes: 12, valor: 25.5 },
  { anio: 2024, mes: 1, valor: 20.6 },
  { anio: 2024, mes: 2, valor: 13.2 },
  { anio: 2024, mes: 3, valor: 11.0 },
  { anio: 2024, mes: 4, valor: 8.8 },
  { anio: 2024, mes: 5, valor: 4.2 },
  { anio: 2024, mes: 6, valor: 4.6 },
  { anio: 2024, mes: 7, valor: 4.0 },
  { anio: 2024, mes: 8, valor: 4.2 },
  { anio: 2024, mes: 9, valor: 3.5 },
  { anio: 2024, mes: 10, valor: 2.7 },
  { anio: 2024, mes: 11, valor: 2.4 },
  { anio: 2024, mes: 12, valor: 2.7 },
  { anio: 2025, mes: 1, valor: 2.2 },
  { anio: 2025, mes: 2, valor: 2.4 },
  { anio: 2025, mes: 3, valor: 3.7 },
  { anio: 2025, mes: 4, valor: 2.8 },
  { anio: 2025, mes: 5, valor: 1.5 },
  { anio: 2025, mes: 6, valor: 1.6 },
  { anio: 2025, mes: 7, valor: 1.9 },
  { anio: 2025, mes: 8, valor: 1.9 },
  { anio: 2025, mes: 9, valor: 2.1 },
  { anio: 2025, mes: 10, valor: 2.3 },
  { anio: 2025, mes: 11, valor: 2.5 },
  { anio: 2025, mes: 12, valor: 2.8 },
  { anio: 2026, mes: 1, valor: 2.9 },
  { anio: 2026, mes: 2, valor: 2.9 },
  { anio: 2026, mes: 3, valor: 3.4 },
  { anio: 2026, mes: 4, valor: 2.6 },
  { anio: 2026, mes: 5, valor: 2.1 }
];

const FALLBACK_ICL_VALUES = [
  { fecha: '2023-01-01', valor: 3.12 },
  { fecha: '2023-02-01', valor: 3.29 },
  { fecha: '2023-03-01', valor: 3.45 },
  { fecha: '2023-04-01', valor: 3.64 },
  { fecha: '2023-05-01', valor: 3.86 },
  { fecha: '2023-06-01', valor: 4.21 },
  { fecha: '2023-07-01', valor: 4.65 },
  { fecha: '2023-08-01', valor: 5.15 },
  { fecha: '2023-09-01', valor: 5.75 },
  { fecha: '2023-10-01', valor: 6.35 },
  { fecha: '2023-11-01', valor: 7.05 },
  { fecha: '2023-12-01', valor: 8.01 },
  { fecha: '2024-01-01', valor: 10.51 },
  { fecha: '2024-02-01', valor: 12.35 },
  { fecha: '2024-03-01', valor: 14.52 },
  { fecha: '2024-04-01', valor: 16.85 },
  { fecha: '2024-05-01', valor: 19.22 },
  { fecha: '2024-06-01', valor: 21.55 },
  { fecha: '2024-07-01', valor: 24.12 },
  { fecha: '2024-08-01', valor: 26.85 },
  { fecha: '2024-09-01', valor: 29.54 },
  { fecha: '2024-10-01', valor: 32.41 },
  { fecha: '2024-11-01', valor: 35.25 },
  { fecha: '2024-12-01', valor: 38.10 },
  { fecha: '2025-01-01', valor: 41.05 },
  { fecha: '2025-02-01', valor: 43.92 },
  { fecha: '2025-03-01', valor: 47.01 },
  { fecha: '2025-04-01', valor: 50.22 },
  { fecha: '2025-05-01', valor: 53.35 },
  { fecha: '2025-06-01', valor: 56.55 },
  { fecha: '2025-07-01', valor: 59.82 },
  { fecha: '2025-08-01', valor: 63.15 },
  { fecha: '2025-09-01', valor: 66.52 },
  { fecha: '2025-10-01', valor: 70.01 },
  { fecha: '2025-11-01', valor: 73.65 },
  { fecha: '2025-12-01', valor: 77.32 },
  { fecha: '2026-01-01', valor: 81.15 },
  { fecha: '2026-02-01', valor: 85.05 },
  { fecha: '2026-03-01', valor: 89.12 },
  { fecha: '2026-04-01', valor: 93.25 },
  { fecha: '2026-05-01', valor: 97.42 },
  { fecha: '2026-06-01', valor: 101.55 }
];

const CAC_VARS = [
  // 2023
  { anio: 2023, mes: 1, valor: 6.2 },
  { anio: 2023, mes: 2, valor: 6.8 },
  { anio: 2023, mes: 3, valor: 7.5 },
  { anio: 2023, mes: 4, valor: 8.1 },
  { anio: 2023, mes: 5, valor: 7.2 },
  { anio: 2023, mes: 6, valor: 6.9 },
  { anio: 2023, mes: 7, valor: 7.1 },
  { anio: 2023, mes: 8, valor: 11.2 },
  { anio: 2023, mes: 9, valor: 10.4 },
  { anio: 2023, mes: 10, valor: 9.8 },
  { anio: 2023, mes: 11, valor: 12.5 },
  { anio: 2023, mes: 12, valor: 28.5 },
  // 2024
  { anio: 2024, mes: 1, valor: 18.2 },
  { anio: 2024, mes: 2, valor: 14.5 },
  { anio: 2024, mes: 3, valor: 11.2 },
  { anio: 2024, mes: 4, valor: 8.4 },
  { anio: 2024, mes: 5, valor: 4.8 },
  { anio: 2024, mes: 6, valor: 4.1 },
  { anio: 2024, mes: 7, valor: 3.8 },
  { anio: 2024, mes: 8, valor: 4.2 },
  { anio: 2024, mes: 9, valor: 3.5 },
  { anio: 2024, mes: 10, valor: 2.7 },
  { anio: 2024, mes: 11, valor: 2.5 },
  { anio: 2024, mes: 12, valor: 2.8 },
  // 2025
  { anio: 2025, mes: 1, valor: 2.3 },
  { anio: 2025, mes: 2, valor: 2.5 },
  { anio: 2025, mes: 3, valor: 3.8 },
  { anio: 2025, mes: 4, valor: 2.9 },
  { anio: 2025, mes: 5, valor: 1.6 },
  { anio: 2025, mes: 6, valor: 1.7 },
  { anio: 2025, mes: 7, valor: 2.0 },
  { anio: 2025, mes: 8, valor: 2.0 },
  { anio: 2025, mes: 9, valor: 2.2 },
  { anio: 2025, mes: 10, valor: 2.4 },
  { anio: 2025, mes: 11, valor: 2.6 },
  { anio: 2025, mes: 12, valor: 2.9 },
  // 2026
  { anio: 2026, mes: 1, valor: 3.0 },
  { anio: 2026, mes: 2, valor: 3.0 },
  { anio: 2026, mes: 3, valor: 3.5 },
  { anio: 2026, mes: 4, valor: 2.6 },
  { anio: 2026, mes: 5, valor: 2.1 }
];

function interpolateDailyIcl(monthlyIcl: typeof FALLBACK_ICL_VALUES) {
  const interpolated: { fecha: string; valor: number }[] = [];
  for (let i = 0; i < monthlyIcl.length - 1; i++) {
    const start = monthlyIcl[i];
    const end = monthlyIcl[i + 1];
    const startDate = new Date(start.fecha);
    const endDate = new Date(end.fecha);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    for (let day = 0; day < diffDays; day++) {
      const currentDayDate = new Date(startDate);
      currentDayDate.setDate(startDate.getDate() + day);
      const ratio = day / diffDays;
      const interpolatedVal = start.valor + (end.valor - start.valor) * ratio;
      interpolated.push({
        fecha: currentDayDate.toISOString().split('T')[0],
        valor: parseFloat(interpolatedVal.toFixed(4))
      });
    }
  }
  const last = monthlyIcl[monthlyIcl.length - 1];
  interpolated.push({ fecha: last.fecha, valor: last.valor });
  return interpolated;
}

function computeCumulativeIndex(rates: { anio: number; mes: number; valor: number }[]) {
  const sorted = [...rates].sort((a, b) => {
    if (a.anio !== b.anio) return a.anio - b.anio;
    return a.mes - b.mes;
  });

  const indexSeries: { fecha: string; valor: number }[] = [];
  let currentVal = 100.0;

  for (const item of sorted) {
    currentVal = currentVal * (1 + item.valor / 100);
    const dateStr = `${item.anio}-${String(item.mes).padStart(2, '0')}-01`;
    indexSeries.push({ fecha: dateStr, valor: parseFloat(currentVal.toFixed(4)) });
  }

  return indexSeries;
}

export async function GET() {
  try {
    let iclData: { fecha: string; valor: number }[] = [];
    let ipcData: { fecha: string; valor: number }[] = [];

    // 1. Fetch ICL
    try {
      const res = await fetch('https://api.argly.com.ar/api/icl/history', {
        next: { revalidate: 86400 } // cache for 1 day
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          iclData = json.data.map((item: any) => {
            const parts = item.fecha.split('/');
            const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
            return { fecha: isoDate, valor: Number(item.valor) };
          });
        }
      }
    } catch (e) {
      console.warn('Failed to fetch ICL from Argly API, using fallback:', e);
    }

    if (iclData.length === 0) {
      iclData = interpolateDailyIcl(FALLBACK_ICL_VALUES);
    }

    // 2. Fetch IPC
    let rawIpcRates = FALLBACK_IPC_RATES;
    try {
      const res = await fetch('https://api.argly.com.ar/api/ipc/history', {
        next: { revalidate: 86400 }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          rawIpcRates = json.data.map((item: any) => ({
            anio: Number(item.anio),
            mes: Number(item.mes),
            valor: Number(item.valor)
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to fetch IPC from Argly API, using fallback:', e);
    }

    ipcData = computeCumulativeIndex(rawIpcRates);

    // 3. Fetch latest CAC variation from Argly API dynamically
    let latestCacVarFromApi = null;
    try {
      const res = await fetch('https://api.argly.com.ar/api/construccion', {
        next: { revalidate: 86400 } // cache for 1 day
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.variaciones && typeof json.data.variaciones.general === 'number') {
          latestCacVarFromApi = {
            anio: Number(json.data.anio),
            mes: Number(json.data.mes),
            valor: Number(json.data.variaciones.general)
          };
        }
      }
    } catch (e) {
      console.warn('Failed to fetch latest CAC from Argly API:', e);
    }

    // Merge static CAC rates with latest API rate if it is newer
    const allCacVars = [...CAC_VARS];
    if (latestCacVarFromApi) {
      const alreadyExists = allCacVars.some(
        v => v.anio === latestCacVarFromApi.anio && v.mes === latestCacVarFromApi.mes
      );
      if (!alreadyExists) {
        allCacVars.push(latestCacVarFromApi);
      }
    }

    const cacData = computeCumulativeIndex(allCacVars);

    // Get latest values
    const latestIcl = iclData[iclData.length - 1];
    
    const sortedIpcRates = [...rawIpcRates].sort((a, b) => {
      if (a.anio !== b.anio) return a.anio - b.anio;
      return a.mes - b.mes;
    });
    const latestIpcRate = sortedIpcRates[sortedIpcRates.length - 1];

    const sortedCacVars = [...CAC_VARS].sort((a, b) => {
      if (a.anio !== b.anio) return a.anio - b.anio;
      return a.mes - b.mes;
    });
    const latestCacVar = sortedCacVars[sortedCacVars.length - 1];

    return NextResponse.json({
      icl: iclData,
      ipc: ipcData,
      cac: cacData,
      latest: {
        icl: latestIcl ? { fecha: latestIcl.fecha, valor: latestIcl.valor } : null,
        ipc: latestIpcRate ? { anio: latestIpcRate.anio, mes: latestIpcRate.mes, valor: latestIpcRate.valor } : null,
        cac: latestCacVar ? { anio: latestCacVar.anio, mes: latestCacVar.mes, valor: latestCacVar.valor } : null
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

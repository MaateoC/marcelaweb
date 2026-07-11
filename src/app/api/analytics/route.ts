import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculatePercentageChange } from '@/lib/utils';

const getMonthName = (monthNum: number) => {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[monthNum - 1] || '';
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month') || '2026-07'; // default to July 2026

    const [year, month] = monthParam.split('-').map(Number);

    // Helper to get total of specific transaction type in a given month
    const getMonthTotals = async (y: number, m: number) => {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);

      const txs = await prisma.transaccion.findMany({
        where: {
          fecha: {
            gte: start,
            lt: end,
          },
        },
        include: {
          gastoFijo: true,
        },
      });

      const totals = {
        ingresos: 0,
        gastos: 0,
        ahorros: 0,
        alquileres: 0,
        jubilacion: 0,
        gastosTarjeta: 0,
        gastosVariables: 0,
      };

      txs.forEach((t) => {
        if (t.tipo === 'INGRESO') {
          if (t.categoria === 'Alquileres') {
            totals.alquileres += t.monto;
            totals.ingresos += t.monto;
          } else if (t.categoria === 'Jubilación') {
            totals.jubilacion += t.monto;
            totals.ingresos += t.monto;
          }
        } else if (t.tipo === 'GASTO') {
          totals.gastos += t.monto;

          // Determine if it is a Credit Card expense
          const isTarjeta =
            t.gastoFijo?.tarjetaId !== null ||
            t.medioPago === 'CREDITO' ||
            t.categoria.toLowerCase().includes('tarjeta') ||
            t.categoria.toLowerCase().includes('crédito') ||
            t.descripcion.toLowerCase().includes('tarjeta') ||
            t.descripcion.toLowerCase().includes('visa') ||
            t.descripcion.toLowerCase().includes('mastercard');

          if (isTarjeta) {
            totals.gastosTarjeta += t.monto;
          } else if (t.gastoFijoId === null) {
            totals.gastosVariables += t.monto;
          }
        } else if (t.tipo === 'AHORRO') {
          totals.ahorros += t.monto;
        }
      });

      return totals;
    };

    // Helper to get expense breakdown by category in a given month
    const getMonthExpenseCategories = async (y: number, m: number) => {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);

      const txs = await prisma.transaccion.findMany({
        where: {
          tipo: 'GASTO',
          fecha: {
            gte: start,
            lt: end,
          },
        },
      });

      const categories: Record<string, number> = {};
      txs.forEach((t) => {
        const cat = t.categoria || 'Otros';
        categories[cat] = (categories[cat] || 0) + t.monto;
      });

      return categories;
    };

    // Helper to fetch consecutive historical months (T, T-1, T-2, T-3)
    const getConsecutiveMonthsList = async (y: number, m: number, count: number) => {
      const list = [];
      for (let i = 0; i < count; i++) {
        const targetDate = new Date(y, m - 1 - i, 1);
        const ty = targetDate.getFullYear();
        const tm = targetDate.getMonth() + 1;
        const totals = await getMonthTotals(ty, tm);
        list.push({
          anio: ty,
          mes: tm,
          mesNombre: `${getMonthName(tm)} ${ty}`,
          gastos: totals.gastos,
          gastosTarjeta: totals.gastosTarjeta,
          gastosVariables: totals.gastosVariables,
          ingresos: totals.ingresos,
        });
      }
      return list.reverse(); // Chronological: oldest first
    };

    // Helper to calculate future card projections (T+1, T+2, T+3)
    const getFutureCardProjections = async (y: number, m: number, count: number) => {
      const activeCardFixed = await prisma.gastoFijo.findMany({
        where: {
          estado: 'ACTIVO',
          tarjetaId: { not: null }
        }
      });
      const fixedCardTotal = activeCardFixed.reduce((sum, g) => sum + g.monto, 0);

      const projections = [];
      for (let i = 1; i <= count; i++) {
        const targetDate = new Date(y, m - 1 + i, 1);
        const ty = targetDate.getFullYear();
        const tm = targetDate.getMonth() + 1;

        const start = new Date(ty, tm - 1, 1);
        const end = new Date(ty, tm, 1);

        const futureTxs = await prisma.transaccion.findMany({
          where: {
            tipo: 'GASTO',
            medioPago: 'CREDITO',
            fecha: {
              gte: start,
              lt: end
            }
          }
        });
        
        const txsCardTotal = futureTxs.reduce((sum, t) => sum + t.monto, 0);
        const totalProjected = txsCardTotal + fixedCardTotal;

        projections.push({
          anio: ty,
          mes: tm,
          mesNombre: `${getMonthName(tm)} ${ty}`,
          cuotasMonto: txsCardTotal,
          fijosMonto: fixedCardTotal,
          total: totalProjected
        });
      }
      return projections;
    };

    // Calculate dates for comparison
    const momDate = new Date(year, month - 2, 1);
    const qoqDate = new Date(year, month - 4, 1);
    const hohDate = new Date(year, month - 7, 1);
    const yoyDate = new Date(year, month - 13, 1);

    // Fetch consecutive months list (4 months total: T-3, T-2, T-1, T)
    const consecutiveList = await getConsecutiveMonthsList(year, month, 4);

    // Calculate consecutive variations
    const consecutiveMonths = consecutiveList.map((item, idx) => {
      let variacionNominal = 0;
      let variacionPorcentual = 0;
      if (idx > 0) {
        const prev = consecutiveList[idx - 1];
        variacionNominal = item.gastos - prev.gastos;
        variacionPorcentual = calculatePercentageChange(item.gastos, prev.gastos);
      }
      return {
        ...item,
        variacionNominal,
        variacionPorcentual,
      };
    });

    // Fetch future credit card projections
    const cardProjections = await getFutureCardProjections(year, month, 3);

    // Fetch totals and expense categories for all relevant months
    const [
      current, mom, qoq, hoh, yoy,
      currentCats, momCats, qoqCats, hohCats, yoyCats
    ] = await Promise.all([
      getMonthTotals(year, month),
      getMonthTotals(momDate.getFullYear(), momDate.getMonth() + 1),
      getMonthTotals(qoqDate.getFullYear(), qoqDate.getMonth() + 1),
      getMonthTotals(hohDate.getFullYear(), hohDate.getMonth() + 1),
      getMonthTotals(yoyDate.getFullYear(), yoyDate.getMonth() + 1),

      getMonthExpenseCategories(year, month),
      getMonthExpenseCategories(momDate.getFullYear(), momDate.getMonth() + 1),
      getMonthExpenseCategories(qoqDate.getFullYear(), qoqDate.getMonth() + 1),
      getMonthExpenseCategories(hohDate.getFullYear(), hohDate.getMonth() + 1),
      getMonthExpenseCategories(yoyDate.getFullYear(), yoyDate.getMonth() + 1),
    ]);

    // Helper to calculate comparison for expense categories
    const getExpenseComparison = (curr: Record<string, number>, prev: Record<string, number>) => {
      const allKeys = Array.from(new Set([...Object.keys(curr), ...Object.keys(prev)]));
      return allKeys.map((cat) => {
        const actual = curr[cat] || 0;
        const anterior = prev[cat] || 0;
        return {
          categoria: cat,
          actual,
          anterior,
          variacionNominal: actual - anterior,
          variacionPorcentual: calculatePercentageChange(actual, anterior),
        };
      }).sort((a, b) => b.actual - a.actual);
    };

    // Calculate metrics
    const response = {
      month: monthParam,
      current,
      consecutiveMonths, // Sequential list with variations
      cardProjections,   // Future card projections list
      comparisons: {
        mom: {
          period: 'Mensual (MoM)',
          ingresos: {
            actual: current.ingresos,
            anterior: mom.ingresos,
            variacionPorcentual: calculatePercentageChange(current.ingresos, mom.ingresos),
          },
          gastos: {
            actual: current.gastos,
            anterior: mom.gastos,
            variacionPorcentual: calculatePercentageChange(current.gastos, mom.gastos),
          },
          ahorros: {
            actual: current.ahorros,
            anterior: mom.ahorros,
            variacionPorcentual: calculatePercentageChange(current.ahorros, mom.ahorros),
          },
          alquileres: {
            actual: current.alquileres,
            anterior: mom.alquileres,
            variacionPorcentual: calculatePercentageChange(current.alquileres, mom.alquileres),
          },
          jubilacion: {
            actual: current.jubilacion,
            anterior: mom.jubilacion,
            variacionPorcentual: calculatePercentageChange(current.jubilacion, mom.jubilacion),
          },
          categoriasGastos: getExpenseComparison(currentCats, momCats),
        },
        qoq: {
          period: 'Trimestral (QoQ)',
          ingresos: {
            actual: current.ingresos,
            anterior: qoq.ingresos,
            variacionPorcentual: calculatePercentageChange(current.ingresos, qoq.ingresos),
          },
          gastos: {
            actual: current.gastos,
            anterior: qoq.gastos,
            variacionPorcentual: calculatePercentageChange(current.gastos, qoq.gastos),
          },
          ahorros: {
            actual: current.ahorros,
            anterior: qoq.ahorros,
            variacionPorcentual: calculatePercentageChange(current.ahorros, qoq.ahorros),
          },
          alquileres: {
            actual: current.alquileres,
            anterior: qoq.alquileres,
            variacionPorcentual: calculatePercentageChange(current.alquileres, qoq.alquileres),
          },
          jubilacion: {
            actual: current.jubilacion,
            anterior: qoq.jubilacion,
            variacionPorcentual: calculatePercentageChange(current.jubilacion, qoq.jubilacion),
          },
          categoriasGastos: getExpenseComparison(currentCats, qoqCats),
        },
        hoh: {
          period: 'Semestral (HoH)',
          ingresos: {
            actual: current.ingresos,
            anterior: hoh.ingresos,
            variacionPorcentual: calculatePercentageChange(current.ingresos, hoh.ingresos),
          },
          gastos: {
            actual: current.gastos,
            anterior: hoh.gastos,
            variacionPorcentual: calculatePercentageChange(current.gastos, hoh.gastos),
          },
          ahorros: {
            actual: current.ahorros,
            anterior: hoh.ahorros,
            variacionPorcentual: calculatePercentageChange(current.ahorros, hoh.ahorros),
          },
          alquileres: {
            actual: current.alquileres,
            anterior: hoh.alquileres,
            variacionPorcentual: calculatePercentageChange(current.alquileres, hoh.alquileres),
          },
          jubilacion: {
            actual: current.jubilacion,
            anterior: hoh.jubilacion,
            variacionPorcentual: calculatePercentageChange(current.jubilacion, hoh.jubilacion),
          },
          categoriasGastos: getExpenseComparison(currentCats, hohCats),
        },
        yoy: {
          period: 'Anual (YoY)',
          ingresos: {
            actual: current.ingresos,
            anterior: yoy.ingresos,
            variacionPorcentual: calculatePercentageChange(current.ingresos, yoy.ingresos),
          },
          gastos: {
            actual: current.gastos,
            anterior: yoy.gastos,
            variacionPorcentual: calculatePercentageChange(current.gastos, yoy.gastos),
          },
          ahorros: {
            actual: current.ahorros,
            anterior: yoy.ahorros,
            variacionPorcentual: calculatePercentageChange(current.ahorros, yoy.ahorros),
          },
          alquileres: {
            actual: current.alquileres,
            anterior: yoy.alquileres,
            variacionPorcentual: calculatePercentageChange(current.alquileres, yoy.alquileres),
          },
          jubilacion: {
            actual: current.jubilacion,
            anterior: yoy.jubilacion,
            variacionPorcentual: calculatePercentageChange(current.jubilacion, yoy.jubilacion),
          },
          categoriasGastos: getExpenseComparison(currentCats, yoyCats),
        },
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error generating analytics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

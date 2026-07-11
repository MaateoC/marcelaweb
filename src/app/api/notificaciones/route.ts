import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const currentMonth = '2026-07';
    const [year, m] = currentMonth.split('-').map(Number);
    const startOfMonth = new Date(year, m - 1, 1);
    const endOfMonth = new Date(year, m, 1);
    const hoy = new Date(2026, 6, 10); // System baseline date: July 10, 2026

    const notifications: any[] = [];

    // 1. Fetch properties & contracts
    const properties = await prisma.propiedad.findMany({
      include: {
        contratos: {
          include: {
            pagos: true,
          },
        },
      },
    });

    // 2. Fetch transactions for the current month
    const transactions = await prisma.transaccion.findMany({
      where: {
        fecha: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
    });

    // 3. Fetch taxes
    const taxes = await prisma.impuestoConfigurado.findMany();

    // 4. Fetch fixed expenses
    const fixedExpenses = await prisma.gastoFijo.findMany({
      include: {
        tarjeta: true,
      },
    });

    // 5. Fetch cards
    const cards = await prisma.tarjetaAsociada.findMany();

    // --- PROCESS NOTIFICATIONS ---

    // A. Pending Rent Payments & Adjustments
    properties.forEach((p) => {
      p.contratos.forEach((c) => {
        // Unpaid rent
        const monthlyPayment = c.pagos.find((pay) => pay.mesReferencia === currentMonth);
        if (monthlyPayment && monthlyPayment.estado !== 'PAGADO') {
          const startDate = new Date(c.fechaInicio);
          const dueDay = Math.min(Math.max(startDate.getUTCDate(), 1), 28);
          notifications.push({
            id: `rent-${monthlyPayment.id}`,
            tipo: 'ALQUILER',
            titulo: 'Cobro de Alquiler Pendiente',
            detalle: `Inquilino: ${c.inquilinoNombre} (${p.nombre}) • Monto: $${c.montoActual.toLocaleString('es-AR')}`,
            dia: dueDay,
            link: `/propiedades/${p.id}`,
          });
        }

        // Pending Rent Adjustment
        const inicio = new Date(c.fechaInicio);
        const monthsElapsed = (hoy.getFullYear() - inicio.getFullYear()) * 12 + (hoy.getMonth() - inicio.getMonth());
        if (monthsElapsed > 0 && monthsElapsed % c.frecuenciaActualizacion === 0) {
          let alreadyUpdated = false;
          if (c.ultimaActualizacion) {
            const ult = new Date(c.ultimaActualizacion);
            if (ult.getFullYear() === hoy.getFullYear() && ult.getMonth() === hoy.getMonth()) {
              alreadyUpdated = true;
            }
          }

          if (!alreadyUpdated) {
            notifications.push({
              id: `adjust-${c.id}`,
              tipo: 'AJUSTE',
              titulo: 'Actualización Pendiente',
              detalle: `Contrato de ${c.inquilinoNombre} (${p.nombre}) requiere ajuste por ${c.indiceActualizacion}`,
              dia: 1, // Start of month task
              link: `/propiedades`,
            });
          }
        }
      });
    });

    // B. Pending Taxes
    taxes.forEach((tax) => {
      const subcat = tax.subcategoria || tax.nombre;
      const isPaid = transactions.some(
        (t) => t.tipo === 'GASTO' && t.subcategoria === subcat
      );
      if (!isPaid) {
        notifications.push({
          id: `tax-${tax.id}`,
          tipo: 'IMPUESTO',
          titulo: 'Pago de Impuesto / Servicio',
          detalle: `${tax.nombre} • Sugerido: $${tax.montoSugerido.toLocaleString('es-AR')}`,
          dia: tax.diaVencimiento,
          link: '/finanzas/impuestos',
        });
      }
    });

    // C. Pending Fixed Subscriptions
    fixedExpenses.forEach((gasto) => {
      if (gasto.estado === 'ACTIVO') {
        const isPaid = transactions.some(
          (t) => t.tipo === 'GASTO' && t.gastoFijoId === gasto.id
        );
        if (!isPaid) {
          notifications.push({
            id: `fixed-${gasto.id}`,
            tipo: 'SUSCRIPCION',
            titulo: 'Débito de Suscripción',
            detalle: `${gasto.nombre} • Monto: $${gasto.monto.toLocaleString('es-AR')}`,
            dia: gasto.diaPago,
            link: '/finanzas/gastos-fijos',
          });
        }
      }
    });

    // D. Credit Card Closures (cierre en los próximos 3 días)
    const currentDay = hoy.getDate();
    cards.forEach((card) => {
      // If closure is in current month and close day is between currentDay and currentDay + 3
      const daysUntilClosure = card.diaCierre - currentDay;
      if (daysUntilClosure >= 0 && daysUntilClosure <= 3) {
        notifications.push({
          id: `card-close-${card.id}`,
          tipo: 'TARJETA',
          titulo: 'Cierre de Tarjeta Próximo',
          detalle: `${card.nombre} cierra en ${daysUntilClosure === 0 ? 'hoy' : `${daysUntilClosure} días`} (Día ${card.diaCierre})`,
          dia: card.diaCierre,
          link: '/configuracion/tarjetas',
        });
      }
    });

    // Sort notifications by dia (day of the month)
    notifications.sort((a, b) => a.dia - b.dia);

    return NextResponse.json(notifications);
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

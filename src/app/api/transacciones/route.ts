import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

async function checkAndTriggerFixedExpenses() {
  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed
    const currentDay = today.getDate();

    // Find all active fixed expenses
    const activeFixedExpenses = await prisma.gastoFijo.findMany({
      where: { estado: 'ACTIVO' }
    });

    for (const gasto of activeFixedExpenses) {
      // Determine actual payment day (e.g. handle Feb 28/29 or April 30)
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const actualDay = Math.min(gasto.diaPago, lastDayOfMonth);

      // If current day has reached or passed the payment day
      if (currentDay >= actualDay) {
        const startOfMonth = new Date(currentYear, currentMonth, 1);
        const endOfMonth = new Date(currentYear, currentMonth + 1, 1);

        // Check if transaction has already been logged for this month
        const existingTx = await prisma.transaccion.findFirst({
          where: {
            gastoFijoId: gasto.id,
            fecha: {
              gte: startOfMonth,
              lt: endOfMonth
            }
          }
        });

        if (!existingTx) {
          // Log general transaction
          await prisma.transaccion.create({
            data: {
              tipo: 'GASTO',
              monto: gasto.monto,
              descripcion: `[Suscripción] ${gasto.nombre}`,
              fecha: new Date(currentYear, currentMonth, actualDay),
              categoria: gasto.categoria,
              subcategoria: 'Gastos Fijos',
              gastoFijoId: gasto.id,
              medioPago: gasto.tarjetaId ? 'CREDITO' : 'DEBITO',
              tarjetaId: gasto.tarjetaId || null,
              cuotasTotal: 1,
              cuotaNumero: 1,
              recargo: 0
            }
          });
        }
      }
    }
  } catch (err) {
    console.error('Error running checkAndTriggerFixedExpenses:', err);
  }
}

export async function GET(req: NextRequest) {
  try {
    await checkAndTriggerFixedExpenses();

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get('tipo');
    const categoria = searchParams.get('categoria');
    const month = searchParams.get('month'); // YYYY-MM
    const propiedadId = searchParams.get('propiedadId');

    let where: any = {};

    if (tipo) where.tipo = tipo;
    if (categoria) where.categoria = categoria;
    if (propiedadId) where.propiedadId = propiedadId;

    if (month) {
      const [year, m] = month.split('-').map(Number);
      const startDate = new Date(year, m - 1, 1);
      const endDate = new Date(year, m, 1);
      where.fecha = {
        gte: startDate,
        lt: endDate,
      };
    }

    const transactions = await prisma.transaccion.findMany({
      where,
      orderBy: {
        fecha: 'desc',
      },
      include: {
        propiedad: true,
        tarjeta: true,
      },
    });

    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      tipo, 
      monto, 
      descripcion, 
      fecha, 
      categoria, 
      subcategoria, 
      propiedadId, 
      pagoId, 
      gastoFijoId,
      medioPago,
      tarjetaId,
      cuotasTotal,
      recargo
    } = body;

    if (!tipo || !monto || !descripcion || !fecha || !categoria) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const baseMonto = Number(monto);
    const totalCuotas = Number(cuotasTotal || 1);
    const surchargePct = Number(recargo || 0);
    const isCreditCard = tipo === 'GASTO' && medioPago === 'CREDITO';

    if (isCreditCard && totalCuotas > 1) {
      // Calculate total amount with surcharge
      const totalAmountWithSurcharge = baseMonto * (1 + surchargePct / 100);
      const installmentAmount = Math.round((totalAmountWithSurcharge / totalCuotas) * 100) / 100;
      
      const createdTxList: any[] = [];
      const baseDate = new Date(fecha);

      const result = await prisma.$transaction(async (tx) => {
        for (let i = 0; i < totalCuotas; i++) {
          const currentTxDate = new Date(baseDate);
          currentTxDate.setMonth(baseDate.getMonth() + i);

          const cuotaNo = i + 1;
          const formattedDesc = `[Cuota ${cuotaNo}/${totalCuotas}] ${descripcion}`;

          const newTx = await tx.transaccion.create({
            data: {
              tipo,
              monto: installmentAmount,
              descripcion: formattedDesc,
              fecha: currentTxDate,
              categoria,
              subcategoria: subcategoria || null,
              propiedadId: propiedadId || null,
              pagoId: pagoId || null,
              gastoFijoId: gastoFijoId || null,
              medioPago: 'CREDITO',
              tarjetaId: tarjetaId || null,
              cuotasTotal: totalCuotas,
              cuotaNumero: cuotaNo,
              recargo: surchargePct
            }
          });
          createdTxList.push(newTx);
        }
        return createdTxList[0];
      });

      return NextResponse.json(result);
    } else {
      const finalMonto = isCreditCard ? baseMonto * (1 + surchargePct / 100) : baseMonto;
      
      const transaction = await prisma.$transaction(async (tx) => {
        const newTx = await tx.transaccion.create({
          data: {
            tipo,
            monto: finalMonto,
            descripcion,
            fecha: new Date(fecha),
            categoria,
            subcategoria: subcategoria || null,
            propiedadId: propiedadId || null,
            pagoId: pagoId || null,
            gastoFijoId: gastoFijoId || null,
            medioPago: medioPago || null,
            tarjetaId: (isCreditCard && tarjetaId) ? tarjetaId : null,
            cuotasTotal: isCreditCard ? 1 : null,
            cuotaNumero: isCreditCard ? 1 : null,
            recargo: isCreditCard ? surchargePct : null
          },
        });

        if (pagoId) {
          await tx.pagoAlquiler.update({
            where: { id: pagoId },
            data: {
              estado: 'PAGADO',
              fechaPago: new Date(fecha),
              montoCobrado: finalMonto,
            },
          });
        }

        return newTx;
      });

      return NextResponse.json(transaction);
    }
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

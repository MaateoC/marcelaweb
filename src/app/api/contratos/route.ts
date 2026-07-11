import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMonthString, getRelativeMonths } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      propiedadId,
      inquilinoNombre,
      fechaInicio,
      fechaFin,
      montoInicial,
      indiceActualizacion,
      frecuenciaActualizacion,
      documentoPath,
    } = body;

    if (
      !propiedadId ||
      !inquilinoNombre ||
      !fechaInicio ||
      !fechaFin ||
      !montoInicial ||
      !indiceActualizacion ||
      !frecuenciaActualizacion
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const start = new Date(fechaInicio);
    const end = new Date(fechaFin);

    const contract = await prisma.$transaction(async (tx) => {
      // 1. Create contract
      const newContract = await tx.contrato.create({
        data: {
          propiedadId,
          inquilinoNombre,
          fechaInicio: start,
          fechaFin: end,
          montoInicial: Number(montoInicial),
          montoActual: Number(montoInicial),
          indiceActualizacion,
          frecuenciaActualizacion: Number(frecuenciaActualizacion),
          documentoPath: documentoPath || null,
        },
      });

      // 2. Pre-generate PagoAlquiler entries for each month of the lease
      const pagosData = [];
      let current = new Date(start);
      while (current <= end) {
        pagosData.push({
          contratoId: newContract.id,
          mesReferencia: getMonthString(current),
          montoCobrado: 0,
          estado: 'IMPAGO',
        });
        // Move to next month
        current.setMonth(current.getMonth() + 1);
      }

      if (pagosData.length > 0) {
        await tx.pagoAlquiler.createMany({
          data: pagosData,
        });
      }

      return newContract;
    });

    return NextResponse.json(contract);
  } catch (error: any) {
    console.error('Error creating contract:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT is used to update the lease value or contract document
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { contractId, newMonto, updateDate, documentoPath } = body;

    if (!contractId) {
      return NextResponse.json({ error: 'Missing contractId' }, { status: 400 });
    }

    const existingContract = await prisma.contrato.findUnique({
      where: { id: contractId },
    });

    if (!existingContract) {
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 });
    }

    // Case 1: Only updating documentoPath
    if (documentoPath !== undefined && newMonto === undefined) {
      const updated = await prisma.contrato.update({
        where: { id: contractId },
        data: {
          documentoPath,
        },
      });
      return NextResponse.json(updated);
    }

    // Case 2: Standard rental price update (Index adjustment)
    if (!newMonto || !updateDate) {
      return NextResponse.json({ error: 'Missing required fields for price update' }, { status: 400 });
    }

    const montoPrevio = existingContract.montoActual;
    const montoNuevo = Number(newMonto);
    const pct = montoPrevio > 0 ? ((montoNuevo - montoPrevio) / montoPrevio) * 100 : 0;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.contrato.update({
        where: { id: contractId },
        data: {
          montoActual: montoNuevo,
          ultimaActualizacion: new Date(updateDate),
          documentoPath: documentoPath !== undefined ? documentoPath : existingContract.documentoPath,
        },
      });

      await tx.historialAjuste.create({
        data: {
          contratoId: contractId,
          fecha: new Date(updateDate),
          montoPrevio,
          montoNuevo,
          porcentaje: parseFloat(pct.toFixed(2)),
        },
      });

      return updated;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error updating contract:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

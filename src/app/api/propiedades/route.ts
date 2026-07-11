import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMonthString } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get('tipo'); // DEPARTAMENTO | LOCAL

    let where: any = {};
    if (tipo) where.tipo = tipo;

    const properties = await prisma.propiedad.findMany({
      where,
      include: {
        contratos: {
          include: {
            pagos: {
              orderBy: {
                mesReferencia: 'desc',
              },
            },
            historialAjustes: {
              orderBy: {
                fecha: 'desc',
              },
            },
          },
        },
        gastos: {
          orderBy: {
            fecha: 'desc',
          },
        },
      },
      orderBy: {
        nombre: 'asc',
      },
    });

    return NextResponse.json(properties);
  } catch (error: any) {
    console.error('Error fetching properties:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, tipo, direccion, estado, contrato } = body;

    if (!nombre || !tipo || !direccion) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const property = await prisma.$transaction(async (tx) => {
      const newProperty = await tx.propiedad.create({
        data: {
          nombre,
          tipo,
          direccion,
          estado: estado || 'ACTIVO',
        },
      });

      if (contrato) {
        const {
          inquilinoNombre,
          fechaInicio,
          fechaFin,
          montoInicial,
          indiceActualizacion,
          frecuenciaActualizacion,
          documentoPath,
        } = contrato;

        if (
          !inquilinoNombre ||
          !fechaInicio ||
          !fechaFin ||
          !montoInicial ||
          !indiceActualizacion ||
          !frecuenciaActualizacion
        ) {
          throw new Error('Faltan campos requeridos del contrato');
        }

        const start = new Date(fechaInicio);
        const end = new Date(fechaFin);

        const newContract = await tx.contrato.create({
          data: {
            propiedadId: newProperty.id,
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

        // Pre-generate PagoAlquiler entries for each month of the lease
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
      }

      return newProperty;
    });

    return NextResponse.json(property);
  } catch (error: any) {
    console.error('Error creating property/contract:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

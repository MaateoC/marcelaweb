import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const gastosFijos = await prisma.gastoFijo.findMany({
      include: {
        tarjeta: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    });
    return NextResponse.json(gastosFijos);
  } catch (error: any) {
    console.error('Error fetching fixed expenses:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, monto, diaPago, categoria, tarjetaId } = body;

    if (!nombre || monto === undefined || diaPago === undefined || !categoria) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const gastoFijo = await prisma.gastoFijo.create({
      data: {
        nombre,
        monto: Number(monto),
        diaPago: Number(diaPago),
        categoria,
        tarjetaId: tarjetaId || null,
        estado: 'ACTIVO',
      },
      include: {
        tarjeta: true,
      },
    });

    return NextResponse.json(gastoFijo);
  } catch (error: any) {
    console.error('Error creating fixed expense:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, nombre, monto, diaPago, categoria, tarjetaId, estado } = body;

    if (!id) {
      return NextResponse.json({ error: 'Falta el id del gasto fijo' }, { status: 400 });
    }

    const updateData: any = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (monto !== undefined) updateData.monto = Number(monto);
    if (diaPago !== undefined) updateData.diaPago = Number(diaPago);
    if (categoria !== undefined) updateData.categoria = categoria;
    if (tarjetaId !== undefined) updateData.tarjetaId = tarjetaId || null;
    if (estado !== undefined) updateData.estado = estado;

    const gastoFijo = await prisma.gastoFijo.update({
      where: { id },
      data: updateData,
      include: {
        tarjeta: true,
      },
    });

    return NextResponse.json(gastoFijo);
  } catch (error: any) {
    console.error('Error updating fixed expense:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Falta el id del gasto fijo' }, { status: 400 });
    }

    await prisma.gastoFijo.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting fixed expense:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

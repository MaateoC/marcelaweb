import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const tarjetas = await prisma.tarjetaAsociada.findMany({
      orderBy: {
        nombre: 'asc',
      },
    });
    return NextResponse.json(tarjetas);
  } catch (error: any) {
    console.error('Error fetching cards:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, diaCierre, diaVencimiento } = body;

    if (!nombre || diaCierre === undefined || diaVencimiento === undefined) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const tarjeta = await prisma.tarjetaAsociada.create({
      data: {
        nombre,
        diaCierre: Number(diaCierre),
        diaVencimiento: Number(diaVencimiento),
      },
    });

    return NextResponse.json(tarjeta);
  } catch (error: any) {
    console.error('Error creating card:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Falta el id de la tarjeta' }, { status: 400 });
    }

    await prisma.tarjetaAsociada.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting card:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

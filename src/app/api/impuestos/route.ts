import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const taxes = await prisma.impuestoConfigurado.findMany({
      orderBy: { diaVencimiento: 'asc' },
    });
    return NextResponse.json(taxes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, nombre, descripcion, montoSugerido, diaVencimiento, categoria, subcategoria } = body;

    if (!nombre || !montoSugerido || !diaVencimiento || !categoria) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const parsedDia = Number(diaVencimiento);
    if (isNaN(parsedDia) || parsedDia < 1 || parsedDia > 31) {
      return NextResponse.json({ error: 'Día de vencimiento inválido' }, { status: 400 });
    }

    const parsedMonto = Number(montoSugerido);
    if (isNaN(parsedMonto) || parsedMonto < 0) {
      return NextResponse.json({ error: 'Monto sugerido inválido' }, { status: 400 });
    }

    const data = {
      nombre,
      descripcion: descripcion || '',
      montoSugerido: parsedMonto,
      diaVencimiento: parsedDia,
      categoria,
      subcategoria: subcategoria || nombre,
    };

    if (id) {
      const updated = await prisma.impuestoConfigurado.update({
        where: { id },
        data,
      });
      return NextResponse.json(updated);
    } else {
      const created = await prisma.impuestoConfigurado.create({
        data,
      });
      return NextResponse.json(created, { status: 201 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await prisma.impuestoConfigurado.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

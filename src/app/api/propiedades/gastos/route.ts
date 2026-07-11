import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { propiedadId, fecha, descripcion, monto, tipo } = body;

    if (!propiedadId || !fecha || !descripcion || !monto || !tipo) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the property expense log
      const gasto = await tx.gastoPropiedad.create({
        data: {
          propiedadId,
          fecha: new Date(fecha),
          descripcion,
          monto: Number(monto),
          tipo,
        },
      });

      // 2. Automatically create a general cash flow transaction so it deducts from finances
      await tx.transaccion.create({
        data: {
          tipo: 'GASTO',
          monto: Number(monto),
          descripcion: `[${tipo === 'MANTENIMIENTO' ? 'Mantenimiento' : 'Expensa Extraordinaria'}] ${descripcion}`,
          fecha: new Date(fecha),
          categoria: tipo === 'MANTENIMIENTO' ? 'Mantenimiento' : 'Servicios e Impuestos',
          subcategoria: 'Propiedades',
          propiedadId,
        },
      });

      return gasto;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error logging property expense:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

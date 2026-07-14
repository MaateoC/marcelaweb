import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://dolarapi.com/v1/dolares', {
      next: { revalidate: 60 }, // Cache response for 1 minute
    });

    if (!res.ok) {
      throw new Error('Error al obtener cotizaciones de DolarApi');
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching dollar rates:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener cotizaciones' },
      { status: 500 }
    );
  }
}

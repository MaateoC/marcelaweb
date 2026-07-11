import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public';
const pool = new Pool({ connectionString });
const pgAdapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter: pgAdapter });

async function main() {
  console.log('Seeding database with Rosario finance and rental mock data...');

  // 1. Clean existing data
  await prisma.transaccion.deleteMany({});
  await prisma.pagoAlquiler.deleteMany({});
  await prisma.contrato.deleteMany({});
  await prisma.propiedad.deleteMany({});
  await prisma.impuestoConfigurado.deleteMany({});

  // 2. Create properties (Rosario context)
  const deptoPellegrini = await prisma.propiedad.create({
    data: {
      nombre: 'Depto Pellegrini 1400',
      tipo: 'DEPARTAMENTO',
      direccion: 'Av. Pellegrini 1420, Piso 4, Rosario',
      estado: 'ACTIVO',
    },
  });

  const localSanMartin = await prisma.propiedad.create({
    data: {
      nombre: 'Local San Martín Galería',
      tipo: 'LOCAL',
      direccion: 'San Martín 800, Local 12, Rosario',
      estado: 'ACTIVO',
    },
  });

  console.log('Properties created.');

  // 3. Create contracts
  // Apartment contract updated by ICL every 6 months
  const contratoDepto = await prisma.contrato.create({
    data: {
      propiedadId: deptoPellegrini.id,
      inquilinoNombre: 'Marcela Rodríguez',
      fechaInicio: new Date('2025-01-01T00:00:00Z'),
      fechaFin: new Date('2026-12-31T00:00:00Z'),
      montoInicial: 250000,
      montoActual: 320000,
      indiceActualizacion: 'ICL',
      frecuenciaActualizacion: 6,
      ultimaActualizacion: new Date('2025-07-01T00:00:00Z'),
    },
  });

  // Commercial local contract updated by CAC (or IPC) every 3 months
  const contratoLocal = await prisma.contrato.create({
    data: {
      propiedadId: localSanMartin.id,
      inquilinoNombre: 'Ropa Rosario SRL',
      fechaInicio: new Date('2025-03-01T00:00:00Z'),
      fechaFin: new Date('2027-02-28T00:00:00Z'),
      montoInicial: 450000,
      montoActual: 580000,
      indiceActualizacion: 'CAC',
      frecuenciaActualizacion: 3,
      ultimaActualizacion: new Date('2025-12-01T00:00:00Z'),
    },
  });

  console.log('Contracts created.');

  // 4. Create payments
  const pagos = [
    {
      contratoId: contratoDepto.id,
      mesReferencia: '2026-05',
      montoCobrado: 320000,
      fechaPago: new Date('2026-05-05T10:00:00Z'),
      estado: 'PAGADO',
    },
    {
      contratoId: contratoDepto.id,
      mesReferencia: '2026-06',
      montoCobrado: 320000,
      fechaPago: new Date('2026-06-04T11:30:00Z'),
      estado: 'PAGADO',
    },
    {
      contratoId: contratoDepto.id,
      mesReferencia: '2026-07',
      montoCobrado: 0,
      fechaPago: null,
      estado: 'IMPAGO',
    },
    {
      contratoId: contratoLocal.id,
      mesReferencia: '2026-05',
      montoCobrado: 580000,
      fechaPago: new Date('2026-05-10T15:00:00Z'),
      estado: 'PAGADO',
    },
    {
      contratoId: contratoLocal.id,
      mesReferencia: '2026-06',
      montoCobrado: 580000,
      fechaPago: new Date('2026-06-08T16:20:00Z'),
      estado: 'PAGADO',
    },
    {
      contratoId: contratoLocal.id,
      mesReferencia: '2026-07',
      montoCobrado: 580000,
      fechaPago: new Date('2026-07-05T09:00:00Z'),
      estado: 'PAGADO',
    },
  ];

  for (const pago of pagos) {
    const createdPago = await prisma.pagoAlquiler.create({
      data: pago,
    });

    // Create corresponding transaction if it was paid
    if (createdPago.estado === 'PAGADO') {
      const isDepto = createdPago.contratoId === contratoDepto.id;
      await prisma.transaccion.create({
        data: {
          tipo: 'INGRESO',
          monto: createdPago.montoCobrado,
          descripcion: `Cobro Alquiler - ${isDepto ? 'Depto Pellegrini' : 'Local San Martín'} - Mes ${createdPago.mesReferencia}`,
          fecha: createdPago.fechaPago!,
          categoria: 'Alquileres',
          subcategoria: isDepto ? 'Departamentos' : 'Locales Comerciales',
          propiedadId: isDepto ? deptoPellegrini.id : localSanMartin.id,
          pagoId: createdPago.id,
        },
      });
    }
  }

  console.log('Payments and corresponding rent transactions created.');

  // 5. General Personal Transactions (Rosario utilities, taxes, salaries, and savings)
  const personalTransactions = [
    // Salaries / Principal Income
    {
      tipo: 'INGRESO',
      monto: 850000,
      descripcion: 'Sueldo mensual Marcela',
      fecha: new Date('2026-05-01T09:00:00Z'),
      categoria: 'Sueldo',
      subcategoria: 'Relación de dependencia',
    },
    {
      tipo: 'INGRESO',
      monto: 850000,
      descripcion: 'Sueldo mensual Marcela',
      fecha: new Date('2026-06-01T09:00:00Z'),
      categoria: 'Sueldo',
      subcategoria: 'Relación de dependencia',
    },
    {
      tipo: 'INGRESO',
      monto: 900000,
      descripcion: 'Sueldo mensual Marcela (Aumento)',
      fecha: new Date('2026-07-01T09:00:00Z'),
      categoria: 'Sueldo',
      subcategoria: 'Relación de dependencia',
    },

    // Rosario Local Services / Taxes (May 2026)
    {
      tipo: 'GASTO',
      monto: 8500,
      descripcion: 'TGI Rosario - Pellegrini (Tasa General de Inmuebles)',
      fecha: new Date('2026-05-15T12:00:00Z'),
      categoria: 'Impuestos Locales',
      subcategoria: 'TGI Rosario',
      propiedadId: deptoPellegrini.id,
    },
    {
      tipo: 'GASTO',
      monto: 12500,
      descripcion: 'API Santa Fe Inmobiliario - Pellegrini',
      fecha: new Date('2026-05-16T12:00:00Z'),
      categoria: 'Impuestos Locales',
      subcategoria: 'API Santa Fe',
      propiedadId: deptoPellegrini.id,
    },
    {
      tipo: 'GASTO',
      monto: 18900,
      descripcion: 'Factura EPE (Energía Provincial Santa Fe)',
      fecha: new Date('2026-05-20T10:00:00Z'),
      categoria: 'Servicios',
      subcategoria: 'EPE Luz',
    },
    {
      tipo: 'GASTO',
      monto: 9500,
      descripcion: 'Factura ASSA (Aguas Santafesinas)',
      fecha: new Date('2026-05-22T10:00:00Z'),
      categoria: 'Servicios',
      subcategoria: 'ASSA Agua',
    },
    {
      tipo: 'GASTO',
      monto: 6200,
      descripcion: 'Factura Litoral Gas',
      fecha: new Date('2026-05-25T11:00:00Z'),
      categoria: 'Servicios',
      subcategoria: 'Litoral Gas',
    },

    // Rosario Local Services / Taxes (June 2026)
    {
      tipo: 'GASTO',
      monto: 9200, // inflation increase
      descripcion: 'TGI Rosario - Pellegrini (Tasa General de Inmuebles)',
      fecha: new Date('2026-06-15T12:00:00Z'),
      categoria: 'Impuestos Locales',
      subcategoria: 'TGI Rosario',
      propiedadId: deptoPellegrini.id,
    },
    {
      tipo: 'GASTO',
      monto: 12500,
      descripcion: 'API Santa Fe Inmobiliario - Pellegrini',
      fecha: new Date('2026-06-16T12:00:00Z'),
      categoria: 'Impuestos Locales',
      subcategoria: 'API Santa Fe',
      propiedadId: deptoPellegrini.id,
    },
    {
      tipo: 'GASTO',
      monto: 21300,
      descripcion: 'Factura EPE Luz',
      fecha: new Date('2026-06-20T10:00:00Z'),
      categoria: 'Servicios',
      subcategoria: 'EPE Luz',
    },
    {
      tipo: 'GASTO',
      monto: 9500,
      descripcion: 'Factura ASSA Agua',
      fecha: new Date('2026-06-22T10:00:00Z'),
      categoria: 'Servicios',
      subcategoria: 'ASSA Agua',
    },
    {
      tipo: 'GASTO',
      monto: 6800,
      descripcion: 'Factura Litoral Gas',
      fecha: new Date('2026-06-25T11:00:00Z'),
      categoria: 'Servicios',
      subcategoria: 'Litoral Gas',
    },

    // Rosario Local Services / Taxes (July 2026)
    {
      tipo: 'GASTO',
      monto: 9200,
      descripcion: 'TGI Rosario - Pellegrini (Tasa General de Inmuebles)',
      fecha: new Date('2026-07-06T10:00:00Z'),
      categoria: 'Impuestos Locales',
      subcategoria: 'TGI Rosario',
      propiedadId: deptoPellegrini.id,
    },

    // DReI (Derecho de Registro e Inspección) for Business local
    {
      tipo: 'GASTO',
      monto: 15400,
      descripcion: 'DReI Municipalidad de Rosario - Local San Martín',
      fecha: new Date('2026-05-18T09:00:00Z'),
      categoria: 'Impuestos Locales',
      subcategoria: 'DReI Rosario',
      propiedadId: localSanMartin.id,
    },
    {
      tipo: 'GASTO',
      monto: 15400,
      descripcion: 'DReI Municipalidad de Rosario - Local San Martín',
      fecha: new Date('2026-06-18T09:00:00Z'),
      categoria: 'Impuestos Locales',
      subcategoria: 'DReI Rosario',
      propiedadId: localSanMartin.id,
    },

    // General expenses
    {
      tipo: 'GASTO',
      monto: 120000,
      descripcion: 'Supermercado La Gallega',
      fecha: new Date('2026-05-08T18:00:00Z'),
      categoria: 'Alimentos',
      subcategoria: 'Supermercado',
    },
    {
      tipo: 'GASTO',
      monto: 145000,
      descripcion: 'Supermercado Coto Pellegrini',
      fecha: new Date('2026-06-12T19:00:00Z'),
      categoria: 'Alimentos',
      subcategoria: 'Supermercado',
    },
    {
      tipo: 'GASTO',
      monto: 85000,
      descripcion: 'Supermercado Carrefour',
      fecha: new Date('2026-07-03T15:00:00Z'),
      categoria: 'Alimentos',
      subcategoria: 'Supermercado',
    },

    // Savings / Ahorros
    {
      tipo: 'AHORRO',
      monto: 100000,
      descripcion: 'Compra Dólar MEP (Ahorro mensual)',
      fecha: new Date('2026-05-28T14:00:00Z'),
      categoria: 'Inversiones',
      subcategoria: 'Dólar MEP',
    },
    {
      tipo: 'AHORRO',
      monto: 150000,
      descripcion: 'Plazo Fijo Banco Municipal',
      fecha: new Date('2026-06-28T14:00:00Z'),
      categoria: 'Inversiones',
      subcategoria: 'Plazo Fijo',
    },
  ];

  for (const tx of personalTransactions) {
    await prisma.transaccion.create({
      data: tx,
    });
  }

  // 7. Seed ImpuestoConfigurado
  console.log('Seeding ImpuestosConfigurados...');
  const defaultTaxes = [
    { nombre: 'TGI Rosario', descripcion: 'Tasa General de Inmuebles (Municipal)', montoSugerido: 9200, diaVencimiento: 10, categoria: 'Impuestos Locales', subcategoria: 'TGI Rosario' },
    { nombre: 'API Inmobiliario', descripcion: 'Impuesto Inmobiliario (Provincial)', montoSugerido: 12500, diaVencimiento: 15, categoria: 'Impuestos Locales', subcategoria: 'API Santa Fe' },
    { nombre: 'EPE Luz', descripcion: 'Empresa Provincial de la Energía (EPE)', montoSugerido: 21300, diaVencimiento: 20, categoria: 'Servicios', subcategoria: 'EPE Luz' },
    { nombre: 'ASSA Agua', descripcion: 'Aguas Santafesinas (ASSA)', montoSugerido: 9500, diaVencimiento: 22, categoria: 'Servicios', subcategoria: 'ASSA Agua' },
    { nombre: 'Litoral Gas', descripcion: 'Suministro de Gas Natural', montoSugerido: 6800, diaVencimiento: 25, categoria: 'Servicios', subcategoria: 'Litoral Gas' },
    { nombre: 'DReI Rosario', descripcion: 'Derecho de Registro e Inspección (Comercios)', montoSugerido: 15400, diaVencimiento: 18, categoria: 'Impuestos Locales', subcategoria: 'DReI Rosario' },
  ];

  for (const tax of defaultTaxes) {
    await prisma.impuestoConfigurado.create({
      data: tax,
    });
  }
  console.log('Configured taxes seeded.');

  console.log('General personal transactions and local services created.');
  console.log('Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

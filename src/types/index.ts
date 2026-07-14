export type TipoTransaccion = 'INGRESO' | 'GASTO' | 'AHORRO';
export type TipoPropiedad = 'DEPARTAMENTO' | 'LOCAL';
export type EstadoPropiedad = 'ACTIVO' | 'INACTIVO' | 'MANTENIMIENTO';
export type IndiceActualizacion = 'ICL' | 'CAC' | 'IPC' | 'FIJO';
export type EstadoPago = 'PAGADO' | 'IMPAGO' | 'PARCIAL';

export interface Transaccion {
  id: string;
  tipo: TipoTransaccion;
  monto: number;
  descripcion: string;
  fecha: string | Date;
  categoria: string;
  subcategoria?: string | null;
  propiedadId?: string | null;
  propiedad?: Propiedad;
  pagoId?: string | null;
  medioPago?: string | null;
  tarjetaId?: string | null;
  gastoFijoId?: string | null;
  cuotasTotal?: number | null;
  cuotaNumero?: number | null;
  recargo?: number | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Propiedad {
  id: string;
  nombre: string;
  tipo: TipoPropiedad;
  direccion: string;
  estado: EstadoPropiedad;
  contratos?: Contrato[];
  transacciones?: Transaccion[];
  gastos?: GastoPropiedad[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Contrato {
  id: string;
  propiedadId: string;
  propiedad?: Propiedad;
  inquilinoNombre: string;
  fechaInicio: string | Date;
  fechaFin: string | Date;
  montoInicial: number;
  montoActual: number;
  indiceActualizacion: IndiceActualizacion;
  frecuenciaActualizacion: number; // en meses
  ultimaActualizacion?: string | Date | null;
  documentoPath?: string | null;
  pagos?: PagoAlquiler[];
  historialAjustes?: HistorialAjuste[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface HistorialAjuste {
  id: string;
  contratoId: string;
  fecha: string | Date;
  montoPrevio: number;
  montoNuevo: number;
  porcentaje: number;
  createdAt?: string | Date;
}

export interface PagoAlquiler {
  id: string;
  contratoId: string;
  contrato?: Contrato;
  mesReferencia: string; // "YYYY-MM"
  montoCobrado: number;
  fechaPago?: string | Date | null;
  estado: EstadoPago;
  transaccion?: Transaccion | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface GastoPropiedad {
  id: string;
  propiedadId: string;
  fecha: string | Date;
  descripcion: string;
  monto: number;
  tipo: 'MANTENIMIENTO' | 'EXPENSA_EXTRAORDINARIA' | 'OTRO';
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// Client-side stats / analytics interfaces
export interface MetricasVariacion {
  actual: number;
  anterior: number;
  variacionPorcentual: number;
}

export interface MetricasFinancieras {
  ingresos: MetricasVariacion;
  gastos: MetricasVariacion;
  ahorros: MetricasVariacion;
  rentabilidadAlquileres: MetricasVariacion;
}

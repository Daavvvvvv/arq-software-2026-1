import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { EstadoPago } from '../enums';
import { Pedido } from './pedido.entity';

@Entity('pagos')
export class Pago {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: EstadoPago, default: EstadoPago.PENDIENTE })
  estado!: EstadoPago;

  @Column({ nullable: true })
  referencia!: string;

  @Column({ nullable: true })
  motivo!: string;

  @Column({ nullable: true })
  proveedor!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monto!: number;

  @OneToOne(() => Pedido, (p) => p.pago)
  @JoinColumn()
  pedido!: Pedido;

  @Column()
  pedidoId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

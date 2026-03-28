import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { EstadoEntrega } from '../enums';
import { Pedido } from './pedido.entity';
import { Repartidor } from './repartidor.entity';

@Entity('entregas')
export class Entrega {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: EstadoEntrega, default: EstadoEntrega.ASIGNADO })
  estado!: EstadoEntrega;

  @Column({ nullable: true, type: 'timestamp' })
  horaEntrega!: Date | null;

  @Column({ nullable: true, type: 'int' })
  tiempoTotal!: number | null;

  @OneToOne(() => Pedido, (p) => p.entrega)
  @JoinColumn()
  pedido!: Pedido;

  @Column()
  pedidoId!: string;

  @ManyToOne(() => Repartidor, (r) => r.entregas, { nullable: true })
  repartidor!: Repartidor | null;

  @Column({ nullable: true })
  repartidorId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

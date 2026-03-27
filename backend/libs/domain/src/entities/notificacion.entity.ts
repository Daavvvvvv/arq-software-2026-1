import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum EstadoNotificacion {
  PENDIENTE = 'PENDIENTE',
  ENVIADO = 'ENVIADO',
  FALLIDO = 'FALLIDO',
}

@Entity('notificaciones')
export class Notificacion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  usuarioId!: string;

  @Column()
  pedidoId!: string;

  @Column()
  eventType!: string;

  @Column({ type: 'text' })
  mensaje!: string;

  @Column({ type: 'enum', enum: EstadoNotificacion, default: EstadoNotificacion.PENDIENTE })
  estado!: EstadoNotificacion;

  @Column({ nullable: true })
  canal!: string;

  @Column({ nullable: true })
  error!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

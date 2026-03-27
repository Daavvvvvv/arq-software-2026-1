import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { EstadoPedido } from '../enums';
import { Usuario } from './usuario.entity';
import { ItemPedido } from './item-pedido.entity';
import { Pago } from './pago.entity';
import { Entrega } from './entrega.entity';

@Entity('pedidos')
export class Pedido {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  numeroPedido!: string;

  @Column({ type: 'enum', enum: EstadoPedido, default: EstadoPedido.PENDIENTE })
  estado!: EstadoPedido;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total!: number;

  @Column()
  zona!: string;

  @Column()
  fila!: string;

  @Column()
  asiento!: string;

  @Column({ nullable: true })
  correlationId!: string;

  @Column({ nullable: true })
  tenantId!: string;

  @ManyToOne(() => Usuario, (u) => u.pedidos)
  usuario!: Usuario;

  @Column()
  usuarioId!: string;

  @OneToMany(() => ItemPedido, (i) => i.pedido, { cascade: true })
  items!: ItemPedido[];

  @OneToOne(() => Pago, (p) => p.pedido, { nullable: true })
  pago!: Pago | null;

  @OneToOne(() => Entrega, (e) => e.pedido, { nullable: true })
  entrega!: Entrega | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

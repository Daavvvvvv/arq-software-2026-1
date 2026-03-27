import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Pedido } from './pedido.entity';
import { Producto } from './producto.entity';

@Entity('items_pedido')
export class ItemPedido {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int' })
  cantidad!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precioUnitario!: number;

  @ManyToOne(() => Pedido, (p) => p.items)
  pedido!: Pedido;

  @Column()
  pedidoId!: string;

  @ManyToOne(() => Producto)
  producto!: Producto;

  @Column()
  productoId!: string;
}

import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { RolUsuario } from '../enums';
import { Boleta } from './boleta.entity';
import { Pedido } from './pedido.entity';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  passwordHash!: string;

  @Column({ type: 'enum', enum: RolUsuario, default: RolUsuario.CONSUMER })
  rol!: RolUsuario;

  @Column({ nullable: true })
  nombre!: string;

  @Column({ nullable: true })
  metodoPago!: string;

  @Column({ nullable: true })
  fcmToken!: string;

  @Column({ nullable: true })
  recintoId!: string;

  @OneToMany(() => Boleta, (b) => b.usuario)
  boletas!: Boleta[];

  @OneToMany(() => Pedido, (p) => p.usuario)
  pedidos!: Pedido[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import * as bcrypt from 'bcryptjs';
import { writeDatasource } from '../libs/database/src/write-datasource';
import {
  Recinto, Evento, Usuario, Boleta,
  Tienda, Producto, Repartidor,
  RolUsuario,
} from '../libs/domain/src/index';

async function seed(): Promise<void> {
  await writeDatasource.initialize();
  const ds = writeDatasource;

  // ── Recinto ──────────────────────────────────────────────
  const recintoRepo = ds.getRepository(Recinto);
  let recinto = await recintoRepo.findOne({ where: { nombre: 'Estadio Atanasio Girardot' } });
  if (!recinto) {
    recinto = recintoRepo.create({ nombre: 'Estadio Atanasio Girardot', ciudad: 'Medellín', capacidad: 15000 });
    recinto = await recintoRepo.save(recinto);
  }

  // ── Evento ───────────────────────────────────────────────
  const eventoRepo = ds.getRepository(Evento);
  let evento = await eventoRepo.findOne({ where: { nombre: 'Bad Bunny - Tour Mañana Será Bonito' } });
  if (!evento) {
    evento = eventoRepo.create({
      nombre: 'Bad Bunny - Tour Mañana Será Bonito',
      artista: 'Bad Bunny',
      fecha: new Date('2026-06-15T20:00:00'),
      activo: true,
      recintoId: recinto.id,
    });
    evento = await eventoRepo.save(evento);
  }

  // ── Tienda ───────────────────────────────────────────────
  const tiendaRepo = ds.getRepository(Tienda);
  let tienda = await tiendaRepo.findOne({ where: { nombre: 'Cocina Sector C' } });
  if (!tienda) {
    tienda = tiendaRepo.create({ nombre: 'Cocina Sector C', zona: 'C', recintoId: recinto.id });
    tienda = await tiendaRepo.save(tienda);
  }

  // ── Productos ─────────────────────────────────────────────
  const productoRepo = ds.getRepository(Producto);
  const productos = [
    { nombre: 'Hamburguesa Clásica', precio: 25000, stock: 100 },
    { nombre: 'Nachos con Guac', precio: 18000, stock: 100 },
    { nombre: 'Pizza Personal', precio: 22000, stock: 100 },
    { nombre: 'Cerveza Pilsen', precio: 10000, stock: 200 },
  ];
  for (const p of productos) {
    const exists = await productoRepo.findOne({ where: { nombre: p.nombre, tiendaId: tienda.id } });
    if (!exists) {
      await productoRepo.save(productoRepo.create({ ...p, tiendaId: tienda.id }));
    }
  }

  // ── Usuarios ──────────────────────────────────────────────
  const usuarioRepo = ds.getRepository(Usuario);
  const hash = await bcrypt.hash('test123', 10);
  const usersData = [
    { email: 'asistente@test.com', rol: RolUsuario.CONSUMER,    nombre: 'Asistente Test', metodoPago: 'mercadopago' },
    { email: 'cocina@test.com',     rol: RolUsuario.KITCHEN,     nombre: 'Cocina Test' },
    { email: 'repartidor@test.com', rol: RolUsuario.DISPATCHER,  nombre: 'Repartidor Test' },
    { email: 'admin@test.com',      rol: RolUsuario.VENUE_ADMIN, nombre: 'Admin Test' },
  ];
  const savedUsers: Record<string, string> = {};
  for (const u of usersData) {
    let user = await usuarioRepo.findOne({ where: { email: u.email } });
    if (!user) {
      const created = usuarioRepo.create({ ...u, passwordHash: hash });
      user = await usuarioRepo.save(created);
    }
    savedUsers[u.email] = user.id;
  }

  // ── Boleta para asistente ─────────────────────────────────
  const boletaRepo = ds.getRepository(Boleta);
  const exists = await boletaRepo.findOne({ where: { codigoQR: 'QR-ASISTENTE-001' } });
  if (!exists) {
    await boletaRepo.save(
      boletaRepo.create({
        codigoQR: 'QR-ASISTENTE-001',
        zona: 'C',
        fila: '8',
        asiento: '14',
        vinculada: true,
        usuarioId: savedUsers['asistente@test.com'],
        eventoId: evento.id,
      }),
    );
  }

  // ── Repartidores ──────────────────────────────────────────
  const repartidorRepo = ds.getRepository(Repartidor);
  const repartidores = [
    { nombre: 'Carlos', zona: 'C', disponible: true },
    { nombre: 'Ana',    zona: 'B', disponible: true },
  ];
  for (const r of repartidores) {
    const ex = await repartidorRepo.findOne({ where: { nombre: r.nombre } });
    if (!ex) await repartidorRepo.save(repartidorRepo.create(r));
  }

  console.log('✅ Seed complete');
  await ds.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

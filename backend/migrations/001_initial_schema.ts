import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000001 implements MigrationInterface {
  name = 'InitialSchema1700000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TYPE "rol_usuario_enum" AS ENUM ('CONSUMER','KITCHEN','DISPATCHER','VENUE_ADMIN')
    `);
    await queryRunner.query(`
      CREATE TYPE "estado_pedido_enum" AS ENUM
        ('PENDIENTE','VALIDADO','PAGADO','EN_PREPARACION','LISTO','EN_ENTREGA','ENTREGADO','CANCELADO')
    `);
    await queryRunner.query(`
      CREATE TYPE "estado_pago_enum" AS ENUM ('PENDIENTE','CONFIRMADO','RECHAZADO','REEMBOLSADO')
    `);
    await queryRunner.query(`
      CREATE TYPE "estado_entrega_enum" AS ENUM ('ASIGNADO','EN_CAMINO','ENTREGADO','FALLIDO')
    `);
    await queryRunner.query(`
      CREATE TYPE "estado_notificacion_enum" AS ENUM ('PENDIENTE','ENVIADO','FALLIDO')
    `);

    await queryRunner.query(`
      CREATE TABLE "recintos" (
        "id"         UUID NOT NULL DEFAULT uuid_generate_v4(),
        "nombre"     VARCHAR NOT NULL,
        "ciudad"     VARCHAR NOT NULL,
        "capacidad"  INTEGER NOT NULL,
        "createdAt"  TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"  TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_recintos" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "eventos" (
        "id"         UUID NOT NULL DEFAULT uuid_generate_v4(),
        "nombre"     VARCHAR NOT NULL,
        "artista"    VARCHAR NOT NULL,
        "fecha"      TIMESTAMP NOT NULL,
        "activo"     BOOLEAN NOT NULL DEFAULT false,
        "recintoId"  UUID NOT NULL,
        "createdAt"  TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"  TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_eventos" PRIMARY KEY ("id"),
        CONSTRAINT "FK_eventos_recinto" FOREIGN KEY ("recintoId") REFERENCES "recintos"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "usuarios" (
        "id"           UUID NOT NULL DEFAULT uuid_generate_v4(),
        "email"        VARCHAR NOT NULL,
        "passwordHash" VARCHAR NOT NULL,
        "rol"          "rol_usuario_enum" NOT NULL DEFAULT 'CONSUMER',
        "nombre"       VARCHAR,
        "metodoPago"   VARCHAR,
        "fcmToken"     VARCHAR,
        "createdAt"    TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"    TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_usuarios" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_usuarios_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "boletas" (
        "id"         UUID NOT NULL DEFAULT uuid_generate_v4(),
        "codigoQR"   VARCHAR NOT NULL,
        "zona"       VARCHAR NOT NULL,
        "fila"       VARCHAR NOT NULL,
        "asiento"    VARCHAR NOT NULL,
        "vinculada"  BOOLEAN NOT NULL DEFAULT false,
        "usuarioId"  UUID,
        "eventoId"   UUID NOT NULL,
        "createdAt"  TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"  TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_boletas" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_boletas_codigoQR" UNIQUE ("codigoQR"),
        CONSTRAINT "FK_boletas_usuario" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id"),
        CONSTRAINT "FK_boletas_evento" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tiendas" (
        "id"        UUID NOT NULL DEFAULT uuid_generate_v4(),
        "nombre"    VARCHAR NOT NULL,
        "zona"      VARCHAR NOT NULL,
        "activa"    BOOLEAN NOT NULL DEFAULT true,
        "recintoId" UUID NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tiendas" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tiendas_recinto" FOREIGN KEY ("recintoId") REFERENCES "recintos"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "productos" (
        "id"          UUID NOT NULL DEFAULT uuid_generate_v4(),
        "nombre"      VARCHAR NOT NULL,
        "precio"      DECIMAL(10,2) NOT NULL,
        "stock"       INTEGER NOT NULL DEFAULT 0,
        "disponible"  BOOLEAN NOT NULL DEFAULT true,
        "descripcion" VARCHAR,
        "imagen"      VARCHAR,
        "tiendaId"    UUID NOT NULL,
        "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_productos" PRIMARY KEY ("id"),
        CONSTRAINT "FK_productos_tienda" FOREIGN KEY ("tiendaId") REFERENCES "tiendas"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "repartidores" (
        "id"          UUID NOT NULL DEFAULT uuid_generate_v4(),
        "nombre"      VARCHAR NOT NULL,
        "zona"        VARCHAR NOT NULL,
        "disponible"  BOOLEAN NOT NULL DEFAULT true,
        "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_repartidores" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "pedidos" (
        "id"            UUID NOT NULL DEFAULT uuid_generate_v4(),
        "numeroPedido"  VARCHAR NOT NULL,
        "estado"        "estado_pedido_enum" NOT NULL DEFAULT 'PENDIENTE',
        "total"         DECIMAL(10,2) NOT NULL,
        "zona"          VARCHAR NOT NULL,
        "fila"          VARCHAR NOT NULL,
        "asiento"       VARCHAR NOT NULL,
        "correlationId" VARCHAR,
        "tenantId"      VARCHAR,
        "usuarioId"     UUID NOT NULL,
        "createdAt"     TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"     TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pedidos" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_pedidos_numero" UNIQUE ("numeroPedido"),
        CONSTRAINT "FK_pedidos_usuario" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "items_pedido" (
        "id"             UUID NOT NULL DEFAULT uuid_generate_v4(),
        "cantidad"       INTEGER NOT NULL,
        "precioUnitario" DECIMAL(10,2) NOT NULL,
        "pedidoId"       UUID NOT NULL,
        "productoId"     UUID NOT NULL,
        CONSTRAINT "PK_items_pedido" PRIMARY KEY ("id"),
        CONSTRAINT "FK_items_pedido_pedido" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id"),
        CONSTRAINT "FK_items_pedido_producto" FOREIGN KEY ("productoId") REFERENCES "productos"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "pagos" (
        "id"        UUID NOT NULL DEFAULT uuid_generate_v4(),
        "estado"    "estado_pago_enum" NOT NULL DEFAULT 'PENDIENTE',
        "referencia" VARCHAR,
        "motivo"    VARCHAR,
        "proveedor" VARCHAR,
        "monto"     DECIMAL(10,2) NOT NULL,
        "pedidoId"  UUID NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pagos" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_pagos_pedido" UNIQUE ("pedidoId"),
        CONSTRAINT "FK_pagos_pedido" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "entregas" (
        "id"            UUID NOT NULL DEFAULT uuid_generate_v4(),
        "estado"        "estado_entrega_enum" NOT NULL DEFAULT 'ASIGNADO',
        "horaEntrega"   TIMESTAMP,
        "tiempoTotal"   INTEGER,
        "pedidoId"      UUID NOT NULL,
        "repartidorId"  UUID NOT NULL,
        "createdAt"     TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"     TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_entregas" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_entregas_pedido" UNIQUE ("pedidoId"),
        CONSTRAINT "FK_entregas_pedido" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id"),
        CONSTRAINT "FK_entregas_repartidor" FOREIGN KEY ("repartidorId") REFERENCES "repartidores"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "notificaciones" (
        "id"        UUID NOT NULL DEFAULT uuid_generate_v4(),
        "usuarioId" UUID NOT NULL,
        "pedidoId"  UUID NOT NULL,
        "eventType" VARCHAR NOT NULL,
        "mensaje"   TEXT NOT NULL,
        "estado"    "estado_notificacion_enum" NOT NULL DEFAULT 'PENDIENTE',
        "canal"     VARCHAR,
        "error"     VARCHAR,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notificaciones" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "events_log" (
        "id"            UUID NOT NULL DEFAULT uuid_generate_v4(),
        "eventType"     VARCHAR NOT NULL,
        "pedidoId"      UUID NOT NULL,
        "correlationId" VARCHAR,
        "tenantId"      VARCHAR,
        "payload"       JSONB,
        "createdAt"     TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_events_log" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_events_log_pedidoId" ON "events_log" ("pedidoId")`);
    await queryRunner.query(`CREATE INDEX "IDX_pedidos_usuarioId" ON "pedidos" ("usuarioId")`);
    await queryRunner.query(`CREATE INDEX "IDX_pedidos_estado" ON "pedidos" ("estado")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "events_log"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notificaciones"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "entregas"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pagos"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "items_pedido"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pedidos"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "repartidores"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "productos"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tiendas"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "boletas"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "usuarios"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "eventos"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "recintos"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "estado_notificacion_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "estado_entrega_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "estado_pago_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "estado_pedido_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rol_usuario_enum"`);
  }
}

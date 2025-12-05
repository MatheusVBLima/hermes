/**
 * Migra dados do SQLite local (prisma/dev.db) para o Postgres (DATABASE_URL).
 * Pré-requisitos:
 * 1) Atualize o schema para provider postgresql (já feito).
 * 2) Crie as tabelas no Postgres: `npx prisma migrate deploy` (ou `prisma db push`).
 * 3) Tenha o arquivo prisma/dev.db com os dados atuais.
 *
 * Uso:
 * DATABASE_URL="postgres://..." tsx scripts/migrate-sqlite-to-pg.ts
 */

import { PrismaClient } from '@prisma/client';

// Salva a DATABASE_URL original
const originalUrl = process.env.DATABASE_URL;

// Cliente apontando para o Postgres (usa DATABASE_URL padrão)
const pg = new PrismaClient();

// Cliente apontando para o SQLite local
// Define temporariamente a URL do SQLite
process.env.DATABASE_URL = 'file:./prisma/dev.db';
const sqlite = new PrismaClient();

// Restaura a URL original
process.env.DATABASE_URL = originalUrl;

async function migrateTable<T>(
    name: string,
    fetch: () => Promise<T[]>,
    insert: (rows: T[]) => Promise<void>
) {
    const rows = await fetch();
    if (rows.length === 0) {
        console.log(`[${name}] nada para migrar`);
        return;
    }
    console.log(`[${name}] migrando ${rows.length} registros...`);
    await insert(rows);
}

async function main() {
    // Ordem respeitando FK simples (Guilds primeiro)
    await migrateTable('Guild', () => sqlite.guild.findMany(), (rows) =>
        pg.guild.createMany({ data: rows, skipDuplicates: true })
    );

    await migrateTable('Warning', () => sqlite.warning.findMany(), (rows) =>
        pg.warning.createMany({ data: rows, skipDuplicates: true })
    );

    await migrateTable('ModLog', () => sqlite.modLog.findMany(), (rows) =>
        pg.modLog.createMany({ data: rows, skipDuplicates: true })
    );

    await migrateTable('UserLevel', () => sqlite.userLevel.findMany(), (rows) =>
        pg.userLevel.createMany({ data: rows, skipDuplicates: true })
    );

    await migrateTable('LevelRole', () => sqlite.levelRole.findMany(), (rows) =>
        pg.levelRole.createMany({ data: rows, skipDuplicates: true })
    );

    await migrateTable('XPSettings', () => sqlite.xPSettings.findMany(), (rows) =>
        pg.xPSettings.createMany({ data: rows, skipDuplicates: true })
    );

    await migrateTable('UserEconomy', () => sqlite.userEconomy.findMany(), (rows) =>
        pg.userEconomy.createMany({ data: rows, skipDuplicates: true })
    );

    await migrateTable('ShopItem', () => sqlite.shopItem.findMany(), (rows) =>
        pg.shopItem.createMany({ data: rows, skipDuplicates: true })
    );

    await migrateTable('UserInventory', () => sqlite.userInventory.findMany(), (rows) =>
        pg.userInventory.createMany({ data: rows, skipDuplicates: true })
    );

    await migrateTable('ReactionRole', () => sqlite.reactionRole.findMany(), (rows) =>
        pg.reactionRole.createMany({ data: rows, skipDuplicates: true })
    );

    await migrateTable('Giveaway', () => sqlite.giveaway.findMany(), (rows) =>
        pg.giveaway.createMany({ data: rows, skipDuplicates: true })
    );

    await migrateTable('AutoMod', () => sqlite.autoMod.findMany(), (rows) =>
        pg.autoMod.createMany({ data: rows, skipDuplicates: true })
    );

    await migrateTable('Starboard', () => sqlite.starboard.findMany(), (rows) =>
        pg.starboard.createMany({ data: rows, skipDuplicates: true })
    );

    await migrateTable('StarredMessage', () => sqlite.starredMessage.findMany(), (rows) =>
        pg.starredMessage.createMany({ data: rows, skipDuplicates: true })
    );

    await migrateTable('Reminder', () => sqlite.reminder.findMany(), (rows) =>
        pg.reminder.createMany({ data: rows, skipDuplicates: true })
    );

    console.log('✅ Migração concluída.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await sqlite.$disconnect();
        await pg.$disconnect();
    });


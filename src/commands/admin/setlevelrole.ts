import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    MessageFlags,
} from 'discord.js';
import { prisma } from '../../services/database.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('setlevelrole')
    .setDescription('Configurar cargos automáticos por nível')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(subcommand =>
        subcommand
            .setName('add')
            .setDescription('Adicionar cargo para um nível')
            .addIntegerOption(option =>
                option
                    .setName('nivel')
                    .setDescription('Nível necessário')
                    .setMinValue(1)
                    .setMaxValue(100)
                    .setRequired(true)
            )
            .addRoleOption(option =>
                option
                    .setName('cargo')
                    .setDescription('Cargo a ser dado')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('remove')
            .setDescription('Remover cargo de um nível')
            .addIntegerOption(option =>
                option
                    .setName('nivel')
                    .setDescription('Nível')
                    .setMinValue(1)
                    .setMaxValue(100)
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('list')
            .setDescription('Ver todos os cargos por nível configurados')
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply({
            embeds: [errorEmbed('Erro', 'Este comando só pode ser usado em servidores.')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'add':
            await handleAdd(interaction);
            break;
        case 'remove':
            await handleRemove(interaction);
            break;
        case 'list':
            await handleList(interaction);
            break;
    }
}

async function handleAdd(interaction: ChatInputCommandInteraction) {
    const level = interaction.options.getInteger('nivel', true);
    const role = interaction.options.getRole('cargo', true);

    // Check if role is manageable
    const guild = interaction.guild!;
    const botMember = guild.members.me!;
    const roleObj = guild.roles.cache.get(role.id);

    if (!roleObj) {
        await interaction.reply({
            embeds: [errorEmbed('Erro', 'Cargo não encontrado.')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (roleObj.position >= botMember.roles.highest.position) {
        await interaction.reply({
            embeds: [
                errorEmbed(
                    'Posição de Cargo Inválida',
                    'Este cargo está acima ou no mesmo nível da minha posição de cargo mais alta. Mova meu cargo para uma posição superior.'
                ),
            ],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // Create or update level role
    await prisma.levelRole.upsert({
        where: {
            guildId_level: {
                guildId: guild.id,
                level,
            },
        },
        update: { roleId: role.id },
        create: {
            guildId: guild.id,
            level,
            roleId: role.id,
        },
    });

    await interaction.reply({
        embeds: [
            successEmbed(
                'Cargo de Nível Configurado',
                `Usuários que atingirem o **nível ${level}** receberão o cargo ${role}.`
            ),
        ],
    });

    logger.info(`[LevelRole] Set role ${role.name} for level ${level} in ${guild.name}`);
}

async function handleRemove(interaction: ChatInputCommandInteraction) {
    const level = interaction.options.getInteger('nivel', true);

    const levelRole = await prisma.levelRole.findUnique({
        where: {
            guildId_level: {
                guildId: interaction.guild!.id,
                level,
            },
        },
    });

    if (!levelRole) {
        await interaction.reply({
            embeds: [errorEmbed('Não Encontrado', `Não há cargo configurado para o nível ${level}.`)],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await prisma.levelRole.delete({
        where: { id: levelRole.id },
    });

    await interaction.reply({
        embeds: [successEmbed('Cargo de Nível Removido', `O cargo do nível ${level} foi removido.`)],
    });

    logger.info(`[LevelRole] Removed role for level ${level} in ${interaction.guild!.name}`);
}

async function handleList(interaction: ChatInputCommandInteraction) {
    const levelRoles = await prisma.levelRole.findMany({
        where: { guildId: interaction.guild!.id },
        orderBy: { level: 'asc' },
    });

    if (levelRoles.length === 0) {
        await interaction.reply({
            embeds: [
                infoEmbed('Nenhum Cargo de Nível')
                    .setDescription('Não há cargos de nível configurados neste servidor.'),
            ],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const list = levelRoles.map(lr => {
        return `**Nível ${lr.level}** → <@&${lr.roleId}>`;
    }).join('\n');

    const embed = infoEmbed('🎖️ Cargos por Nível')
        .setDescription(list)
        .setFooter({ text: `Total: ${levelRoles.length} cargo(s)` });

    await interaction.reply({ embeds: [embed] });
}

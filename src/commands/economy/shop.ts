import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    MessageFlags,
    ChannelType,
} from 'discord.js';
import { prisma } from '../../services/database.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Sistema de loja')
    .addSubcommand(subcommand =>
        subcommand
            .setName('view')
            .setDescription('Ver itens disponíveis na loja')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('buy')
            .setDescription('Comprar um item da loja')
            .addIntegerOption(option =>
                option
                    .setName('item')
                    .setDescription('ID do item')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('add')
            .setDescription('Adicionar item à loja (Admin)')
            .addStringOption(option =>
                option
                    .setName('nome')
                    .setDescription('Nome do item')
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option
                    .setName('preco')
                    .setDescription('Preço do item')
                    .setMinValue(1)
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('tipo')
                    .setDescription('Tipo do item')
                    .addChoices(
                        { name: 'Cargo (Role)', value: 'role' },
                        { name: 'Item Customizado', value: 'custom' }
                    )
                    .setRequired(true)
            )
            .addRoleOption(option =>
                option
                    .setName('cargo')
                    .setDescription('Cargo a ser dado (se tipo for role)')
            )
            .addStringOption(option =>
                option
                    .setName('descricao')
                    .setDescription('Descrição do item')
            )
            .addStringOption(option =>
                option
                    .setName('emoji')
                    .setDescription('Emoji do item')
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('remove')
            .setDescription('Remover item da loja (Admin)')
            .addIntegerOption(option =>
                option
                    .setName('item')
                    .setDescription('ID do item')
                    .setRequired(true)
            )
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
        case 'view':
            await handleView(interaction);
            break;
        case 'buy':
            await handleBuy(interaction);
            break;
        case 'add':
            await handleAdd(interaction);
            break;
        case 'remove':
            await handleRemove(interaction);
            break;
    }
}

async function handleView(interaction: ChatInputCommandInteraction) {
    const items = await prisma.shopItem.findMany({
        where: { guildId: interaction.guild!.id },
        orderBy: { price: 'asc' },
    });

    if (items.length === 0) {
        await interaction.reply({
            embeds: [
                infoEmbed('Loja Vazia')
                    .setDescription('Não há itens disponíveis na loja no momento.'),
            ],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const itemList = items.map(item => {
        const emoji = item.emoji || '📦';
        const type = item.itemType === 'role' ? '🎭 Cargo' : '✨ Item';
        const roleInfo = item.roleId ? ` (<@&${item.roleId}>)` : '';
        return `**${emoji} [ID: ${item.id}]** ${item.name}${roleInfo}\n` +
               `${type} • **${item.price}** moedas\n` +
               `${item.description || '*Sem descrição*'}`;
    }).join('\n\n');

    const embed = infoEmbed('🛒 Loja do Servidor')
        .setDescription(itemList)
        .setFooter({ text: 'Use /shop buy <id> para comprar um item' });

    await interaction.reply({ embeds: [embed] });
}

async function handleBuy(interaction: ChatInputCommandInteraction) {
    const itemId = interaction.options.getInteger('item', true);

    const item = await prisma.shopItem.findFirst({
        where: {
            id: itemId,
            guildId: interaction.guild!.id,
        },
    });

    if (!item) {
        await interaction.reply({
            embeds: [errorEmbed('Item Não Encontrado', 'Este item não existe na loja.')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // Get user economy
    let userEconomy = await prisma.userEconomy.findUnique({
        where: {
            userId_guildId: {
                userId: interaction.user.id,
                guildId: interaction.guild!.id,
            },
        },
    });

    if (!userEconomy) {
        userEconomy = await prisma.userEconomy.create({
            data: {
                userId: interaction.user.id,
                guildId: interaction.guild!.id,
                balance: 0,
            },
        });
    }

    // Check balance
    if (userEconomy.balance < item.price) {
        await interaction.reply({
            embeds: [
                errorEmbed(
                    'Saldo Insuficiente',
                    `Você não tem moedas suficientes!\n\nSaldo: **${userEconomy.balance}** moedas\nPreço: **${item.price}** moedas`
                ),
            ],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // Check if already owns (for roles)
    if (item.itemType === 'role' && item.roleId) {
        const member = await interaction.guild!.members.fetch(interaction.user.id);
        if (member.roles.cache.has(item.roleId)) {
            await interaction.reply({
                embeds: [errorEmbed('Já Possui', 'Você já possui este cargo!')],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
    }

    // Process purchase
    await prisma.userEconomy.update({
        where: { id: userEconomy.id },
        data: { balance: userEconomy.balance - item.price },
    });

    // Add to inventory
    const existingItem = await prisma.userInventory.findUnique({
        where: {
            userId_guildId_itemId: {
                userId: interaction.user.id,
                guildId: interaction.guild!.id,
                itemId: item.id,
            },
        },
    });

    if (existingItem) {
        await prisma.userInventory.update({
            where: { id: existingItem.id },
            data: { quantity: existingItem.quantity + 1 },
        });
    } else {
        await prisma.userInventory.create({
            data: {
                userId: interaction.user.id,
                guildId: interaction.guild!.id,
                itemId: item.id,
                itemName: item.name,
            },
        });
    }

    // Give role if applicable
    if (item.itemType === 'role' && item.roleId) {
        const member = await interaction.guild!.members.fetch(interaction.user.id);
        const role = interaction.guild!.roles.cache.get(item.roleId);
        if (role) {
            await member.roles.add(role, 'Shop purchase');
        }
    }

    await interaction.reply({
        embeds: [
            successEmbed(
                '✅ Compra Realizada!',
                `Você comprou **${item.name}** por **${item.price}** moedas!\n\n` +
                `Novo saldo: **${userEconomy.balance - item.price}** moedas`
            ),
        ],
    });

    logger.info(`[Shop] ${interaction.user.tag} bought ${item.name} for ${item.price}`);
}

async function handleAdd(interaction: ChatInputCommandInteraction) {
    // Check permissions
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
            embeds: [errorEmbed('Sem Permissão', 'Você precisa da permissão **Gerenciar Servidor**.')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const name = interaction.options.getString('nome', true);
    const price = interaction.options.getInteger('preco', true);
    const type = interaction.options.getString('tipo', true);
    const role = interaction.options.getRole('cargo');
    const description = interaction.options.getString('descricao');
    const emoji = interaction.options.getString('emoji');

    // Validate role type
    if (type === 'role' && !role) {
        await interaction.reply({
            embeds: [errorEmbed('Erro', 'Você precisa especificar um cargo para itens do tipo "role".')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const item = await prisma.shopItem.create({
        data: {
            guildId: interaction.guild!.id,
            name,
            description,
            price,
            itemType: type,
            roleId: role?.id,
            emoji,
        },
    });

    await interaction.reply({
        embeds: [
            successEmbed(
                'Item Adicionado!',
                `**${emoji || '📦'} ${name}** foi adicionado à loja!\n\n` +
                `ID: **${item.id}**\n` +
                `Preço: **${price}** moedas\n` +
                `Tipo: **${type}**`
            ),
        ],
    });

    logger.info(`[Shop] Added item ${name} (${item.id}) to ${interaction.guild!.name}`);
}

async function handleRemove(interaction: ChatInputCommandInteraction) {
    // Check permissions
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
            embeds: [errorEmbed('Sem Permissão', 'Você precisa da permissão **Gerenciar Servidor**.')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const itemId = interaction.options.getInteger('item', true);

    const item = await prisma.shopItem.findFirst({
        where: {
            id: itemId,
            guildId: interaction.guild!.id,
        },
    });

    if (!item) {
        await interaction.reply({
            embeds: [errorEmbed('Item Não Encontrado', 'Este item não existe na loja.')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await prisma.shopItem.delete({
        where: { id: item.id },
    });

    await interaction.reply({
        embeds: [successEmbed('Item Removido', `**${item.name}** foi removido da loja.`)],
    });

    logger.info(`[Shop] Removed item ${item.name} (${item.id}) from ${interaction.guild!.name}`);
}

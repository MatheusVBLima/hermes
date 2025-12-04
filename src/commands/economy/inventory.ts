import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { prisma } from '../../services/database.js';
import { infoEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('Ver seu inventário de itens')
    .addUserOption(option =>
        option
            .setName('usuario')
            .setDescription('Ver inventário de outro usuário (opcional)')
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply({
            content: 'Este comando só pode ser usado em servidores.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const targetUser = interaction.options.getUser('usuario') || interaction.user;

    // Get user economy (to include in inventory view)
    const userEconomy = await prisma.userEconomy.findUnique({
        where: {
            userId_guildId: {
                userId: targetUser.id,
                guildId: interaction.guild.id,
            },
        },
    });

    // Get inventory items
    const inventory = await prisma.userInventory.findMany({
        where: {
            userId: targetUser.id,
            guildId: interaction.guild.id,
        },
        orderBy: { acquiredAt: 'desc' },
    });

    const balance = userEconomy?.balance || 0;

    if (inventory.length === 0) {
        const embed = infoEmbed(`📦 Inventário de ${targetUser.username}`)
            .setDescription(
                `${targetUser.id === interaction.user.id ? 'Você não tem' : targetUser.username + ' não tem'} nenhum item no inventário.`
            )
            .addFields({
                name: '💰 Saldo',
                value: `${balance} moedas`,
            })
            .setThumbnail(targetUser.displayAvatarURL({ size: 128 }));

        await interaction.reply({ embeds: [embed] });
        return;
    }

    const itemList = inventory.map((item, index) => {
        const quantity = item.quantity > 1 ? ` x${item.quantity}` : '';
        return `${index + 1}. **${item.itemName}**${quantity}`;
    }).join('\n');

    const embed = infoEmbed(`📦 Inventário de ${targetUser.username}`)
        .setDescription(itemList)
        .addFields(
            {
                name: '💰 Saldo',
                value: `${balance} moedas`,
                inline: true,
            },
            {
                name: '📦 Total de Itens',
                value: inventory.reduce((sum, item) => sum + item.quantity, 0).toString(),
                inline: true,
            }
        )
        .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
        .setFooter({ text: `Total de ${inventory.length} tipo(s) de item` });

    await interaction.reply({ embeds: [embed] });
}

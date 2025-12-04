import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { prisma } from '../../services/database.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

const SLOT_SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣'];
const SLOT_PAYOUTS = {
    '💎💎💎': 10, // x10
    '7️⃣7️⃣7️⃣': 7,  // x7
    '🍇🍇🍇': 5,  // x5
    '🍊🍊🍊': 4,  // x4
    '🍋🍋🍋': 3,  // x3
    '🍒🍒🍒': 2,  // x2
};

export const data = new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Jogar na máquina caça-níqueis')
    .addIntegerOption(option =>
        option
            .setName('aposta')
            .setDescription('Quantia para apostar')
            .setMinValue(10)
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply({
            embeds: [errorEmbed('Erro', 'Este comando só pode ser usado em servidores.')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const bet = interaction.options.getInteger('aposta', true);

    // Get or create user economy
    let userEconomy = await prisma.userEconomy.findUnique({
        where: {
            userId_guildId: {
                userId: interaction.user.id,
                guildId: interaction.guild.id,
            },
        },
    });

    if (!userEconomy) {
        userEconomy = await prisma.userEconomy.create({
            data: {
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                balance: 0,
            },
        });
    }

    // Check if user has enough balance
    if (userEconomy.balance < bet) {
        await interaction.reply({
            embeds: [
                errorEmbed(
                    'Saldo Insuficiente',
                    `Você não tem moedas suficientes!\n\nSaldo: **${userEconomy.balance}** moedas\nAposta: **${bet}** moedas`
                ),
            ],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // Spin the slots
    const slots = [
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
    ];

    const result = slots.join('');
    const payout = SLOT_PAYOUTS[result as keyof typeof SLOT_PAYOUTS];

    let winAmount = 0;
    let message = '';
    let color = 0;

    if (payout) {
        // Win!
        winAmount = bet * payout;
        await prisma.userEconomy.update({
            where: { id: userEconomy.id },
            data: { balance: userEconomy.balance - bet + winAmount },
        });

        message = `🎰 **SLOTS** 🎰\n\n` +
                  `╔═══════════╗\n` +
                  `║  ${slots.join(' │ ')}  ║\n` +
                  `╚═══════════╝\n\n` +
                  `🎉 **VOCÊ GANHOU!** 🎉\n\n` +
                  `Multiplicador: **x${payout}**\n` +
                  `Ganhos: **+${winAmount - bet}** moedas\n\n` +
                  `Novo saldo: **${userEconomy.balance - bet + winAmount}** moedas`;
        color = 0x57F287;

        logger.info(`[Slots] ${interaction.user.tag} won ${winAmount - bet} (bet: ${bet})`);
    } else if (slots[0] === slots[1] || slots[1] === slots[2] || slots[0] === slots[2]) {
        // Partial match - return half bet
        const refund = Math.floor(bet / 2);
        await prisma.userEconomy.update({
            where: { id: userEconomy.id },
            data: { balance: userEconomy.balance - bet + refund },
        });

        message = `🎰 **SLOTS** 🎰\n\n` +
                  `╔═══════════╗\n` +
                  `║  ${slots.join(' │ ')}  ║\n` +
                  `╚═══════════╝\n\n` +
                  `😐 **QUASE!**\n\n` +
                  `Você recuperou metade da aposta!\n` +
                  `Perdeu: **-${bet - refund}** moedas\n\n` +
                  `Novo saldo: **${userEconomy.balance - bet + refund}** moedas`;
        color = 0xFEE75C;

        logger.info(`[Slots] ${interaction.user.tag} partial match, lost ${bet - refund} (bet: ${bet})`);
    } else {
        // Loss
        await prisma.userEconomy.update({
            where: { id: userEconomy.id },
            data: { balance: userEconomy.balance - bet },
        });

        message = `🎰 **SLOTS** 🎰\n\n` +
                  `╔═══════════╗\n` +
                  `║  ${slots.join(' │ ')}  ║\n` +
                  `╚═══════════╝\n\n` +
                  `😢 **VOCÊ PERDEU!**\n\n` +
                  `Perdeu: **-${bet}** moedas\n\n` +
                  `Novo saldo: **${userEconomy.balance - bet}** moedas`;
        color = 0xED4245;

        logger.info(`[Slots] ${interaction.user.tag} lost ${bet}`);
    }

    await interaction.reply({
        embeds: [
            infoEmbed('🎰 Caça-Níqueis')
                .setDescription(message)
                .setColor(color)
                .setFooter({ text: 'Boa sorte na próxima!' }),
        ],
    });
}

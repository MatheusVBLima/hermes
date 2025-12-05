import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} from 'discord.js';
import { prisma } from '../../services/database.js';
import { errorEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

const CARD_SUITS = ['♠️', '♥️', '♣️', '♦️'];
const CARD_VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Store active blackjack games
const activeGames = new Map<string, {
    userId: string;
    guildId: string;
    bet: number;
    playerHand: string[];
    dealerHand: string[];
    deck: string[];
}>();

export const data = new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('Jogar Blackjack (21)')
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
            ephemeral: true,
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
            ephemeral: true,
        });
        return;
    }

    // Create deck
    const deck = createDeck();
    shuffleDeck(deck);

    // Deal initial cards
    const playerHand = [deck.pop()!, deck.pop()!];
    const dealerHand = [deck.pop()!, deck.pop()!];

    // Store game
    activeGames.set(interaction.user.id, {
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        bet,
        playerHand,
        dealerHand,
        deck,
    });

    // Check for immediate blackjack
    const playerValue = calculateHandValue(playerHand);
    if (playerValue === 21) {
        await handleGameEnd(interaction, true, true); // Blackjack win
        return;
    }

    // Show game state
    await showGameState(interaction, false);
}

function createDeck(): string[] {
    const deck: string[] = [];
    for (const suit of CARD_SUITS) {
        for (const value of CARD_VALUES) {
            deck.push(`${value}${suit}`);
        }
    }
    return deck;
}

function shuffleDeck(deck: string[]): void {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function calculateHandValue(hand: string[]): number {
    let value = 0;
    let aces = 0;

    for (const card of hand) {
        const rank = card.slice(0, -2);
        if (rank === 'A') {
            aces++;
            value += 11;
        } else if (['J', 'Q', 'K'].includes(rank)) {
            value += 10;
        } else {
            value += parseInt(rank);
        }
    }

    // Adjust for aces
    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }

    return value;
}

async function showGameState(interaction: any, gameOver: boolean): Promise<void> {
    const game = activeGames.get(interaction.user.id);
    if (!game) return;

    const playerValue = calculateHandValue(game.playerHand);
    const dealerValue = calculateHandValue(game.dealerHand);

    // Show dealer's first card hidden if game not over
    const dealerDisplay = gameOver
        ? `${game.dealerHand.join(' ')} (${dealerValue})`
        : `${game.dealerHand[0]} 🂠 (??)`;

    const embed = new EmbedBuilder()
        .setTitle('🃏 Blackjack')
        .setColor(0x5865F2)
        .addFields(
            {
                name: '🎩 Dealer',
                value: dealerDisplay,
            },
            {
                name: `👤 ${interaction.user.username}`,
                value: `${game.playerHand.join(' ')} (${playerValue})`,
            },
            {
                name: '💰 Aposta',
                value: `${game.bet} moedas`,
                inline: true,
            }
        );

    if (!gameOver) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('blackjack_hit')
                .setLabel('🎯 Hit (Pegar)')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('blackjack_stand')
                .setLabel('✋ Stand (Parar)')
                .setStyle(ButtonStyle.Success)
        );

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ embeds: [embed], components: [row] });
        } else {
            await interaction.reply({ embeds: [embed], components: [row] });
        }
    } else {
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ embeds: [embed], components: [] });
        } else {
            await interaction.reply({ embeds: [embed], components: [] });
        }
    }
}

async function handleGameEnd(interaction: any, playerWin: boolean, blackjack: boolean = false): Promise<void> {
    const game = activeGames.get(interaction.user.id);
    if (!game) return;

    const playerValue = calculateHandValue(game.playerHand);
    const dealerValue = calculateHandValue(game.dealerHand);

    let winnings = 0;
    let message = '';

    if (playerWin) {
        winnings = blackjack ? Math.floor(game.bet * 2.5) : game.bet * 2;
        message = blackjack ? '🎉 **BLACKJACK!** 🎉' : '✅ **VOCÊ GANHOU!**';
    } else if (playerValue === dealerValue) {
        winnings = game.bet;
        message = '🤝 **EMPATE!**';
    } else {
        message = '❌ **VOCÊ PERDEU!**';
    }

    // Update balance
    const userEconomy = await prisma.userEconomy.findUnique({
        where: {
            userId_guildId: {
                userId: game.userId,
                guildId: game.guildId,
            },
        },
    });

    if (userEconomy) {
        await prisma.userEconomy.update({
            where: { id: userEconomy.id },
            data: { balance: userEconomy.balance - game.bet + winnings },
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('🃏 Blackjack - Resultado')
        .setColor(playerWin ? 0x57F287 : playerValue === dealerValue ? 0xFEE75C : 0xED4245)
        .setDescription(message)
        .addFields(
            {
                name: '🎩 Dealer',
                value: `${game.dealerHand.join(' ')} (${dealerValue})`,
            },
            {
                name: `👤 ${interaction.user.username}`,
                value: `${game.playerHand.join(' ')} (${playerValue})`,
            },
            {
                name: '💰 Resultado',
                value: winnings > game.bet
                    ? `Ganhou: **+${winnings - game.bet}** moedas\nNovo saldo: **${userEconomy!.balance - game.bet + winnings}** moedas`
                    : winnings === game.bet
                    ? `Recuperou a aposta\nSaldo: **${userEconomy!.balance}** moedas`
                    : `Perdeu: **-${game.bet}** moedas\nNovo saldo: **${userEconomy!.balance - game.bet}** moedas`,
            }
        );

    activeGames.delete(interaction.user.id);

    if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ embeds: [embed], components: [] });
    } else {
        await interaction.reply({ embeds: [embed], components: [] });
    }

    logger.info(`[Blackjack] ${interaction.user.tag} ${playerWin ? 'won' : 'lost'} ${Math.abs(winnings - game.bet)}`);
}

// Export handlers for button interactions
export async function handleBlackjackHit(interaction: any): Promise<void> {
    const game = activeGames.get(interaction.user.id);
    if (!game) {
        await interaction.reply({
            content: 'Você não tem um jogo ativo de Blackjack!',
            ephemeral: true,
        });
        return;
    }

    await interaction.deferUpdate();

    // Deal card
    game.playerHand.push(game.deck.pop()!);
    const playerValue = calculateHandValue(game.playerHand);

    if (playerValue > 21) {
        // Bust
        await handleGameEnd(interaction, false);
    } else if (playerValue === 21) {
        // Auto stand on 21
        await handleBlackjackStand(interaction);
    } else {
        await showGameState(interaction, false);
    }
}

export async function handleBlackjackStand(interaction: any): Promise<void> {
    const game = activeGames.get(interaction.user.id);
    if (!game) {
        await interaction.reply({
            content: 'Você não tem um jogo ativo de Blackjack!',
            ephemeral: true,
        });
        return;
    }

    if (!interaction.deferred) {
        await interaction.deferUpdate();
    }

    // Dealer draws until 17 or higher
    let dealerValue = calculateHandValue(game.dealerHand);
    while (dealerValue < 17) {
        game.dealerHand.push(game.deck.pop()!);
        dealerValue = calculateHandValue(game.dealerHand);
    }

    const playerValue = calculateHandValue(game.playerHand);

    // Determine winner
    if (dealerValue > 21 || playerValue > dealerValue) {
        await handleGameEnd(interaction, true);
    } else if (playerValue === dealerValue) {
        await handleGameEnd(interaction, false); // Push/tie
    } else {
        await handleGameEnd(interaction, false);
    }
}

export { activeGames };

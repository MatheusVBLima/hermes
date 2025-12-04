import { Events, Interaction, ChatInputCommandInteraction, MessageFlags, ButtonInteraction, EmbedBuilder, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { logger } from '../utils/logger.js';
import { errorEmbed } from '../utils/embeds.js';
import { prisma } from '../services/database.js';
import { handlePollVote, handlePollEnd } from '../commands/fun/poll.js';
import { handleBlackjackHit, handleBlackjackStand } from '../commands/economy/blackjack.js';

export const name = Events.InteractionCreate;
export const once = false;

export async function execute(interaction: Interaction): Promise<void> {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
        await handleChatInputCommand(interaction);
    }

    // Handle autocomplete (for future features)
    if (interaction.isAutocomplete()) {
        // Will be implemented when needed
    }

    // Handle buttons
    if (interaction.isButton()) {
        await handleButton(interaction);
    }

    // Handle select menus (for future features)
    if (interaction.isStringSelectMenu()) {
        // Will be implemented when needed
    }
}

/**
 * Handles chat input (slash) commands
 */
async function handleChatInputCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const command = interaction.client.commands?.get(interaction.commandName);

    if (!command) {
        logger.warn(`Command not found: ${interaction.commandName}`);
        await interaction.reply({
            embeds: [errorEmbed('Command Not Found', 'This command does not exist or has been removed.')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    try {
        // Log command execution
        const user = `${interaction.user.tag} (${interaction.user.id})`;
        const guild = interaction.guild ? `${interaction.guild.name} (${interaction.guild.id})` : undefined;
        logger.command(user, interaction.commandName, guild);

        // Execute command
        await command.execute(interaction);
    } catch (error) {
        logger.error(`Error executing command ${interaction.commandName}:`, error);

        // Send error message to user
        const errorMessage = {
            embeds: [
                errorEmbed(
                    'Command Error',
                    'There was an error executing this command. Please try again later.'
                ),
            ],
            flags: MessageFlags.Ephemeral,
        };

        // Reply or follow up depending on interaction state
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
}

/**
 * Handles button interactions
 */
async function handleButton(interaction: ButtonInteraction): Promise<void> {
    try {
        // Giveaway enter button
        if (interaction.customId === 'giveaway_enter') {
            await handleGiveawayEnter(interaction);
            return;
        }

        // Poll vote buttons
        if (interaction.customId.startsWith('poll_vote_')) {
            const optionIndex = parseInt(interaction.customId.split('_')[2]);
            await handlePollVote(interaction, optionIndex);
            return;
        }

        // Poll end button
        if (interaction.customId === 'poll_end') {
            await handlePollEnd(interaction);
            return;
        }

        // Blackjack buttons
        if (interaction.customId === 'blackjack_hit') {
            await handleBlackjackHit(interaction);
            return;
        }

        if (interaction.customId === 'blackjack_stand') {
            await handleBlackjackStand(interaction);
            return;
        }
    } catch (error) {
        logger.error('Error handling button interaction:', error);
        await interaction.reply({
            embeds: [errorEmbed('Erro', 'Ocorreu um erro ao processar sua ação.')],
            flags: MessageFlags.Ephemeral,
        }).catch(() => {});
    }
}

/**
 * Handle giveaway participation
 */
async function handleGiveawayEnter(interaction: ButtonInteraction): Promise<void> {
    const messageId = interaction.message.id;

    const giveaway = await prisma.giveaway.findUnique({
        where: { messageId },
    });

    if (!giveaway) {
        await interaction.reply({
            content: 'Este sorteio não existe mais.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // Check if giveaway has ended
    if (giveaway.ended || new Date() > giveaway.endsAt) {
        // End the giveaway if it hasn't been ended yet
        if (!giveaway.ended) {
            await endGiveawayNow(interaction, giveaway);
        } else {
            await interaction.reply({
                content: 'Este sorteio já foi encerrado!',
                flags: MessageFlags.Ephemeral,
            });
        }
        return;
    }

    // Add reaction to track participation
    try {
        await interaction.message.react('🎉');
    } catch {}

    // Check if user already reacted
    const reaction = interaction.message.reactions.cache.find(r => r.emoji.name === '🎉');
    const users = reaction ? await reaction.users.fetch() : new Map();

    if (users.has(interaction.user.id)) {
        await interaction.reply({
            content: '✅ Você já está participando deste sorteio!',
            flags: MessageFlags.Ephemeral,
        });
    } else {
        // Add user reaction
        await interaction.message.react('🎉');
        await interaction.reply({
            content: '🎉 Você entrou no sorteio! Boa sorte!',
            flags: MessageFlags.Ephemeral,
        });
    }
}

/**
 * End a giveaway and pick winners
 */
async function endGiveawayNow(interaction: ButtonInteraction, giveaway: any): Promise<void> {
    // Get participants from reactions
    const reaction = interaction.message.reactions.cache.find(r => r.emoji.name === '🎉');
    const users = reaction ? await reaction.users.fetch() : new Map();
    const participants = users.filter(u => !u.bot).map(u => u.id);

    // Mark as ended
    await prisma.giveaway.update({
        where: { messageId: giveaway.messageId },
        data: { ended: true },
    });

    // Update the embed
    const oldEmbed = interaction.message.embeds[0];
    const endedEmbed = EmbedBuilder.from(oldEmbed)
        .setTitle('🎉 SORTEIO ENCERRADO 🎉')
        .setColor(0x95A5A6)
        .setFooter({ text: 'Sorteio encerrado' });

    // Disable button
    const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('giveaway_enter')
            .setLabel('🎉 Encerrado')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
    );

    await interaction.message.edit({ embeds: [endedEmbed], components: [disabledRow] });

    if (participants.length === 0) {
        await interaction.reply({
            content: '😢 Ninguém participou do sorteio!',
        });
        return;
    }

    // Select winners
    const shuffled = participants.sort(() => 0.5 - Math.random());
    const winners = shuffled.slice(0, giveaway.winners);

    // Save winners
    await prisma.giveaway.update({
        where: { messageId: giveaway.messageId },
        data: { winnerIds: JSON.stringify(winners) },
    });

    // Announce winners
    const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
    await interaction.reply({
        content: `🎉 **PARABÉNS!** 🎉\n\n${winnerMentions} ${winners.length === 1 ? 'ganhou' : 'ganharam'} **${giveaway.prize}**!`,
    });

    logger.info(`[Giveaway] Ended giveaway ${giveaway.messageId}, winners: ${winners.join(', ')}`);
}

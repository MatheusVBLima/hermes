import {
    MessageReaction,
    User,
    PartialMessageReaction,
    PartialUser,
    TextChannel,
    EmbedBuilder,
} from 'discord.js';
import { prisma } from './database.js';
import { logger } from '../utils/logger.js';

export class StarboardService {
    /**
     * Handle when a reaction is added
     */
    static async handleReactionAdd(
        reaction: MessageReaction | PartialMessageReaction,
        user: User | PartialUser
    ): Promise<void> {
        try {
            // Fetch partial data
            if (reaction.partial) {
                await reaction.fetch();
            }
            if (user.partial) {
                await user.fetch();
            }

            const message = reaction.message;
            if (!message.guild) return;

            // Get starboard config
            const starboard = await prisma.starboard.findUnique({
                where: { guildId: message.guild.id },
            });

            if (!starboard?.enabled || !starboard.channelId) return;

            // Check if it's the right emoji
            const emojiIdentifier = reaction.emoji.id || reaction.emoji.name;
            if (emojiIdentifier !== starboard.emoji) return;

            // Check self-starring
            if (!starboard.selfStar && message.author?.id === user.id) {
                // Remove the reaction
                await reaction.users.remove(user.id);
                return;
            }

            // Get current star count
            const starCount = reaction.count || 0;

            // Check if message is already starred
            let starredMessage = await prisma.starredMessage.findUnique({
                where: { messageId: message.id },
            });

            if (starCount >= starboard.threshold) {
                if (!starredMessage) {
                    // Create new starred message
                    starredMessage = await this.createStarredMessage(reaction, starboard);
                } else {
                    // Update existing
                    await this.updateStarredMessage(starredMessage, starCount);
                }
            }
        } catch (error) {
            logger.error('[Starboard] Error handling reaction add:', error);
        }
    }

    /**
     * Handle when a reaction is removed
     */
    static async handleReactionRemove(
        reaction: MessageReaction | PartialMessageReaction,
        user: User | PartialUser
    ): Promise<void> {
        try {
            // Fetch partial data
            if (reaction.partial) {
                await reaction.fetch();
            }

            const message = reaction.message;
            if (!message.guild) return;

            // Get starboard config
            const starboard = await prisma.starboard.findUnique({
                where: { guildId: message.guild.id },
            });

            if (!starboard?.enabled || !starboard.channelId) return;

            // Check if it's the right emoji
            const emojiIdentifier = reaction.emoji.id || reaction.emoji.name;
            if (emojiIdentifier !== starboard.emoji) return;

            // Get starred message
            const starredMessage = await prisma.starredMessage.findUnique({
                where: { messageId: message.id },
            });

            if (!starredMessage) return;

            const starCount = reaction.count || 0;

            if (starCount < starboard.threshold) {
                // Remove from starboard
                await this.removeStarredMessage(starredMessage, message.guild.id);
            } else {
                // Update star count
                await this.updateStarredMessage(starredMessage, starCount);
            }
        } catch (error) {
            logger.error('[Starboard] Error handling reaction remove:', error);
        }
    }

    /**
     * Create a new starred message
     */
    private static async createStarredMessage(
        reaction: MessageReaction | PartialMessageReaction,
        starboard: any
    ): Promise<any> {
        const message = reaction.message;
        const guild = message.guild!;

        try {
            // Get starboard channel
            const starboardChannel = guild.channels.cache.get(starboard.channelId) as TextChannel;
            if (!starboardChannel) {
                logger.warn(`[Starboard] Channel ${starboard.channelId} not found`);
                return null;
            }

            // Build embed
            const embed = await this.buildStarboardEmbed(message, reaction.count || 0, starboard.emoji);

            // Send to starboard
            const starboardMsg = await starboardChannel.send({ embeds: [embed] });

            // Store in database
            const attachments = message.attachments.size > 0
                ? JSON.stringify(Array.from(message.attachments.values()).map(a => a.url))
                : null;

            const starredMessage = await prisma.starredMessage.create({
                data: {
                    guildId: guild.id,
                    channelId: message.channel.id,
                    messageId: message.id,
                    starboardMsgId: starboardMsg.id,
                    authorId: message.author?.id || 'unknown',
                    stars: reaction.count || 0,
                    content: message.content || null,
                    attachments,
                },
            });

            logger.info(`[Starboard] Created starred message ${message.id} with ${reaction.count} stars`);

            return starredMessage;
        } catch (error) {
            logger.error('[Starboard] Error creating starred message:', error);
            return null;
        }
    }

    /**
     * Update an existing starred message
     */
    private static async updateStarredMessage(starredMessage: any, newStarCount: number): Promise<void> {
        try {
            // Update database
            await prisma.starredMessage.update({
                where: { id: starredMessage.id },
                data: { stars: newStarCount },
            });

            // Update starboard message if it exists
            if (starredMessage.starboardMsgId) {
                const starboard = await prisma.starboard.findUnique({
                    where: { guildId: starredMessage.guildId },
                });

                if (!starboard?.channelId) return;

                const guild = await prisma.$queryRaw`SELECT * FROM Guild WHERE id = ${starredMessage.guildId}`;
                const channel = await (global as any).client?.channels.fetch(starboard.channelId) as TextChannel;

                if (channel) {
                    const starboardMsg = await channel.messages.fetch(starredMessage.starboardMsgId);
                    if (starboardMsg && starboardMsg.embeds[0]) {
                        const updatedEmbed = EmbedBuilder.from(starboardMsg.embeds[0])
                            .setFooter({ text: `${newStarCount} ${starboard.emoji} | ID: ${starredMessage.messageId}` });

                        await starboardMsg.edit({ embeds: [updatedEmbed] });
                    }
                }
            }

            logger.info(`[Starboard] Updated starred message ${starredMessage.messageId} to ${newStarCount} stars`);
        } catch (error) {
            logger.error('[Starboard] Error updating starred message:', error);
        }
    }

    /**
     * Remove a starred message
     */
    private static async removeStarredMessage(starredMessage: any, guildId: string): Promise<void> {
        try {
            // Delete from starboard channel
            if (starredMessage.starboardMsgId) {
                const starboard = await prisma.starboard.findUnique({
                    where: { guildId },
                });

                if (starboard?.channelId) {
                    const channel = await (global as any).client?.channels.fetch(starboard.channelId) as TextChannel;
                    if (channel) {
                        const starboardMsg = await channel.messages.fetch(starredMessage.starboardMsgId);
                        if (starboardMsg) {
                            await starboardMsg.delete();
                        }
                    }
                }
            }

            // Delete from database
            await prisma.starredMessage.delete({
                where: { id: starredMessage.id },
            });

            logger.info(`[Starboard] Removed starred message ${starredMessage.messageId}`);
        } catch (error) {
            logger.error('[Starboard] Error removing starred message:', error);
        }
    }

    /**
     * Build starboard embed
     */
    private static async buildStarboardEmbed(
        message: any,
        starCount: number,
        emoji: string
    ): Promise<EmbedBuilder> {
        const embed = new EmbedBuilder()
            .setAuthor({
                name: message.author?.tag || 'Unknown',
                iconURL: message.author?.displayAvatarURL(),
            })
            .setDescription(message.content || '*No content*')
            .setColor(0xFFAC33)
            .setTimestamp(message.createdAt)
            .setFooter({ text: `${starCount} ${emoji} | ID: ${message.id}` })
            .addFields({
                name: '🔗 Link',
                value: `[Ir para mensagem](${message.url})`,
            });

        // Add image if present
        const attachment = message.attachments.first();
        if (attachment && attachment.contentType?.startsWith('image/')) {
            embed.setImage(attachment.url);
        }

        return embed;
    }
}

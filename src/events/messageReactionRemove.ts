import { Events, MessageReaction, User, PartialMessageReaction, PartialUser } from 'discord.js';
import { prisma } from '../services/database.js';
import { logger } from '../utils/logger.js';
import { StarboardService } from '../services/StarboardService.js';

export const name = Events.MessageReactionRemove;
export const once = false;

export async function execute(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
) {
    // Ignore bot reactions
    if (user.bot) return;

    try {
        // Fetch partial reaction if needed
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                logger.error('[Reaction] Error fetching reaction:', error);
                return;
            }
        }

        // Handle Starboard
        await StarboardService.handleReactionRemove(reaction, user);

        // Handle Reaction Roles
        const emoji = reaction.emoji.id
            ? `<:${reaction.emoji.name}:${reaction.emoji.id}>`
            : reaction.emoji.name;

        if (!emoji) return;

        // Find reaction role in database
        const reactionRole = await prisma.reactionRole.findFirst({
            where: {
                messageId: reaction.message.id,
                OR: [
                    { emoji: emoji },
                    { emoji: reaction.emoji.name || '' },
                    { emoji: reaction.emoji.id || '' },
                ],
            },
        });

        if (!reactionRole) return;

        // Get the guild and member
        const guild = reaction.message.guild;
        if (!guild) return;

        const member = await guild.members.fetch(user.id).catch(() => null);
        if (!member) return;

        // Get the role
        const role = guild.roles.cache.get(reactionRole.roleId);
        if (!role) {
            logger.warn(`[ReactionRole] Role ${reactionRole.roleId} not found in guild ${guild.id}`);
            return;
        }

        // Check if member has the role
        if (!member.roles.cache.has(role.id)) {
            return;
        }

        // Remove the role
        try {
            await member.roles.remove(role, 'Reaction Role');
            logger.info(`[ReactionRole] Removed role ${role.name} from ${user.tag} in ${guild.name}`);
        } catch (error) {
            logger.error(`[ReactionRole] Failed to remove role ${role.name} from ${user.tag}:`, error);
        }
    } catch (error) {
        logger.error('[Reaction] Error handling reaction remove:', error);
    }
}

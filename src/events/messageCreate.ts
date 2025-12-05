import { Events, Message } from 'discord.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../services/database.js';
import { ensureGuild } from '../services/database.js';
import { processMessage } from '../services/automod/AutoModService.js';

export const name = Events.MessageCreate;
export const once = false;

// XP Configuration
const XP_MIN = 15;
const XP_MAX = 25;
const XP_COOLDOWN = 60000; // 60 seconds in milliseconds

// Map to track last XP gain time per user per guild
const xpCooldowns = new Map<string, number>();

export async function execute(message: Message): Promise<void> {
    // Ignore DMs, bots, and system messages
    if (!message.guild || message.author.bot || message.system) return;

    try {
        // Process auto-moderation first
        const violated = await processMessage(message);
        if (violated) {
            // Message was deleted by auto-mod, don't give XP
            return;
        }

        // Get XP settings
        const xpSettings = await prisma.xPSettings.findUnique({
            where: { guildId: message.guild.id },
        });

        // Check if XP is enabled
        if (xpSettings && !xpSettings.xpEnabled) {
            return;
        }

        // Check if channel is ignored
        if (xpSettings?.ignoredChannels) {
            const ignoredChannels = JSON.parse(xpSettings.ignoredChannels);
            if (ignoredChannels.includes(message.channel.id)) {
                return;
            }
        }

        // Get XP configuration
        const xpMin = xpSettings?.xpMin ?? XP_MIN;
        const xpMax = xpSettings?.xpMax ?? XP_MAX;
        const xpCooldown = xpSettings?.xpCooldown ?? XP_COOLDOWN;

        // Check cooldown
        const cooldownKey = `${message.guild.id}-${message.author.id}`;
        const now = Date.now();
        const lastXpTime = xpCooldowns.get(cooldownKey) || 0;

        if (now - lastXpTime < xpCooldown) {
            return; // User is on cooldown
        }

        // Ensure guild exists
        await ensureGuild(message.guild.id, message.guild.name);

        // Calculate random XP
        const xpGain = Math.floor(Math.random() * (xpMax - xpMin + 1)) + xpMin;

        // Get or create user level data
        let userLevel = await prisma.userLevel.findUnique({
            where: {
                userId_guildId: {
                    userId: message.author.id,
                    guildId: message.guild.id,
                },
            },
        });

        const isNewUser = !userLevel;
        const oldLevel = userLevel?.level || 0;

        if (isNewUser) {
            // Create new user level record
            userLevel = await prisma.userLevel.create({
                data: {
                    userId: message.author.id,
                    guildId: message.guild.id,
                    xp: xpGain,
                    level: 0,
                    lastXpAt: new Date(),
                },
            });
        } else {
            // Update existing user
            const newXp = userLevel.xp + xpGain;
            const newLevel = calculateLevel(newXp);

            userLevel = await prisma.userLevel.update({
                where: {
                    userId_guildId: {
                        userId: message.author.id,
                        guildId: message.guild.id,
                    },
                },
                data: {
                    xp: newXp,
                    level: newLevel,
                    lastXpAt: new Date(),
                },
            });
        }

        // Update cooldown
        xpCooldowns.set(cooldownKey, now);

        // Check if user leveled up
        const newLevel = userLevel.level;
        if (!isNewUser && newLevel > oldLevel) {
            await handleLevelUp(message, newLevel, xpSettings);
        }

        logger.debug(`XP gained: ${message.author.tag} +${xpGain}XP (Level ${newLevel})`);

    } catch (error) {
        logger.error('Error handling messageCreate for XP:', error);
    }
}

/**
 * Calculate level based on XP
 * Formula: level = floor(0.1 * sqrt(xp))
 */
function calculateLevel(xp: number): number {
    return Math.floor(0.1 * Math.sqrt(xp));
}

/**
 * Calculate XP required for a specific level
 */
export function xpForLevel(level: number): number {
    return Math.pow(level * 10, 2);
}

/**
 * Handle level up event
 */
async function handleLevelUp(message: Message, newLevel: number, xpSettings: any): Promise<void> {
    try {
        // Check for level roles
        const levelRole = await prisma.levelRole.findUnique({
            where: {
                guildId_level: {
                    guildId: message.guild!.id,
                    level: newLevel,
                },
            },
        });

        // Give role if configured
        if (levelRole) {
            const member = message.member;
            const role = message.guild!.roles.cache.get(levelRole.roleId);

            if (member && role) {
                try {
                    await member.roles.add(role, `Reached level ${newLevel}`);
                    logger.info(`[LevelRole] Gave role ${role.name} to ${message.author.tag} for reaching level ${newLevel}`);
                } catch (error) {
                    logger.error(`[LevelRole] Failed to give role ${role.name} to ${message.author.tag}:`, error);
                }
            }
        }

        // Send level up message if enabled
        const showMessage = xpSettings?.levelUpMessage ?? true;
        if (showMessage && 'send' in message.channel) {
            const roleMessage = levelRole ? `\n🎖️ You received the ${message.guild!.roles.cache.get(levelRole.roleId)} role!` : '';
            await message.channel.send({
                content: `🎉 Congratulations ${message.author}! You've reached **Level ${newLevel}**!${roleMessage}`,
            });
        }

        logger.info(`Level up: ${message.author.tag} reached level ${newLevel} in ${message.guild?.name}`);

    } catch (error) {
        logger.error('Error sending level up message:', error);
    }
}

import { EmbedBuilder, ColorResolvable } from 'discord.js';

/**
 * Embed Utility
 * Provides reusable embed builders for consistent bot responses
 */

// Color palette for embeds
export const EmbedColors = {
    SUCCESS: 0x00ff00,  // Green
    ERROR: 0xff0000,    // Red
    WARNING: 0xffaa00,  // Orange
    INFO: 0x3498db,     // Blue
    DEFAULT: 0x5865f2,  // Discord Blurple
    MODERATION: 0xe74c3c, // Red for moderation actions
    ECONOMY: 0xf1c40f,  // Gold for economy
    FUN: 0x9b59b6,      // Purple for fun commands
} as const;

/**
 * Creates a basic embed with default styling
 */
export function createEmbed(options?: {
    title?: string;
    description?: string;
    color?: ColorResolvable;
    timestamp?: boolean;
}): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(options?.color ?? EmbedColors.DEFAULT);

    if (options?.title) {
        embed.setTitle(options.title);
    }

    if (options?.description) {
        embed.setDescription(options.description);
    }

    if (options?.timestamp) {
        embed.setTimestamp();
    }

    return embed;
}

/**
 * Creates a success embed (green)
 */
export function successEmbed(title: string, description?: string): EmbedBuilder {
    return createEmbed({
        title: `✅ ${title}`,
        description,
        color: EmbedColors.SUCCESS,
        timestamp: true,
    });
}

/**
 * Creates an error embed (red)
 */
export function errorEmbed(title: string, description?: string): EmbedBuilder {
    return createEmbed({
        title: `❌ ${title}`,
        description,
        color: EmbedColors.ERROR,
        timestamp: true,
    });
}

/**
 * Creates a warning embed (orange)
 */
export function warningEmbed(title: string, description?: string): EmbedBuilder {
    return createEmbed({
        title: `⚠️ ${title}`,
        description,
        color: EmbedColors.WARNING,
        timestamp: true,
    });
}

/**
 * Creates an info embed (blue)
 */
export function infoEmbed(title: string, description?: string): EmbedBuilder {
    return createEmbed({
        title: `ℹ️ ${title}`,
        description,
        color: EmbedColors.INFO,
        timestamp: true,
    });
}

/**
 * Creates a loading embed
 */
export function loadingEmbed(message: string = 'Loading...'): EmbedBuilder {
    return createEmbed({
        description: `⏳ ${message}`,
        color: EmbedColors.INFO,
    });
}

/**
 * Creates a moderation action embed
 */
export function moderationEmbed(action: string, options?: {
    user?: string;
    moderator?: string;
    reason?: string;
    duration?: string;
}): EmbedBuilder {
    const embed = createEmbed({
        title: `🔨 ${action}`,
        color: EmbedColors.MODERATION,
        timestamp: true,
    });

    if (options?.user) {
        embed.addFields({ name: 'User', value: options.user, inline: true });
    }

    if (options?.moderator) {
        embed.addFields({ name: 'Moderator', value: options.moderator, inline: true });
    }

    if (options?.duration) {
        embed.addFields({ name: 'Duration', value: options.duration, inline: true });
    }

    if (options?.reason) {
        embed.addFields({ name: 'Reason', value: options.reason, inline: false });
    }

    return embed;
}

/**
 * Creates an economy embed
 */
export function economyEmbed(title: string, description?: string): EmbedBuilder {
    return createEmbed({
        title: `💰 ${title}`,
        description,
        color: EmbedColors.ECONOMY,
        timestamp: true,
    });
}

/**
 * Creates a fun/entertainment embed
 */
export function funEmbed(title?: string, description?: string): EmbedBuilder {
    return createEmbed({
        title: title ? `🎮 ${title}` : undefined,
        description,
        color: EmbedColors.FUN,
        timestamp: false,
    });
}

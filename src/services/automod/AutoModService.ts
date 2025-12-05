import { Message, GuildMember, TextChannel, EmbedBuilder } from 'discord.js';
import { prisma } from '../database.js';
import { logger } from '../../utils/logger.js';

// Cache for message tracking (anti-spam/flood)
const messageCache = new Map<string, { messages: Message[]; lastMessage: string; count: number }>();

// URL regex pattern
const URL_PATTERN = /https?:\/\/[^\s]+/gi;

export interface AutoModSettings {
    antiSpamEnabled: boolean;
    antiSpamThreshold: number;
    antiSpamInterval: number;
    antiSpamAction: string;
    antiFloodEnabled: boolean;
    antiFloodThreshold: number;
    antiFloodAction: string;
    antiLinkEnabled: boolean;
    antiLinkAction: string;
    allowedLinks: string[];
    badWordsEnabled: boolean;
    badWordsList: string[];
    badWordsAction: string;
    ignoredChannels: string[];
    ignoredRoles: string[];
}

export async function getAutoModSettings(guildId: string): Promise<AutoModSettings | null> {
    const settings = await prisma.autoMod.findUnique({
        where: { guildId },
    });

    if (!settings) return null;

    return {
        ...settings,
        allowedLinks: settings.allowedLinks ? JSON.parse(settings.allowedLinks) : [],
        badWordsList: settings.badWordsList ? JSON.parse(settings.badWordsList) : [],
        ignoredChannels: settings.ignoredChannels ? JSON.parse(settings.ignoredChannels) : [],
        ignoredRoles: settings.ignoredRoles ? JSON.parse(settings.ignoredRoles) : [],
    };
}

export async function processMessage(message: Message): Promise<boolean> {
    if (!message.guild || message.author.bot) return false;

    const settings = await getAutoModSettings(message.guild.id);
    if (!settings) return false;

    const member = message.member;
    if (!member) return false;

    // Check if channel or role is ignored
    if (settings.ignoredChannels.includes(message.channel.id)) return false;
    if (member.roles.cache.some(role => settings.ignoredRoles.includes(role.id))) return false;

    // Check if member has mod permissions (skip auto-mod)
    if (member.permissions.has('ManageMessages') || member.permissions.has('Administrator')) {
        return false;
    }

    // Process each auto-mod feature
    let violated = false;

    // Bad words check
    if (settings.badWordsEnabled && settings.badWordsList.length > 0) {
        const result = await checkBadWords(message, settings);
        if (result) violated = true;
    }

    // Anti-link check
    if (!violated && settings.antiLinkEnabled) {
        const result = await checkLinks(message, settings);
        if (result) violated = true;
    }

    // Anti-spam check
    if (!violated && settings.antiSpamEnabled) {
        const result = await checkSpam(message, settings);
        if (result) violated = true;
    }

    // Anti-flood check
    if (!violated && settings.antiFloodEnabled) {
        const result = await checkFlood(message, settings);
        if (result) violated = true;
    }

    return violated;
}

async function checkBadWords(message: Message, settings: AutoModSettings): Promise<boolean> {
    const content = message.content.toLowerCase();

    for (const word of settings.badWordsList) {
        if (content.includes(word.toLowerCase())) {
            logger.info(`[AutoMod] Bad word detected from ${message.author.tag}: "${word}"`);
            await takeAction(message, settings.badWordsAction, `Palavra proibida detectada`);
            return true;
        }
    }

    return false;
}

async function checkLinks(message: Message, settings: AutoModSettings): Promise<boolean> {
    const urls = message.content.match(URL_PATTERN);

    if (!urls || urls.length === 0) return false;

    // Check if any URL is not in allowed list
    for (const url of urls) {
        const isAllowed = settings.allowedLinks.some(domain => {
            try {
                const urlHost = new URL(url).hostname;
                return urlHost.includes(domain);
            } catch {
                return false;
            }
        });

        if (!isAllowed) {
            logger.info(`[AutoMod] Unauthorized link from ${message.author.tag}: ${url}`);
            await takeAction(message, settings.antiLinkAction, `Link não autorizado`);
            return true;
        }
    }

    return false;
}

async function checkSpam(message: Message, settings: AutoModSettings): Promise<boolean> {
    const key = `${message.guild!.id}-${message.author.id}`;
    const now = Date.now();

    let userData = messageCache.get(key);

    if (!userData) {
        userData = { messages: [], lastMessage: '', count: 0 };
        messageCache.set(key, userData);
    }

    // Clean old messages outside the interval
    userData.messages = userData.messages.filter(
        msg => now - msg.createdTimestamp < settings.antiSpamInterval
    );

    // Add current message
    userData.messages.push(message);

    // Check if threshold exceeded
    if (userData.messages.length >= settings.antiSpamThreshold) {
        logger.info(`[AutoMod] Spam detected from ${message.author.tag}: ${userData.messages.length} messages in ${settings.antiSpamInterval}ms`);

        // Delete all spam messages
        try {
            const channel = message.channel as TextChannel;
            await channel.bulkDelete(userData.messages.slice(0, 100));
        } catch (error) {
            logger.error('[AutoMod] Error deleting spam messages:', error);
        }

        await takeAction(message, settings.antiSpamAction, `Spam detectado (${userData.messages.length} mensagens)`);

        // Clear cache for this user
        userData.messages = [];
        return true;
    }

    return false;
}

async function checkFlood(message: Message, settings: AutoModSettings): Promise<boolean> {
    const key = `flood-${message.guild!.id}-${message.author.id}`;
    const content = message.content.toLowerCase().trim();

    let userData = messageCache.get(key);

    if (!userData) {
        userData = { messages: [], lastMessage: content, count: 1 };
        messageCache.set(key, userData);
        return false;
    }

    // Check if same message
    if (userData.lastMessage === content) {
        userData.count++;
        userData.messages.push(message);

        if (userData.count >= settings.antiFloodThreshold) {
            logger.info(`[AutoMod] Flood detected from ${message.author.tag}: same message ${userData.count} times`);

            // Delete flood messages
            try {
                const channel = message.channel as TextChannel;
                await channel.bulkDelete(userData.messages.slice(0, 100));
            } catch (error) {
                logger.error('[AutoMod] Error deleting flood messages:', error);
            }

            await takeAction(message, settings.antiFloodAction, `Flood detectado (mensagem repetida ${userData.count}x)`);

            // Reset
            userData.count = 0;
            userData.messages = [];
            userData.lastMessage = '';
            return true;
        }
    } else {
        // Different message, reset
        userData.lastMessage = content;
        userData.count = 1;
        userData.messages = [message];
    }

    return false;
}

async function takeAction(message: Message, action: string, reason: string): Promise<void> {
    const member = message.member;
    if (!member) return;

    try {
        switch (action) {
            case 'delete':
                if (true) {
                    await message.delete();
                }
                await sendWarning(message, reason);
                break;

            case 'warn':
                if (true) {
                    await message.delete();
                }
                await sendWarning(message, reason);
                // Could also log to database here
                break;

            case 'timeout':
                if (true) {
                    await message.delete();
                }
                await member.timeout(5 * 60 * 1000, `[AutoMod] ${reason}`); // 5 minute timeout
                await sendWarning(message, `${reason} - Você foi silenciado por 5 minutos.`);
                break;

            case 'kick':
                if (true) {
                    await message.delete();
                }
                await sendWarning(message, `${reason} - Você será expulso do servidor.`);
                await member.kick(`[AutoMod] ${reason}`);
                break;
        }
    } catch (error) {
        logger.error(`[AutoMod] Error taking action ${action}:`, error);
    }
}

async function sendWarning(message: Message, reason: string): Promise<void> {
    const embed = new EmbedBuilder()
        .setTitle('Auto-Moderação')
        .setDescription(`${message.author}, sua mensagem foi removida.\n**Motivo:** ${reason}`)
        .setColor(0xED4245)
        .setTimestamp();

    try {
        if ('send' in message.channel) {
            const warning = await message.channel.send({ embeds: [embed] });
            // Delete warning after 5 seconds
            setTimeout(() => warning.delete().catch(() => {}), 5000);
        }
    } catch (error) {
        logger.error('[AutoMod] Error sending warning:', error);
    }
}

// Cleanup old cache entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of messageCache.entries()) {
        if (data.messages.length === 0 || now - data.messages[data.messages.length - 1].createdTimestamp > 60000) {
            messageCache.delete(key);
        }
    }
}, 5 * 60 * 1000);

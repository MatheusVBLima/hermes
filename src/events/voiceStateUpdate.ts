import { Events, VoiceState } from 'discord.js';
import { logger } from '../utils/logger.js';
import { logVoiceUpdate } from '../services/LogService.js';

export const name = Events.VoiceStateUpdate;
export const once = false;

export async function execute(oldState: VoiceState, newState: VoiceState): Promise<void> {
    try {
        await logVoiceUpdate(oldState, newState);
    } catch (error) {
        logger.error('Error handling voiceStateUpdate event:', error);
    }
}

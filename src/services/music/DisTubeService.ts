import { DisTube } from 'distube';
import { YtDlpPlugin } from '@distube/yt-dlp';
import { Client } from 'discord.js';

let distube: DisTube | null = null;

export function initializeDistube(client: Client): DisTube {
    // Suppress Python warnings emitted by yt-dlp that break JSON parsing
    process.env.PYTHONWARNINGS = 'ignore';

    distube = new DisTube(client, {
        emitNewSongOnly: true,
        joinNewVoiceChannel: true,
        plugins: [
            new YtDlpPlugin({
                update: false, // Não atualizar automaticamente (mais rápido)
            }),
        ],
    });

    // Increase max listeners to avoid warnings when registering multiple initQueue listeners
    distube.setMaxListeners(20);

    return distube;
}

export function getDistube(): DisTube {
    if (!distube) {
        throw new Error('DisTube has not been initialized');
    }
    return distube;
}


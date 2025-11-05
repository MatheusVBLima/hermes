import {
    AudioPlayer,
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    entersState,
    joinVoiceChannel,
    VoiceConnection,
    VoiceConnectionStatus,
    StreamType,
} from '@discordjs/voice';
import { VoiceBasedChannel } from 'discord.js';
import playdl from 'play-dl';
import { logger } from '../../utils/logger.js';

export interface Song {
    title: string;
    url: string;
    duration: number;
    thumbnail: string;
    requestedBy: {
        id: string;
        username: string;
    };
}

export class MusicPlayer {
    public queue: Song[] = [];
    public currentSong: Song | null = null;
    public isPlaying: boolean = false;
    public isPaused: boolean = false;
    public volume: number = 50;

    private connection: VoiceConnection | null = null;
    private player: AudioPlayer;
    private guildId: string;

    constructor(guildId: string) {
        this.guildId = guildId;
        this.player = createAudioPlayer();

        // Player state change handlers
        this.player.on(AudioPlayerStatus.Idle, () => {
            this.playNext();
        });

        this.player.on('error', (error) => {
            logger.error(`Audio player error in guild ${this.guildId}:`, error);
            this.playNext();
        });
    }

    /**
     * Join a voice channel
     */
    public async join(channel: VoiceBasedChannel): Promise<void> {
        this.connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator as any,
        });

        // Subscribe the connection to the audio player
        this.connection.subscribe(this.player);

        // Wait for connection to be ready
        try {
            await entersState(this.connection, VoiceConnectionStatus.Ready, 30000);
            logger.info(`Joined voice channel in guild ${this.guildId}`);
        } catch (error) {
            logger.error(`Failed to join voice channel in guild ${this.guildId}:`, error);
            this.connection.destroy();
            throw error;
        }
    }

    /**
     * Add a song to the queue
     */
    public addSong(song: Song): void {
        this.queue.push(song);
    }

    /**
     * Play the next song in queue
     */
    private async playNext(): Promise<void> {
        if (this.queue.length === 0) {
            this.currentSong = null;
            this.isPlaying = false;
            this.isPaused = false;
            logger.info(`Queue finished in guild ${this.guildId}`);

            // Auto-disconnect after 5 minutes of inactivity
            setTimeout(() => {
                if (!this.isPlaying && this.connection) {
                    this.disconnect();
                }
            }, 5 * 60 * 1000);

            return;
        }

        this.currentSong = this.queue.shift()!;
        await this.playSong(this.currentSong);
    }

    /**
     * Play a specific song
     */
    private async playSong(song: Song): Promise<void> {
        try {
            const stream = await playdl.stream(song.url);

            const resource = createAudioResource(stream.stream, {
                inputType: stream.type,
            });

            this.player.play(resource);
            this.isPlaying = true;
            this.isPaused = false;

            logger.info(`Now playing: ${song.title} in guild ${this.guildId}`);
        } catch (error) {
            logger.error(`Failed to play song in guild ${this.guildId}:`, error);
            this.playNext();
        }
    }

    /**
     * Start playing the queue
     */
    public async play(): Promise<void> {
        if (this.isPlaying && !this.isPaused) {
            return;
        }

        if (this.isPaused) {
            this.resume();
            return;
        }

        await this.playNext();
    }

    /**
     * Pause playback
     */
    public pause(): boolean {
        if (!this.isPlaying || this.isPaused) {
            return false;
        }

        this.player.pause();
        this.isPaused = true;
        return true;
    }

    /**
     * Resume playback
     */
    public resume(): boolean {
        if (!this.isPaused) {
            return false;
        }

        this.player.unpause();
        this.isPaused = false;
        return true;
    }

    /**
     * Skip current song
     */
    public skip(): boolean {
        if (!this.isPlaying) {
            return false;
        }

        this.player.stop();
        return true;
    }

    /**
     * Stop playback and clear queue
     */
    public stop(): void {
        this.queue = [];
        this.currentSong = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.player.stop();
    }

    /**
     * Disconnect from voice channel
     */
    public disconnect(): void {
        this.stop();
        if (this.connection) {
            this.connection.destroy();
            this.connection = null;
        }
        logger.info(`Disconnected from voice channel in guild ${this.guildId}`);
    }

    /**
     * Check if connected to a voice channel
     */
    public isConnected(): boolean {
        return this.connection !== null;
    }
}

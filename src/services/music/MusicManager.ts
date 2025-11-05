import { MusicPlayer } from './MusicPlayer.js';

/**
 * Manages music players for all guilds
 */
class MusicManagerClass {
    private players: Map<string, MusicPlayer> = new Map();

    /**
     * Get or create a music player for a guild
     */
    public getPlayer(guildId: string): MusicPlayer {
        if (!this.players.has(guildId)) {
            this.players.set(guildId, new MusicPlayer(guildId));
        }

        return this.players.get(guildId)!;
    }

    /**
     * Remove a player for a guild
     */
    public removePlayer(guildId: string): void {
        const player = this.players.get(guildId);
        if (player) {
            player.disconnect();
            this.players.delete(guildId);
        }
    }

    /**
     * Check if a guild has an active player
     */
    public hasPlayer(guildId: string): boolean {
        return this.players.has(guildId);
    }
}

// Export singleton instance
export const MusicManager = new MusicManagerClass();

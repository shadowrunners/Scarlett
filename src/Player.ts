import { AudioPlayer, AudioPlayerStatus, AudioResource, VoiceConnection, createAudioPlayer, createAudioResource, joinVoiceChannel } from "@discordjs/voice";
import { Readable } from "stream";
import { Manager } from ".";
import Queue from "./Queue";

export class Player {
    private connection: VoiceConnection;
    private player: AudioPlayer;
    private audioResource: AudioResource;
    private scarlett: Manager;

    public isPlaying: boolean = false;
    public queue: Queue = new Queue();

    constructor(options: PlayerOptions, scarlett: Manager) {
        this.scarlett = scarlett;
        this.connection = joinVoiceChannel({
            channelId: options.channelId,
            guildId: options.guildId,
            adapterCreator: options.adapter,
            selfDeaf: options.selfDeaf,
        });

        this.player = createAudioPlayer();

        this.connection.subscribe(this.player);

        this.player.on('stateChange', (_oldState, newState) => {
            // Play the next track if the queue isn't empty and if the old state was "Buffering".
            if (_oldState.status === AudioPlayerStatus.Playing && newState.status === AudioPlayerStatus.Idle && this.queue.length) this.play();
        })
    }

    /** Plays the currently enqueued track. */
    public play() {
        if (!this.queue.length) return;
        if (this.player.state.status === AudioPlayerStatus.Buffering || this.player.state.status === AudioPlayerStatus.Paused) return;
        this.queue.current = this.queue.shift();

        this.audioResource = createAudioResource(this.queue.current.stream);
        
        this.player.play(this.audioResource);
        this.isPlaying = true;
    }

    /** Plays the previous track. */
    public playPrevious(): void {
        // TODO: Make it return a ReferenceError instead.
        if (this.queue.previous) return;

        if (this.queue.current) this.queue.unshift(this.queue.previous);
        this.play();

        this.queue.previous = null;

    }

    /** Pauses the player. */
    public pause(): boolean {
        if (this.player.state.status !== AudioPlayerStatus.Playing) return;
        return this.player.pause(true);
    }

    /** Resumes the player. */
    public resume(): boolean {
        if (this.player.state.status !== AudioPlayerStatus.Paused) return;
        return this.player.unpause();
    }

    /** Skips the currently playing track. */
    public skip() { 
        this.player.stop(true);
        this.play();
    }

    /** Destroys the player (connection). */
    public destroy(): void {
        return this.connection.destroy();
    }
}

export interface PlayerOptions {
    channelId: string;
    guildId: string;
    adapter: any;
    selfDeaf: boolean;
}
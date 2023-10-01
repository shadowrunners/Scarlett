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
    }

    /** Plays the currently enqueued track. */
    public play() {
        if (!this.queue.length) return;
        this.queue.current = this.queue.shift();

        this.audioResource = createAudioResource(this.queue.current.stream);

        console.log(this.queue);
        // Play the song only if the player isn't paused or is currently playing.
        if (this.player.state.status !== AudioPlayerStatus.Paused && this.player.state.status !== AudioPlayerStatus.Playing) 
            return this.player.play(this.audioResource);
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
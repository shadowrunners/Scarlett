import { AudioPlayer, AudioPlayerStatus, AudioResource, VoiceConnection, VoiceConnectionStatus, createAudioPlayer, createAudioResource, joinVoiceChannel } from "@discordjs/voice";
import { Manager } from ".";
import Queue from "./Queue";
import { DeezerUtils } from "./Utils/DeezerUtils";
import { SoundCloudUtils } from "./Utils/SoundCloudUtils";

/** This is Disrupt's Player class, it's where all the voice magic happens. */
export class Player {
    /** The voice player connection. */
    private connection: VoiceConnection;
    /** The player. */
    private player: AudioPlayer;
    /** The audio resource that will be played. */
    private audioResource: AudioResource;
    /** The manager of Disrupt. */
    private scarlett: Manager;

    /** Indicates if the player is playing anything or not. */
    public isPlaying: boolean = false;
    /** The player's queue. */
    public queue: Queue = new Queue();
    /** The now playing message. */
    public nowPlayingMessage: NowPlayingMessage;
    /** The text channel. */
    public textChannel: string;

    /** The Deezer Utilities class. Has all the decryption and fetching bells and whistles. */
    private deezerUtils: DeezerUtils;
    /** The SoundCloud Utilities class. Has all the decryption and fetching bells and whistles. */
    private scUtils: SoundCloudUtils;

    constructor(options: PlayerOptions, scarlett: Manager) {
        this.scarlett = scarlett;
        this.deezerUtils = new DeezerUtils(scarlett.options.sources.deezer.masterKey);
        this.scUtils = new SoundCloudUtils(scarlett.options.sources.soundcloud.clientId);
        this.connection = joinVoiceChannel({
            channelId: options.channelId,
            guildId: options.guildId,
            adapterCreator: options.adapter,
            selfDeaf: options.selfDeaf,
        });

        this.textChannel = options.textChannel;
        this.player = createAudioPlayer();

        this.connection.subscribe(this.player);

        this.connection.on('stateChange', (_oldState, newState) => {
            // Destroy the connection if the player is forcibly removed.
            if (newState.status === VoiceConnectionStatus.Disconnected) 
                return this.destroy();
        })

        this.player.on('stateChange', (_oldState, newState) => {
            // Play the next track if the queue isn't empty and if the old state was "Buffering".
            if (_oldState.status === AudioPlayerStatus.Playing && newState.status === AudioPlayerStatus.Idle && this.queue.length) {
                this.scarlett.emit('trackEnd', this, this.queue.current);
                return this.play();
            }
            if (newState.status === AudioPlayerStatus.Idle) {
                this.scarlett.emit('queueEnd', this);
                return this.isPlaying = false;
            }
        })
    }

    /** Plays the currently enqueued track. */
    public async play() {
        if (!this.queue.length) return;
        if (this.player.state.status === AudioPlayerStatus.Buffering || this.player.state.status === AudioPlayerStatus.Paused) return;
        this.queue.current = this.queue.shift();

        // This will fetch the media URL of the song that will be played.
        switch (this.queue.current.source) {
            case 'deezer':
                this.queue.current.stream = await this.deezerUtils.fetchMediaURL(this.queue.current.id);
                break;
            case 'soundcloud':
                this.queue.current.stream = await this.scUtils.getTranscodedStream(this.queue.current.transcodedUrl);
                break;
            // TODO: Implement TIDAL, Apple Music and Spotify. Eventually at least.
        }

        this.audioResource = createAudioResource(this.queue.current.stream);
        
        this.player.play(this.audioResource);
        this.scarlett.emit('trackStart', this, this.queue.current);
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
    public skip(): void { 
        this.player.stop(true);
        this.play();
    }

    /** Destroys the player (connection). */
    public destroy(): void {
        this.scarlett.emit('connectionTerminated');
        return this.connection.destroy();
    }
    
    /** Sets the text channel where event messages will be sent. */
    public setTextChannel(channelId: string) {
        this.textChannel = channelId;
        return channelId;
    }

	/** Sets the now playing message. */
	public setNowPlayingMessage(message: NowPlayingMessage): NowPlayingMessage {
		this.nowPlayingMessage = message;
		return message;
	}
}

export interface PlayerOptions {
    /** The ID of the voice channel that Disrupt will be connecting to. */
    channelId: string;
    /** The ID of the text channel that Disrupt will be sending her messages. */
    textChannel: string;
    /** The ID of the server. */
    guildId: string;
    /** The server's voice adapter. */
    adapter: any;
    /** Whether the player should be deafened or not. */
    selfDeaf: boolean;
    /** The voice channel's bitrate. */
    bitrate: number;
}

interface NowPlayingMessage {
	/** The ID of the channel. */
	channelId: string;
	/** The boolean indicating if the message has been deleted or not. */
	deleted?: boolean;
	/** The delete function. */
	delete: () => Promise<unknown>;
}
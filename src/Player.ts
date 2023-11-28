import {
	AudioPlayer,
	AudioPlayerStatus,
	AudioResource,
	createAudioPlayer,
	createAudioResource,
	joinVoiceChannel,
	VoiceConnection,
	VoiceConnectionDisconnectReason,
	VoiceConnectionStatus,
} from '@discordjs/voice';
import { Manager } from '.';
import Queue from './Queue';
import { StreamDeployer } from './Utils/StreamDeployer';

import m3u8stream from 'm3u8stream';
import { Readable } from 'stream';

/** This is Disrupt's Player class, it's where all the voice magic happens. */
export class Player {
	/** The voice player connection. */
	private connection: VoiceConnection;
	/** The player. */
	private readonly player: AudioPlayer;
	/** The audio resource that will be played. */
	private audioResource: AudioResource;
	/** The manager of Disrupt. */
	private disrupt: Manager;

	/** Indicates if the player is playing anything or not. */
	public isPlaying: boolean = false;
	/** The player's queue. */
	public queue: Queue = new Queue();
	/** The now playing message. */
	public nowPlayingMessage: NowPlayingMessage;
	/** The text channel. */
	public textChannel: string;

	/** The Stream Deployer class. Used to deploy the stream that will be played back via the player. */
	private streamDeploy: StreamDeployer;

	constructor(options: PlayerOptions, disrupt: Manager) {
		this.disrupt = disrupt;
		this.streamDeploy = new StreamDeployer(disrupt);

		this.connection = joinVoiceChannel({
			channelId: options.channelId,
			guildId: options.guildId,
			adapterCreator: options.adapter,
			selfDeaf: options.selfDeaf,
		});

		this.textChannel = options.textChannel;
		this.player = createAudioPlayer();

		this.connection.subscribe(this.player);

		this.connection.on('stateChange', async (_oldState, newState) => {
			// Destroy the connection if the player is forcibly removed.
			if (newState.status === VoiceConnectionStatus.Disconnected) return this.connection.destroy();
		});

		this.connection.on(VoiceConnectionStatus.Disconnected, async (_oldState, newState) => {
			// Destroys the player if the bot was manually disconnected.
			if (newState.reason === VoiceConnectionDisconnectReason.Manual) return this.destroy();

			// TODO: Add reconnecting.
		});

		this.player.on('stateChange', (_oldState, newState) => {
			// Play the next track if the queue isn't empty and if the old state was "Buffering".
			if (_oldState.status === AudioPlayerStatus.Playing && newState.status === AudioPlayerStatus.Idle && this.queue.length) {
				this.disrupt.emit('trackEnd', this, this.queue.current);
				return this.play();
			}
			if (newState.status === AudioPlayerStatus.Idle) {
				this.disrupt.emit('queueEnd', this);
				return this.isPlaying = false;
			}
		});
	}

	/** Plays the currently enqueued track. */
	public async play() {
		if (!this.queue.length) return;
		if (this.player.state.status === AudioPlayerStatus.Buffering || this.player.state.status === AudioPlayerStatus.Paused) return;
		this.queue.current = this.queue.shift();

		const stream = await this.streamDeploy.deployStream({
			track: this.queue.current,
			source: this.queue.current.source,
		}) as unknown as Readable | m3u8stream.Stream;

		this.audioResource = createAudioResource(stream, {
			inlineVolume: true,
		});
		this.audioResource.volume.setVolume(1.0);
		// TODO: Set the bitrate of the encoder to the bitrate of the channel.

		this.player.play(this.audioResource);
		this.disrupt.emit('trackStart', this, this.queue.current);
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
		this.disrupt.emit('connectionTerminated');
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

	/** Returns the current playback time in a percentage type. */
	public get currentPlaybackTime() {
		return ((this.audioResource.playbackDuration / this.queue.current.duration) * 100).toFixed(2);
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
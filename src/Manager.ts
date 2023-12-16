import { Deezer, SoundCloud, Spotify, HTTP, Bandcamp } from './Sources';
import { DisruptError } from './Utils/DisruptError';
import { Track, Album, Playlist } from './Models';
import { Player, PlayerOptions } from './Player';
import { EventEmitter } from 'node:events';
import { AppleMusic } from './Sources/AppleMusic';

/** This is Disrupt's Manager class. It manages player creation and resolves to use the appropriate source. */
export class Manager extends EventEmitter {
	/** The manager's options. */
	public options: Options;
	/** The map of players. */
	public players: Map<string, Player>;

	/** The SoundCloud source manager. */
	private soundcloud: SoundCloud;
	/** The Deezer source manager. */
	private deezer: Deezer;
	/** The Spotify source manager. */
	private spotify: Spotify;
	/** The HTTP source manager. */
	private http: HTTP;
	/** The Bandcamp source manager. */
	private bandcamp: Bandcamp;
	/** The Apple Music source manager. */
	private appleMusic: AppleMusic;

	constructor(options: Options) {
		super();

		this.players = new Map();
		this.options = options;

		this.initializeSources();
	}

	/** Initializes all source managers. */
	private initializeSources() {
		this.soundcloud = new SoundCloud(this);
		this.deezer = new Deezer();
		this.spotify = new Spotify(this);
		this.http = new HTTP();
		this.bandcamp = new Bandcamp();
		this.appleMusic = new AppleMusic(this);
	}

	/**
	 * Creates a new player if there isn't already an existing one.
	 * @param options The player's options.
	 * @returns The existing player or a new player.
	 */
	public create(options: PlayerOptions) {
		let player = this.players.get(options.guildId);

		if (!player) player = this.createPlayer(options);
		return player;
	}

	/**
	 * Creates a new player and adds it to the Player map.
	 * @param options The player's options.
	 * @returns The new player.
	 */
	private createPlayer(options: PlayerOptions) {
		const player = new Player(options, this);
		this.players.set(options.guildId, player);
		return player;
	}

	/**
	 * Detects and routes the query to the correct source manager.
	 * @param options The resolver's options.
	 * @returns The appropriate source manager.
	 */
	public async resolve(options: ResolveOptions): Promise<ResolveResponse> {
		const { query, requester } = options;
		const { defaultPlatform } = this.options;

		if (query.startsWith('http://') || query.startsWith('https://')) {
			const url = new URL(query);

			switch (url.hostname) {
			case 'music.apple.com':
				return await this.appleMusic.resolve(query, requester);
			case 'bandcamp.com':
				return await this.bandcamp.resolve(query, requester);
			case 'soundcloud.com':
				return await this.soundcloud.resolve(query, requester);
			case 'open.spotify.com':
				return await this.spotify.resolve(query, requester);
			case 'deezer.com':
			case 'deezer.page.link':
				return await this.deezer.resolve(query, requester);
			default:
				return await this.http.resolve(query, requester);
			}
		}

		switch (defaultPlatform) {
		case 'soundcloud':
			return await this.soundcloud.resolve(query, requester);
		case 'deezer':
			return await this.deezer.resolve(query, requester);
		}
	}
}

interface Options {
	/** The configuration for the sources that Disrupt supports. */
    sources: {
		/** The configuration for the Deezer source. */
        deezer: {
			/** The master key used to decrypt tracks. */
            masterKey: string;
			/** The account ARL used to unlock higher quality audio. */
			arl?: string;
        };
		/** The configuration for the SoundCloud source. */
        soundcloud: {
			/** The client ID used to interface with the SoundCloud API. */
            clientId?: string;
        };
		/** The configuration for the Spotify source. */
		spotify: {
			clientId?: string;
			clientSecret?: string;
		};
		/** The configuration for the Apple Music source. */
		appleMusic: {
			/** The API token used to interface with the Apple Music API. */
			mediaAPIToken?: string;
		}
    },
    defaultPlatform: Platform;
	deleteNPMessageOnTrackEnd?: boolean;
}

type Platform = 'soundcloud' | 'deezer';

interface ResolveOptions {
    query: string,
    requester: unknown
}

/** The interfaces for all Disrupt events. */
export interface DisruptEvents {
	/**
	 * Emitted when a player starts playing a new track.
	 * @eventProperty
	 */
	trackStart: (player: Player, track: unknown) => void;

	/**
	 * Emitted when the player finishes playing a track.
	 * @eventProperty
	 */
	trackEnd: (player: Player, track: unknown) => void;

	/**
	 * Emitted when an error is encountered when playing a song.
	 * @eventProperty
	 */
	trackError: (error: DisruptError) => void;

	/**
	 * Emitted when the player's queue has finished.
	 * @eventProperty
	 */
	queueEnd: (player: Player) => void;

	/**
	 * Emitted when a track gets stuck while it is playing.
	 * @eventProperty
	 */
	trackStuck: (player: Player, track: unknown) => void;

	/**
   	 * Emitted when the connection is destroyed.
   	 * @eventProperty
     */
	connectionTerminated: () => void;

	/**
	 * Emitted when the connection is destroyed.
	 * @eventProperty
	 */
	debug: (log: unknown) => void;
}

export declare interface Manager {
	on<K extends keyof DisruptEvents>(
		event: K,
		listener: DisruptEvents[K]
	): this;
	once<K extends keyof DisruptEvents>(
		event: K,
		listener: DisruptEvents[K]
	): this;
	emit<K extends keyof DisruptEvents>(
		event: K,
		...args: Parameters<DisruptEvents[K]>
	): boolean;
	off<K extends keyof DisruptEvents>(
		event: K,
		listener: DisruptEvents[K]
	): this;
}

export interface ResolveResponse {
    type: ResultTypes;
    info: Track | Album | Playlist | {};
}

// eslint-disable-next-line no-shadow
export enum ResultTypes {
	TRACK = 'track',
	ALBUM = 'album',
	PLAYLIST = 'playlist',
	SEARCH = 'search',
	EMPTY = 'empty',
}

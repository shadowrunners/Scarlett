import { EventEmitter } from 'node:events';
import { Player, PlayerOptions } from './Player';
import { Deezer } from './Sources/Deezer/DeezerManager';
import { SoundCloud } from './Sources/SoundCloud/SoundCloudManager';
import { Track, Album, Playlist } from './Models';
// import { Spotify } from './Sources/Spotify/SpotifyManager';

/** This is Disrupt's Manager class. It manages player creation and resolves using the appropriate source. */
export class Manager extends EventEmitter {
	/** The manager's options. */
	public options: Options;
	/** The map of players. */
	public players: Map<string, Player>;

	/** The regex used to detect Deezer links. */
	private readonly deezerRegex: RegExp;
	/** The regex used to detect SoundCloud links. */
	private readonly soundCloudRegex: RegExp;

	spotifyRegex: RegExp;

	/** The SoundCloud source manager. */
	private soundcloud: SoundCloud;
	/** The Deezer source manager. */
	private deezer: Deezer;
	/** The Spotify source manager. */
	// private spotify: Spotify;

	constructor(options: Options) {
		super();

		this.players = new Map();
		this.options = options;

		this.soundcloud = new SoundCloud(this);
		this.deezer = new Deezer();
		// this.spotify = new Spotify(this);

		this.deezerRegex = /^(https?:\/\/?(www\.)?deezer\.com\/(?<countrycode>[a-zA-Z]{2}\/)?(?<type>track|album|playlist|artist)\/(?<identifier>[0-9]+))$/;
		this.soundCloudRegex = /(https?:\/\/)?(www\.)?soundcloud\.com\/[^\s/]+(\/[^\s/]+)*\/?(\?[^#\s]*)?(#.*)?$/i;
		this.spotifyRegex = /^(https:\/\/open\.spotify\.com\/(track|album|playlist)\/[a-zA-Z0-9]+)(\?si=[a-zA-Z0-9]+)?$/;
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
		if (options.query.match(this.soundCloudRegex) || this.options.defaultPlatform === 'soundcloud')
			return await this.soundcloud.resolve(options.query, options.requester);
		// if (options.query.match(this.spotifyRegex))
		// 	return await this.spotify.resolve(options.query);
		if (options.query.match(this.deezerRegex) || this.options.defaultPlatform === 'deezer')
			return await this.deezer.resolve(options.query, options.requester);
	}
}

interface Options {
    sources: {
        deezer: {
            masterKey: string,
        };
        soundcloud: {
            clientId: string;
        };
		spotify: {
			clientId: string;
			clientSecret: string;
		};
    },
    defaultPlatform: Platform
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
    info: Track | Album | Playlist;
}

// eslint-disable-next-line no-shadow
export enum ResultTypes {
	TRACK = 'track',
	ALBUM = 'album',
	PLAYLIST = 'playlist',
	SEARCH = 'search',
}

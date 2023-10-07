import { EventEmitter } from 'node:events';
import { Player, PlayerOptions } from './Player';
import { Deezer } from './Sources/Deezer/DeezerManager';
import { SoundCloud } from './Sources/SoundCloud/SoundCloudManager';
import { Track } from './Models/Track';
import { Album } from './Models/Album';
import { Playlist } from './Models/Playlist';

export class Manager extends EventEmitter {
    public options: Options;
    public players: Map<string, Player>;

    constructor(options: Options) {
        super();

        this.players = new Map();
        this.options = options;
    }

    public create(options: PlayerOptions) {
        let player = this.players.get(options.guildId);

        if (!player) player = this.createPlayer(options);
        return player;
    }

    private createPlayer(options: PlayerOptions) {
        const player = new Player(options, this);
        this.players.set(options.guildId, player);
        return player; 
    }

    public async resolve(options: ResolveOptions): Promise<ResolveResponse> {
        const deezerRegex = new RegExp('https?:\\/\\/?(www\\.)?deezer\\.com\\/(?<countrycode>[a-zA-Z]{2}\\/)?(?<type>track|album|playlist|artist)\\/(?<identifier>[0-9]+)');
		const soundCloudRegex = /(https?:\/\/)?(www\.)?soundcloud\.com\/[^\s/]+(\/[^\s/]+)*\/?(\?[^#\s]*)?(#.*)?$/i;

       if (options.query.match(soundCloudRegex) || this.options.defaultPlatform === 'soundcloud') {
			console.log('Query matched!')
			return await new SoundCloud(this).resolve(options.query);
		}
		if (options.query.match(deezerRegex) || this.options.defaultPlatform === 'deezer') return await new Deezer().resolve(options.query);
    }
}

interface Options {
    sources: {
        deezer: {
            masterKey: string,
        };
        soundcloud: {
            clientId: string;
        }
    },
    defaultPlatform: Platform
}

type Platform = 'soundcloud' | 'deezer';


interface ResolveOptions {
    query: string,
    requester: unknown
}

/** The interface for all Disrupt events. */
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

export enum ResultTypes {
	TRACK = 'track',
	ALBUM = 'album',
	PLAYLIST = 'playlist',
	SEARCH = 'search',
}
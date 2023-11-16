import { Manager, ResolveResponse, ResultTypes } from '../../Manager.js';
import { SoundCloudBuilder } from '../../Utils/Builders';
import axios from 'axios';

/** This is Disrupt's SoundCloud source manager. Used for resolving SoundCloud links. */
export class SoundCloud {
	/** The client ID used to call the API. */
	private readonly clientId: string;
	/** The URL of the API. */
	private readonly apiURL: string;
	/** The builder class used to build track and album metadata. */
	private builder: SoundCloudBuilder;
	/** The regex used to detect SoundCloud links. */
	private readonly scRegex: RegExp;

	constructor(disrupt: Manager) {
		this.apiURL = 'https://api-v2.soundcloud.com';
		this.builder = new SoundCloudBuilder();
		this.clientId = disrupt.options.sources.soundcloud.clientId;

		this.scRegex = /^(https?:\/\/)?(?:www\.)?soundcloud\.com\/([^/]+)\/(sets\/[^/]+|[^/]+)\/?$/;
	}

	/**
     * Fetches the query based on the regex.
     * @param query The link of the track / album / playlist or the query.
     * @returns The appropriate response.
     */
	public async resolve(query: string, requester: unknown): Promise<ResolveResponse> {
		const identifier = query.match(this.scRegex) || null;

		if (!identifier) return {
			type: ResultTypes.SEARCH,
			info: await this.fetchQuery(query, requester),
		};

		if (identifier[3] && identifier[3].startsWith('sets')) return {
			type: ResultTypes.ALBUM,
			info: await this.fetchPlaylist(query, requester),
		};

		return {
			type: ResultTypes.TRACK,
			info: await this.fetchSong(query, requester),
		};
	}

	private async fetchQuery(query: string, requester: unknown) {
		const res = await axios.get(`${this.apiURL}/search/tracks?q=${query}&client_id=${this.clientId}`);
		const jsonResponse = res.data as SearchResult;

		return this.builder.buildTrack(jsonResponse.collection[0], requester);
	}

	private async fetchSong(query: string, requester: unknown) {
		const res = await axios.get(`${this.apiURL}/resolve?url=${query}&client_id=${this.clientId}`);
		const jsonResponse = res.data as APIResponse;

		return this.builder.buildTrack(jsonResponse, requester);
	}

	private async fetchPlaylist(query: string, requester: unknown) {
		const res = await axios.get(`${this.apiURL}/resolve?url=${query}&client_id=${this.clientId}`);
		const jsonResponse = res.data as APIPlaylist;

		// Fetches all the songs in the playlist since sometimes SC only provides IDs.
		const tData = await axios.get(`${this.apiURL}/tracks?ids=${jsonResponse.tracks.map((track) => `${track.id},`)}`);

		return this.builder.buildPlaylist(jsonResponse, tData.data as APIResponse[], requester);
	}
}

interface SearchResult {
    collection: APIResponse[];
}

interface APIPlaylist {
	id: string;
	title: string;
	permalink_url: string;
	username: string;
	duration: number;
	artwork_url: string;
	tracks: {
		id: string;
	}[];
}

type APIResponse = {
    id: string;
    artwork_url: string;
    title: string;
    permalink_url: string;
    duration: number;
	publisher_metadata: {
		artist: string;
		isrc: string;
	}
    media: {
        transcodings: [
            {
               url: string;
            },
            {
                url: string;
            },
            {
                url: string;
            },
        ]
    }
}
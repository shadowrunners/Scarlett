import { ResolveResponse, ResultTypes } from '../../Manager.js';
import { DeezerBuilder } from '../../Utils/Builders';
import axios from 'axios';

export class Deezer {
	/** The public APIs URL. */
	private readonly publicAPI: string = 'https://api.deezer.com';
	/** The Builder class used to build track data. */
	private builder: DeezerBuilder;
	/** The regex for standard Deezer links. */
	private readonly deezerRegex: RegExp = /^(https?:\/\/)?deezer\.com\/(?<countrycode>[a-zA-Z]{2}\/)?(?<type>track|album|playlist|artist)\/(?<identifier>[0-9]+)/;
	/** The regex for page.link links. */
	private readonly pageLinkRegex: RegExp = /^(https?:\/\/)?deezer\.page\.link\/[a-zA-Z0-9]+$/;

	constructor() {
		this.builder = new DeezerBuilder();
	}

	/**
     * Fetches the query based on the regex.
     * @param query The link of the track / album / playlist or the query.
     * @returns The appropriate response.
     */
	public async resolve(query: string): Promise<ResolveResponse> {
		let songQuery: string;

		if (query.match(this.pageLinkRegex)) songQuery = await this.resolveShareUrl(query);
		else songQuery = query;

		const identifier = songQuery.match(this.deezerRegex) || null;
		switch (identifier?.groups?.type) {
		case 'album':
			return {
				type: ResultTypes.ALBUM,
				info: await this.fetchAlbum(identifier.groups.identifier),
			};
		case 'track':
			return {
				type: ResultTypes.TRACK,
				info: await this.fetchSong(identifier.groups.identifier),
			};
		case 'playlist':
			return {
				type: ResultTypes.PLAYLIST,
				info: await this.fetchPlaylist(identifier.groups.identifier),
			};
		default:
			return {
				type: ResultTypes.SEARCH,
				info: await this.fetchQuery(query),
			};
		}
	}

	private async fetchQuery(query: string) {
		const res = await axios.get(`${this.publicAPI}/search?q=${encodeURIComponent(query)}`);
		return this.builder.buildTrack((res.data as QueryResponse).data[0]);
	}

	private async fetchSong(query: string) {
		const res = await axios.get(`${this.publicAPI}/track/${query}`);
		return this.builder.buildTrack(res.data as APITrackResponse);
	}

	private async fetchAlbum(query: string) {
		const res = await axios.get(`${this.publicAPI}/album/${query}`);
		return this.builder.buildAlbum(res.data as APIAlbum);
	}

	private async fetchPlaylist(query: string) {
		const res = await axios.get(`${this.publicAPI}/playlist/${query}`);
		return this.builder.buildPlaylist(res.data as APIPlaylist);
	}

	private async resolveShareUrl(query: string) {
		const res = await axios.get(query);
		return `https://deezer.com${res.request.path}`;
	}
}

interface QueryResponse {
    data: {
        id: string;
        title: string;
        link: string;
        md5_image: string;
        artist: {
            name: string;
        };
        duration: number;
    }[];
}

interface APITrackResponse {
    id: string;
    title: string;
    link: string;
    md5_image: string;
    artist: {
        name: string;
    };
    duration: number;
}

interface APIAlbum {
    id: string;
    title: string;
    cover_big: string;
    link: string;
    tracks: {
        data: APITrackResponse[];
    };
    duration: number;
    artist: {
        name: string;
    };
    upc: string;
}

interface APIPlaylist {
    id: string;
    title: string;
    description: string;
    duration: number;
    link: string;
    picture_big: string;
    creator: {
        name: string;
    };
    tracks: {
        data: APITrackResponse[];
    }
}


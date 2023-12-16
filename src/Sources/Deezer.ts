import { ResolveResponse, ResultTypes } from '../Manager';
import { Album, Playlist, Track } from '../Models';
import axios from 'axios';

export class Deezer {
	/** The public APIs URL. */
	private readonly publicAPI: string = 'https://api.deezer.com';
	/** The regex for page.link links. */
	private readonly pageLinkRegex: RegExp = /^(https?:\/\/)?deezer\.page\.link\/[a-zA-Z0-9]+$/;

	/**
	 * Fetches the query based on the regex.
	 * @param query The link of the track / album / playlist or the query.
	 * @param requester The person that requested the song.
	 * @returns The appropriate response.
	 */
	public async resolve(query: string, requester: unknown): Promise<ResolveResponse> {
		let songQuery: string;

		if (query.match(this.pageLinkRegex)) songQuery = await this.resolveShareUrl(query);
		else songQuery = query;

		const [type, id] = songQuery.split('/').slice(3, 5);
		switch (type) {
		case 'album':
			return {
				type: ResultTypes.ALBUM,
				info: await this.fetchAlbum(id, requester),
			};
		case 'track':
			return {
				type: ResultTypes.TRACK,
				info: await this.fetchSong(id, requester),
			};
		case 'playlist':
			return {
				type: ResultTypes.PLAYLIST,
				info: await this.fetchPlaylist(id, requester),
			};
		default:
			return {
				type: ResultTypes.SEARCH,
				info: await this.fetchQuery(query, requester),
			};
		}
	}

	private async fetchQuery(query: string, requester: unknown) {
		const { data: { data: [queryData] } } = await axios.get<QueryResponse>(`${this.publicAPI}/search?q=${encodeURIComponent(query)}`);
		if (!queryData) return { type: ResultTypes.EMPTY, info: {} };

		const { data } = await axios.get<APITrack>(`${this.publicAPI}/track/${queryData.id}`);
		return this.buildTrack(data, requester);
	}

	private async fetchSong(query: string, requester: unknown) {
		const { data } = await axios.get<APITrack>(`${this.publicAPI}/track/${query}`);
		return this.buildTrack(data, requester);
	}

	private async fetchAlbum(query: string, requester: unknown) {
		const { data } = await axios.get<APIAlbum>(`${this.publicAPI}/album/${query}`);

		return new Album({
			id: data.id,
			artist: data.artist.name,
			title: data.title,
			uri: data.link,
			upc: data.upc,
			duration: data.duration,
			artworkUrl: data.cover_big,
			tracks: data.tracks.data.map((track) => this.buildTrack(track, requester)),
			source: 'deezer',
		});
	}

	private async fetchPlaylist(query: string, requester: unknown) {
		const { data } = await axios.get<APIPlaylist>(`${this.publicAPI}/playlist/${query}`);

		return new Playlist({
			id: data.id,
			title: data.title,
			creator: data.creator.name,
			duration: data.duration,
			uri: data.link,
			artworkUrl: data.picture_big,
			source: 'deezer',
			tracks: data.tracks.data.map((track) => this.buildTrack(track, requester)),
		});
	}

	private async resolveShareUrl(query: string) {
		const { request: { path } } = await axios.get(query);
		return `https://deezer.com${path}`;
	}

	private buildTrack(track: APITrack, requester: unknown) {
		return new Track({
			id: track.id,
			artist: track.artist.name,
			title: track.title,
			isrc: track.isrc,
			uri: track.link,
			duration: track.duration,
			artworkUrl: this.buildArtworkUrl(track.md5_image),
			source: 'deezer',
			requester,
		});
	}

	/**
	 * Builds the URL of the track image.
	 * @param hash The MD5 image hash from the Deezer API.
	 * @returns The full URL to the artwork.
	 */
	private buildArtworkUrl(hash: string): string {
		return `https://e-cdn-images.dzcdn.net/images/cover/${hash}/500x500-000000-80-0-0.jpg`;
	}
}

type QueryResponse = {
    data: { id: string; }[];
}

type APITrack = {
	/** The track's ID. */
	id: string;
	/** The object containing artist related information. */
	artist: {
		/** The name of the artist. */
		name: string;
	};
	/** The name of the song. */
	title: string;
	/** The link to the song. */
	link: string;
	/** The MD5 hash of the artwork. */
	md5_image: string;
	/** The song's ISRC. */
	isrc: string;
	/** The duration of the song (in ms). */
	duration: number;
}

type APIAlbum = {
	/** The ID of the album. */
	id: string;
	/** The object containing artist related information. */
	artist: {
		/** The name of the artist that made the album. */
		name: string;
	};
	/** The name of the album.. */
	title: string;
	/** The URL of the album. */
	link: string;
	/** The UPC of the album (similar to a track ISRC). */
	upc: string;
	/** The URL to the 500x500 artwork of the album. */
	cover_big: string;
	/** The duration of the album. (in ms) */
	duration: number;
	/** The tracks object of the album. */
	tracks: {
		/** The data of the tracks that are on the album. */
		data: APITrack[];
	};
}

type APIPlaylist = {
	/** The playlist's ID. */
	id: string;
	/** The playlist's name. */
	title: string;
	/** The playlist's duration (in ms). */
	duration: number;
	/** The link to the playlist. */
	link: string;
	/** The link to the 500x500 artwork. */
	picture_big: string;
	/** The creator object. */
	creator: {
		/** The playlist creator's name. */
		name: string;
	};
	/** The tracks object housing all the tracks and their data. */
	tracks: {
		/** The data of the tracks that are in the playlist. */
		data: APITrack[];
	};
}


import { Manager, ResolveResponse, ResultTypes } from '../Manager';
import { Playlist, Track } from '../Models';
import m3u8 from 'm3u8stream';
import axios from 'axios';

/** This is Disrupt's SoundCloud source manager. Used for resolving SoundCloud links. */
export class SoundCloud {
	/** The client ID used to call the API. */
	private readonly clientId: string;
	/** The URL of the API. */
	private readonly apiURL: string = 'https://api-v2.soundcloud.com';
	/** The regex used to detect SoundCloud links. */
	private readonly scRegex: RegExp = /^(https?:\/\/)?(?:www\.)?soundcloud\.com\/([^/]+)\/(sets\/[^/]+|[^/]+)\/?$/;

	constructor(disrupt: Manager) {
		this.clientId = disrupt.options.sources.soundcloud.clientId;
	}

	/**
	 * Fetches the query based on the regex.
	 * @param query The link of the track / album / playlist or the query.
	 * @param requester The person that requested the provided query.
	 * @returns The appropriate response.
	 */
	public async resolve(query: string, requester: unknown): Promise<ResolveResponse> {
		const identifier = query.match(this.scRegex) || null;

		if (!identifier) return {
			type: ResultTypes.SEARCH,
			info: await this.fetchQuery(query, requester),
		};

		if (identifier[3] && identifier[3].startsWith('sets')) return {
			type: ResultTypes.PLAYLIST,
			info: await this.fetchPlaylist(query, requester),
		};

		return {
			type: ResultTypes.TRACK,
			info: await this.fetchSong(query, requester),
		};
	}

	/**
	 * Fetches the provided query from the SoundCloud API and builds it into a Disrupt Track.
	 * @param query The provided query.
	 * @param requester The person who requested the song.
	 * @private
	 */
	private async fetchQuery(query: string, requester: unknown) {
		const res = await axios.get(`${this.apiURL}/search/tracks?q=${query}&client_id=${this.clientId}`) as { data: SearchResult };

		return new Track({
			id: res.data[0].id,
			artist: res.data[0].publisher_metadata.artist ?? 'A Talented Artist',
			title: res.data[0].title,
			isrc: res.data[0].publisher_metadata.isrc,
			uri: res.data[0].permalink_url,
			duration: res.data[0].duration,
			artworkUrl: res.data[0].artwork_url,
			source: 'soundcloud',
			transcodedUrl: res.data[0].media.transcodings[2].url,
			requester,
		});
	}

	/**
	 * Fetches the provided song from the SoundCloud API and builds it into a Disrupt Track.
	 * @param query The provided song.
	 * @param requester The person who requested the song.
	 * @private
	 */
	private async fetchSong(query: string, requester: unknown) {
		const res = await axios.get(`${this.apiURL}/resolve?url=${query}&client_id=${this.clientId}`) as { data: APITrack; };

		return new Track({
			id: res.data[0].id,
			artist: res.data[0].publisher_metadata.artist ?? 'A Talented Artist',
			title: res.data[0].title,
			isrc: res.data[0].publisher_metadata.isrc,
			uri: res.data[0].permalink_url,
			duration: res.data[0].duration,
			artworkUrl: res.data[0].artwork_url,
			source: 'soundcloud',
			transcodedUrl: res.data[0].media.transcodings[2].url,
			requester,
		});
	}

	/**
	 * Fetches the provided playlist (or album) from the SoundCloud API and builds it into a Disrupt Playlist.
	 * @param query The provided song.
	 * @param requester The person who requested the song.
	 * @private
	 */
	private async fetchPlaylist(query: string, requester: unknown) {
		const res = await axios.get(`${this.apiURL}/resolve?url=${query}&client_id=${this.clientId}`) as { data: APIPlaylist };
		const tData = await axios.get(`${this.apiURL}/tracks?ids=${res.data.tracks.map((track) => `${track.id},`)}`) as { data: APITrack[]; };

		return new Playlist({
			id: res.data.id,
			title: res.data.title,
			creator: res.data.username,
			duration: res.data.duration,
			uri: res.data.permalink_url,
			artworkUrl: res.data.artwork_url,
			source: 'soundcloud',
			tracks: tData.data.map((track) => new Track({
				id: track.id,
				artist: track.publisher_metadata.artist ?? 'A Talented Artist',
				title: track.title,
				isrc: track.publisher_metadata.isrc,
				uri: track.permalink_url,
				duration: track.duration,
				artworkUrl: track.artwork_url,
				source: 'soundcloud',
				transcodedUrl: track.media.transcodings[2].url,
				requester,
			})),
		});
	}
}

interface SearchResult {
		/** An array containing tracks. */
    collection: APITrack[];
}

type APIPlaylist = {
	/** The playlist's ID. */
	id: string;
	/** The playlist's title. */
	title: string;
	/** The link to the playlist. */
	permalink_url: string;
	/** The person who published the playlist. */
	username: string;
	/** The duration of the playlist (in ms). */
	duration: number;
	/** The link to the artwork of the playlist. */
	artwork_url: string;
	/** The array of tracks that are in the playlist. */
	tracks: {
		/** The ID of the track. */
		id: string;
	}[];
}

type APITrack = {
	/** The track's ID. */
	id: string;
	/** The name of the song. */
	title: string;
	/** The link to the song. */
	permalink_url: string;
	/** The link to the artwork of the song. */
	artwork_url: string;
	/** The duration of the song (in ms). */
	duration: number;
	/** The publisher's metadata. */
	publisher_metadata: {
		/** The artist that published the song. */
		artist: string;
		/** The ISRC of the song. */
		isrc: string;
	}
	/** The media object containing the transcoded audio. */
	media: {
		/** The array of transcoded streams. */
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
	/** The m3u8 stream of the song. */
	stream?: m3u8.Stream;
}
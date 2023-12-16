import { Manager, ResolveResponse, ResultTypes } from '../Manager';
import { Album, Playlist, Track } from '../Models';
import axios, { AxiosInstance } from 'axios';
import { DisruptError } from '../Utils/DisruptError';

/** This is Disrupt's Apple Music source manager. Used for resolving Bandcamp links. */
export class AppleMusic {
	/** The Media API token used to interface with the Apple Music API. */
	private mediaAPIToken: string;
	/** The Axios instance used to interface with the Apple Music API. */
	private axios: AxiosInstance;
	/** The URL of the API. */
	private readonly apiURL: string = 'https://api.music.apple.com/v1/catalog/us';

	constructor(disrupt: Manager) {
		this.mediaAPIToken = disrupt.options.sources?.appleMusic?.mediaAPIToken;
		this.validateToken();

		this.axios = axios.create({
			headers: {
				'Authorization': `Bearer ${this.mediaAPIToken}`,
				'origin': 'https://music.apple.com',
				// just in case apple decides to do funny stuff
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
			},
		});
	}

	/** Validates the Apple Music Media API token to see if it's valid or expired. */
	public validateToken() {
		try {
			if (!this.mediaAPIToken) throw new DisruptError('Could not initiate Apple Music manager. (AM:MISSING_MEDIAAPI_TOKEN)');

			const token = JSON.parse(Buffer.from(this.mediaAPIToken.split('.')[1], 'base64').toString('utf8'));
			const currentTimestamp = new Date(Date.now());
			const expirationDate = new Date(token.exp * 1000);
			const hasExpired = Boolean(expirationDate < currentTimestamp);

			if (hasExpired) throw new DisruptError('Media API token has expired. Refer to the documentation to get a new one. (AM:EXPIRED_MEDIAAPI_TOKEN)');

			return hasExpired;
		}
		catch (_err) {
			throw new DisruptError('Invalid Media API token. Refer to the documentation to provide a valid Media API token. (AM:INVALID_MEDIAAPI_TOKEN)');
		}
	}

	/**
	 * Fetches the query based on the regex.
	 * @param query The link of the track / album / playlist or the query.
	 * @param requester The person that requested the song.
	 * @returns The appropriate response.
	 */
	public async resolve(query: string, requester: unknown): Promise<ResolveResponse> {
		const identifier = query.split('/');

		const id = query.replace(/\?i=[a-zA-Z0-9]+/, '').split('/')[6];
		switch (identifier[4]) {
		case 'playlist':
			return {
				type: ResultTypes.PLAYLIST,
				info: await this.fetchPlaylist(id, requester) as Playlist,
			};
		case 'album':
			// This is also being used for normal tracks as Apple Music doesn't have song links. All songs are returned as albums.
			return {
				type: ResultTypes.ALBUM,
				info: await this.fetchAlbum(id, requester) as Album,
			};
		}
	}

	private async fetchAlbum(query: string, requester: unknown) {
		const { data: { data: [albumData] } } = await this.axios.get(`${this.apiURL}/albums/${query}`) as { data: AMAlbum };

		const attributes = albumData.attributes;
		const tracks = albumData.relationships.tracks.data;
		const mappedTracks = this.mapTracks(tracks, requester);

		return new Album({
			id: albumData.id,
			artist: attributes.artistName,
			title: attributes.name,
			uri: attributes.url,
			upc: attributes.upc,
			artworkUrl: this.bakeArtworkURL(attributes.artwork.url),
			tracks: mappedTracks,
			source: 'applemusic',
		});
	}

	private async fetchPlaylist(query: string, requester: unknown) {
		const { data: { data: [playlistData] } } = await this.axios.get(`${this.apiURL}/playlists/${query}`) as { data: AMPlaylist };

		const attributes = playlistData.attributes;
		const tracks = playlistData.relationships.tracks.data;
		const mappedTracks = this.mapTracks(tracks, requester);

		return new Playlist({
			id: playlistData.id,
			creator: attributes.curatorName,
			title: attributes.name,
			uri: attributes.url,
			artworkUrl: this.bakeArtworkURL(attributes.artwork.url),
			tracks: mappedTracks,
			source: 'applemusic',
		});
	}

	/**
	 * Maps the provided raw data into Disrupt Tracks.
	 * @param tracks The raw track data.
	 * @param requester The person who requested the track
	 * @private An array of Disrupt Tracks.
	 */
	private mapTracks(tracks: AMTrack[], requester: unknown) {
		return tracks.map((track) => {
			const attributes = track.attributes;

			return new Track({
				id: track.id,
				artist: attributes.artistName,
				title: attributes.name,
				isrc: attributes.isrc,
				duration: attributes.durationInMillis,
				artworkUrl: this.bakeArtworkURL(attributes.artwork.url),
				uri: attributes.url,
				source: 'applemusic',
				requester,
			});
		});
	}

	/** Replaces the {w} and {h} parameters of the URL with actual resolution values. */
	private bakeArtworkURL(baseURL: string) {
		return baseURL.replace('{w}x{h}', '1000x1000');
	}
}

type AMAlbum = {
		/** The array containing all the data about the album. */
    data: {
			/** The album's ID. */
			id: string;
			/** The object containing all the attributes such as name, UPC, etc. */
			attributes: {
				/** The name of the album. */
				name: string;
				/** The name of the artist(s) that made the album. */
				artistName: string;
				/** The album's UPC. */
				upc: string;
				/** The object containing all artwork related information. */
				artwork: {
					/** The URL of the artwork. */
					url: string;
				};
				/** The URL of the album. */
				url: string;
			}
			/** The object containing the album's tracks. */
			relationships: {
				/** The object containing the array of tracks that are on the album. */
				tracks: {
					/** The array of tracks that are on the album. */
					data: AMTrack[];
				}
			}
		}[];
}

type AMTrack = {
	/** The ID of the track. */
	id: string;
	/** The object containing all the attributes such as name, UPC, etc. */
	attributes: {
		/** The name of the artist(s) that made the song. */
		artistName: string;
		/** The name of the track. */
		name: string;
		/** The duration of the track in milliseconds. */
		durationInMillis: number;
		/** The ISRC of the track. */
		isrc: string;
		/** The object containing all artwork related information. */
		artwork: {
			/** The URL of the artwork. */
			url: string;
		};
		/** The URL of the track. */
		url: string;
	}
};

type AMPlaylist = {
	/** The array containing all the data about the playlist. */
	data: {
		/** The playlist's ID. */
		id: string;
		/** The object containing all the attributes such as name, curator, etc. */
		attributes: {
			/** The name of the playlist. */
			name: string;
			/** The name of the person that made the playlist. */
			curatorName: string;
			/** The object containing all artwork related information. */
			artwork: {
				/** The URL of the artwork. */
				url: string;
			}
			/** The URL of the playlist. */
			url: string;
		}
		/** The object containing the album's tracks. */
		relationships: {
			/** The object containing the array of tracks that are on the album. */
			tracks: {
				/** The array of tracks that are on the album. */
				data: AMTrack[];
			}
		}
	}[];
}
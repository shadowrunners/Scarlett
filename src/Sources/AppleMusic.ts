import { Manager, ResolveResponse, ResultTypes } from '../Manager';
import { Album, Track } from '../Models';
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

	public async resolve(query: string, requester: unknown): Promise<ResolveResponse> {
		const identifier = query.split('/');

		const id = query.replace(/\?i=[a-zA-Z0-9]+/, '').split('/')[6];
		switch (identifier[4]) {
		case 'album':
			return {
				type: ResultTypes.ALBUM,
				info: await this.fetchAlbum(id, requester) as Album,
			};
		}
	}

	public async fetchAlbum(query: string, requester: unknown) {
		const res = await this.axios.get(`${this.apiURL}/albums/${query}`);
		const data = res.data as AMAlbum;

		const mappedTracks = data.data[0].relationships.tracks.data.map((track) => track);
		const mappedTracksData = mappedTracks.map((track) => new Track({
			id: track.id,
			artist: track.attributes.artistName,
			title: track.attributes.name,
			isrc: track.attributes.isrc,
			duration: track.attributes.durationInMillis,
			artworkUrl: track.attributes.artwork.url.replace('{w}x{h}', '1000x1000'),
			uri: track.attributes.url,
			source: 'applemusic',
			requester,
		}));

		return new Album({
			id: data.data[0].id,
			artist: data.data[0].attributes.artistName,
			title: data.data[0].attributes.name,
			uri: data.data[0].attributes.url,
			upc: data.data[0].attributes.upc,
			duration: undefined,
			artworkUrl: data.data[0].attributes.artwork.url.replace('{w}x{h}', '1000x1000'),
			tracks: mappedTracksData,
			source: 'applemusic',
		});
	}
}

type AMAlbum = {
    data: [{
		/** The album's ID. */
		id: string;
		attributes: {
			/** The album's UPC. */
			upc: string;
			/** The artist information. */
			artwork: {
				/** The artist's name. */
				url: string;
			};
			url: string;
			name: string;
			artistName: string;
		}
		relationships: {
			/** The track array. */
			tracks: {
				data: AMAlbumTrack[];
			}
		}
	}]
}

type AMAlbumTrack = {
	id: string;
	attributes: {
		isrc: string;
		artwork: {
			/** The artist's name. */
			url: string;
		};
		url: string;
		name: string;
		artistName: string;
		durationInMillis: number;
	}
};

type AMTrack = {
	data: {
		id: string;
		attributes: {
			isrc: string;
			artwork: {
				/** The artist's name. */
				url: string;
			};
			url: string;
			name: string;
			artistName: string;
			durationInMillis: number;
		}
	}[];
};
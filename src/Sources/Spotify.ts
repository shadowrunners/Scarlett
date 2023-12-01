import { ResolveResponse, ResultTypes } from '../Manager';
import { Album, Manager, Playlist, Track } from '../index';
import axios from 'axios';

/** This is Disrupt's Spotify source manager. Used for resolving Spotify links. */
export class Spotify {
	/** The manager instance. */
	private disrupt: Manager;
	/** The Spotify access token. */
	private accessToken: string = null;
	/** The URL to Spotify's API. */
	private readonly apiURL: string = 'https://api.spotify.com/v1';
	/** The regex used to detect Spotify links. */
	private readonly spotifyRegex: RegExp = /^(https:\/\/open\.spotify\.com\/(track|album|playlist)\/[a-zA-Z0-9]+)(\?si=[a-zA-Z0-9]+)?$/;

	constructor(disrupt: Manager) {
		this.disrupt = disrupt;
	}

	private async fetchAccessToken() {
		const accessToken = await axios.post(`https://accounts.spotify.com/api/token?grant_type=client_credentials&client_id=${this.disrupt.options.sources.spotify.clientId}&client_secret=${this.disrupt.options.sources.spotify.clientSecret}`, '', {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		}) as { data: { access_token: string } };

		// This'll save it for future use.
		this.accessToken = accessToken.data.access_token;
		return this.accessToken;
	}

	/**
	 * Fetches the query based on the regex.
	 * @param query The link of the track / album / playlist or the query.
	 * @param requester The person that requested the query.
	 * @returns The appropriate response.
	 */
	public async resolve(query: string, requester: unknown): Promise<ResolveResponse> {
		if (!this.accessToken) await this.fetchAccessToken();

		const identifier = query.match(this.spotifyRegex) || null;
		// Removes the tracking part of the URL (?si=stringhere) to fetch the song properly.
		const id = query.replace(/\?si=[a-zA-Z0-9]+/, '').split('/')[4];
		switch (identifier[2]) {
		case 'album':
			return {
				type: ResultTypes.ALBUM,
				info: await this.fetchAlbum(id, requester) as Album,
			};
		case 'track':
			return {
				type: ResultTypes.TRACK,
				info: await this.fetchSong(id, requester) as Track,
			};
		case 'playlist':
			return {
				type: ResultTypes.PLAYLIST,
				info: await this.fetchPlaylist(id, requester) as Playlist,
			};
		}
	}

	/**
	 * Fetches the provided song from the Spotify API and builds it into a Disrupt Track.
	 * @param query The provided song.
	 * @param requester The person who requested the song.
	 * @private
	 */
	private async fetchSong(query: string, requester: unknown) {
		const res = await axios.get(`${this.apiURL}/tracks/${query}`, {
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
			},
		}) as { data: APITrack };

		return new Track({
			id: res.data.id,
			artist: res.data.artists.map((artist) => `${artist.name}, `).toString(),
			title: res.data.name,
			isrc: res.data.external_ids.isrc,
			uri: res.data.external_urls.spotify,
			duration: res.data.duration_ms,
			artworkUrl: res.data.images?.[0]?.url ?? res.data.album.images[0].url,
			source: 'spotify',
			requester,
		});
	}

	/**
	 * Fetches the provided album from the Spotify API and builds it into a Disrupt Album.
	 * @param query The provided album.
	 * @param requester The person who requested the album.
	 * @private
	 */
	public async fetchAlbum(query: string, requester: unknown) {
		const res = await axios.get(`${this.apiURL}/albums/${query}`, {
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
			},
		}) as { data: APIAlbum };

		return new Album({
			id: res.data.id,
			artist: res.data.artists.map((artist) => `${artist.name}, `).toString(),
			title: res.data.name,
			uri: res.data.external_urls.spotify,
			duration: res.data.duration_ms,
			artworkUrl: res.data.images[0].url,
			tracks: res.data.tracks.map((track) => new Track({
				id: track.id,
				artist: track.artists.map((artist) => `${artist.name}, `).toString(),
				title: track.name,
				isrc: track.external_ids.isrc,
				uri: track.external_urls.spotify,
				duration: track.duration_ms,
				artworkUrl: track.images?.[0]?.url ?? track.album.images[0].url,
				source: 'spotify',
				requester,
			})),
			source: 'spotify',
		});
	}

	/**
	 * Fetches the provided playlist from the Spotify API and builds it into a Disrupt Playlist.
	 * @param id The playlist's ID.
	 * @param requester The person who requested the song.
	 * @private
	 */
	public async fetchPlaylist(id: string, requester: unknown) {
		const res = await axios.get(`${this.apiURL}/playlists/${id}`, {
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
			},
		}) as { data: APIPlaylist };

		// TODO: Somehow lift the 100 song limit that the API imposes.

		return new Playlist({
			id: undefined,
			title: res.data.name,
			creator: res.data.owner.display_name,
			uri: res.data.external_urls.spotify,
			artworkUrl: res.data.images[0].url,
			tracks: res.data.tracks.items.map((tData) => new Track({
				id: tData.track.id,
				artist: tData.track.artists.map((artist) => `${artist.name}, `).toString(),
				title: tData.track.name,
				isrc: tData.track.external_ids.isrc,
				uri: tData.track.external_urls.spotify,
				duration: tData.track.duration_ms,
				artworkUrl: tData.track.images?.[0]?.url ?? tData.track.album.images[0].url,
				source: 'spotify',
				requester,
			})),
			source: 'spotify',
		});
	}
}

type APITrack = {
	/** The song's ID. */
	id: string;
	/** The song's name. */
	name: string;
	/** The song's album object. */
	album: {
		/** The images object that contains URLs. */
		images: {
			/** The image's URL. */
			url: string;
		}[];
	};
	/** The song's external URLs. */
	external_urls: {
		/** The song's Spotify URL. */
		spotify: string;
	};
	/** The song's external IDs. */
	external_ids: {
		/** The song's ISRC. */
		isrc: string;
	};
	/** The song's artists array. */
	artists: {
		/** The artist's name. */
		name: string;
	}[];
	/** The duration of the song (in ms). */
	duration_ms: number;
	/** The song's images array. */
	images: {
		/** The URL of the image. */
		url: string;
	}[];
};

type APIAlbum = {
	/** The album's ID. */
	id: string;
	/** The album's name. */
	name: string;
	/** The album's external IDs. */
	external_ids: {
		/** The album's UPC. */
		upc: string;
	};
	/** The album's external links. */
	external_urls: {
		/** The album's Spotify link. */
		spotify: string;
	};
	/** The album's artists array. */
	artists: {
		/** The artist's name. */
		name: string;
	}[];
	/** The duration of the album (in ms). */
	duration_ms: number;
	/** The album's images array. */
	images: {
		/** The URL of the image. */
		url: string;
	}[];
	/** The album's track array. */
	tracks: APITrack[];
}

type APIPlaylist = {
	/** The playlist's name. */
	name: string;
	/** The playlist's external links. */
	external_urls: {
		/** The playlist's Spotify link. */
		spotify: string;
	};
	/** The album's images array. */
	images: {
		/** The URL of the image. */
		url: string;
	}[];
	/** The playlist's owner object. */
	owner: {
		/** The owner's display name. */
		display_name: string;
	};
	/** The tracks object of the playlist. */
	tracks: {
		/** The tracks and their data. */
		items: {
			track: APITrack;
		}[];
	};
}

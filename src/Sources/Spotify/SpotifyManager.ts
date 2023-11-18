import { ResolveResponse, ResultTypes } from '../../Manager.js';
import { Album, Manager, Playlist, Track } from '../..';
import { SpotifyBuilder } from '../../Utils/Builders';
import axios from 'axios';

/** This is Disrupt's Spotify source manager. Used for resolving Spotify links. */
export class Spotify {
	/** The manager instance. */
	private disrupt: Manager;
	/** The Spotify access token. */
	private accessToken: string;
	/** The URL to Spotify's API. */
	private readonly apiURL: string;
	/** The regex used to detect Spotify links. */
	private readonly spotifyRegex: RegExp;
	/** The builder class used to build track and album metadata. */
	private builder: SpotifyBuilder;

	constructor(disrupt: Manager) {
		this.disrupt = disrupt;
		this.builder = new SpotifyBuilder();
		this.apiURL = 'https://api.spotify.com/v1';
		this.accessToken = null;

		this.spotifyRegex = /^(https:\/\/open\.spotify\.com\/(track|album|playlist)\/[a-zA-Z0-9]+)(\?si=[a-zA-Z0-9]+)?$/;
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
		default:
			return {
				type: ResultTypes.SEARCH,
				info: await this.fetchQuery(query, requester) as Track,
			};
		}
	}

	private async fetchQuery(query: string, requester: unknown) {
		const res = await axios.get(`${this.apiURL}/search?q=${encodeURIComponent(query)}&type=track&limit=3`, {
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
			},
		});

		const deezerRes = await axios.get(`https://api.deezer.com/track/isrc:${res.data.external_ids.isrc}`);
		return this.builder.buildTrack(res.data.tracks.items[0], deezerRes.data.id, requester);
	}

	private async fetchSong(query: string, requester: unknown) {
		const res = await axios.get(`${this.apiURL}/tracks/${query}`, {
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
			},
		});

		const deezerRes = await axios.get(`https://api.deezer.com/track/isrc:${res.data.external_ids.isrc}`);
		return this.builder.buildTrack(res.data, deezerRes.data.id, requester);
	}

	public async fetchAlbum(query: string, requester: unknown) {
		const res = await axios.get(`${this.apiURL}/albums/${query}`, {
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
			},
		});

		const deezerRes = await axios.get(`https://api.deezer.com/album/upc:${res.data.external_ids.upc}`);
		return this.builder.buildAlbum(res.data, deezerRes.data.id, requester);
	}

	public async fetchPlaylist(id: string, requester: unknown) {
		const res = await axios.get(`${this.apiURL}/playlists/${id}`, {
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
			},
		});

		// TODO: Somehow lift the 100 song limit that the API imposes.

		return this.builder.buildPlaylist(res.data, requester);
	}
}

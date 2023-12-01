import { ResolveResponse, ResultTypes } from '../Manager';
import { Album, Playlist, Track } from '../Models';
import axios from 'axios';

export class Deezer {
	/** The public APIs URL. */
	private readonly publicAPI: string = 'https://api.deezer.com';
	/** The regex for standard Deezer links. */
	private readonly deezerRegex: RegExp = /^(https?:\/\/)?deezer\.com\/(?<countrycode>[a-zA-Z]{2}\/)?(?<type>track|album|playlist|artist)\/(?<identifier>[0-9]+)/;
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

		const identifier = songQuery.match(this.deezerRegex) || null;
		switch (identifier?.groups?.type) {
		case 'album':
			return {
				type: ResultTypes.ALBUM,
				info: await this.fetchAlbum(identifier.groups.identifier, requester),
			};
		case 'track':
			return {
				type: ResultTypes.TRACK,
				info: await this.fetchSong(identifier.groups.identifier, requester),
			};
		case 'playlist':
			return {
				type: ResultTypes.PLAYLIST,
				info: await this.fetchPlaylist(identifier.groups.identifier, requester),
			};
		default:
			return {
				type: ResultTypes.SEARCH,
				info: await this.fetchQuery(query, requester),
			};
		}
	}

	/**
	 * Fetches the data regarding the specified query from the Deezer API then turns it into a Disrupt Track.
	 * @param query The query that will be searched for.
	 * @param requester The person that requested the song.
	 * @returns A track.
	 */
	private async fetchQuery(query: string, requester: unknown) {
		const res = await axios.get(`${this.publicAPI}/search?q=${encodeURIComponent(query)}`) as { data: APIQuery };

		return new Track({
			id: res.data.data[0].id,
			artist: res.data.data[0].artist.name,
			title: res.data.data[0].title,
			isrc: undefined,
			uri: res.data.data[0].link,
			duration: res.data.data[0].duration,
			artworkUrl: this.buildArtworkUrl(res.data.data[0].md5_image),
			source: 'deezer',
			requester,
		});
	}

	/**
	 * Fetches the data regarding the provided track from the Deezer API then turns it into a Disrupt Track.
	 * @param query The track that the data will be fetched for.
	 * @param requester The person that requested the song.
	 * @returns A track.
	 */
	private async fetchSong(query: string, requester: unknown) {
		const res = await axios.get(`${this.publicAPI}/track/${query}`) as { data: APITrack };

		return new Track({
			id: res.data.id,
			artist: res.data.artist.name,
			title: res.data.title,
			isrc: res.data.isrc,
			uri: res.data.link,
			duration: res.data.duration,
			artworkUrl: this.buildArtworkUrl(res.data.md5_image),
			source: 'deezer',
			requester,
		});
	}

	/**
	 * Fetches the data regarding the provided album from the Deezer API then turns it into a Disrupt Album.
	 * @param query The album that the data will be fetched for.
	 * @param requester The person that requested the album.
	 * @returns An album object.
	 */
	private async fetchAlbum(query: string, requester: unknown) {
		const res = await axios.get(`${this.publicAPI}/album/${query}`) as { data: APIAlbum };

		return new Album({
			id: res.data.id,
			artist: res.data.artist.name,
			title: res.data.title,
			uri: res.data.link,
			upc: res.data.upc,
			duration: res.data.duration,
			artworkUrl: res.data.cover_big,
			source: 'deezer',
			tracks: res.data.tracks.data.map((track) => new Track({
				id: track.id,
				artist: track.artist.name,
				title: track.title,
				isrc: track.isrc,
				uri: track.link,
				duration: track.duration,
				artworkUrl: this.buildArtworkUrl(track.md5_image),
				source: 'deezer',
				requester,
			})),
		});
	}

	/**
	 * Fetches the data regarding the provided playlist from the Deezer API then turns it into a Disrupt Playlist.
	 * @param query The playlist that the data will be fetched for.
	 * @param requester The person that requested the playlist.
	 * @returns An album object.
	 */
	private async fetchPlaylist(query: string, requester: unknown) {
		const res = await axios.get(`${this.publicAPI}/playlist/${query}`) as { data: APIPlaylist };
		return new Playlist({
			id: res.data.id,
			title: res.data.title,
			creator: res.data.creator.name,
			duration: res.data.duration,
			uri: res.data.link,
			artworkUrl: res.data.picture_big,
			source: 'deezer',
			tracks: res.data.tracks.data.map((track) => new Track({
				id: track.id,
				artist: track.artist.name,
				title: track.title,
				isrc: track.isrc,
				uri: track.link,
				duration: track.duration,
				artworkUrl: this.buildArtworkUrl(track.md5_image),
				source: 'deezer',
				requester,
			})),
		});
	}

	/**
	 * Turns the share URL into a normal Deezer URL.
	 * @param query The share URL.
	 * @returns The normal standard Deezer URL.
	 */
	private async resolveShareUrl(query: string) {
		const res = await axios.get(query);
		return `https://deezer.com${res.request.path}`;
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

type APIQuery = {
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

type APITrack = {
	/** The track's ID. */
	id: string;
	/** The artist's name. */
	artist: {
		name: string;
	};
	/** The name of the song. */
	title: string;
	/** The link to the song. */
	link: string;
	/** The MD5 hash of the artwork. */
	md5_image?: string;
	/** The song's ISRC. */
	isrc?: string;
	/** The duration of the song (in ms). */
	duration: number;
}

type APIAlbum = {
	/** The ID of the album. */
	id: string;
	/** The album's artist object. */
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


import { Album, Playlist, Track } from '../../Models';

interface ISPBuilder {
    buildTrack(data: SPTrackData, id: string, requester: unknown): Track;
    buildAlbum(data: SPAlbumData, id: string, requester: unknown): Album;
    buildPlaylist(data: SPPlaylistData, requester: unknown): Playlist;
}

export class SpotifyBuilder implements ISPBuilder {
	/**
     * Builds the raw Spotify API data into a Disrupt Track.
     * @param data The raw data from the Spotify API.
	 * @param id The ID of the song (fetched from the Deezer API, except for Spotify).
	 * @param requester The person that requested the song.
     * @returns A track.
     */
	public buildTrack(data: SPTrackData, id: string, requester: unknown): Track {
		return new Track({
			id,
			artist: data.artists.map((artist) => `${artist.name}, `).toString(),
			title: data.name,
			isrc: data.external_ids.isrc,
			uri: data.external_urls.spotify,
			duration: data.duration_ms,
			artworkUrl: data.images?.[0]?.url ?? data.album.images[0].url,
			source: 'spotify',
			requester,
		});
	}

	/**
     * Builds the raw Spotify API data into a Disrupt Album.
     * @param data The raw data from the Spotify API.
	 * @param id The ID of the album (fetched from the Deezer API).
	 * @param requester The person that requested the song.
     * @returns An album object.
     */
	public buildAlbum(data: SPAlbumData, id: string, requester: unknown): Album {
		return new Album({
			id,
			artist: data.artists.map((artist) => `${artist.name}, `).toString(),
			title: data.name,
			uri: data.external_urls.spotify,
			duration: data.duration_ms,
			artworkUrl: data.images[0].url,
			tracks: data.tracks.map((track) => this.buildTrack(track, id, requester)),
			source: 'spotify',
		});
	}

	/**
	 * Builds the raw Spotify API data into a Disrupt Playlist.
	 * @param data The raw data from the Spotify API.
	 * @param requester The person that requested the song.
	 * @returns An playlist object.
	 */
	public buildPlaylist(data: SPPlaylistData, requester: unknown): Playlist {
		return new Playlist({
			id: data.id,
			title: data.name,
			creator: data.owner.display_name,
			uri: data.external_urls.spotify,
			artworkUrl: data.images[0].url,
			tracks: data.tracks.items.map((tData) => this.buildTrack(tData.track, tData.track.id, requester)),
			source: 'spotify',
		});
	}
}

export type SPTrackData = {
    id: string;
    name: string;
	album: {
		images: {
			url: string;
		}[];
	}
	external_urls: {
		spotify: string;
	};
	external_ids: {
		isrc: string;
	};
	artists: {
		name: string;
	}[];
	duration_ms: number;
	images: {
		url: string;
	}[];
}

type SPAlbumData = {
	id: string;
	name: string;
	external_ids: {
		upc: string;
	};
	external_urls: {
		spotify: string;
	};
	artists: {
		name: string;
	}[];
	duration_ms: number;
	images: {
		url: string;
	}[];
	tracks: SPTrackData[];
}

type SPPlaylistData = {
	id: string;
	name: string;
	external_urls: {
		spotify: string;
	};
	images: {
		url: string;
	}[];
	owner: {
		display_name: string;
	};
	tracks: {
		items: {
			track: SPTrackData;
		}[];
	};
}
import { Album, Playlist, Track } from '../../Models';
import m3u8stream from 'm3u8stream';

interface ISCBuilder {
    buildTrack(data: SCTrackData): Track;
    buildAlbum(data: SCAlbumData): Album;
    // buildPlaylist(data: SCPlaylistData): Playlist;
}

export class SoundCloudBuilder implements ISCBuilder {
	/**
     * Builds the raw Deezer API data into a Disrupt Track.
     * @param data The raw data from the Deezer API.
     * @returns A track.
     */
	public buildTrack(data: SCTrackData): Track {
		return new Track({
			id: data.id,
			artist: data.publisher_metadata.artist ?? 'A Talented Artist',
			title: data.title,
			isrc: data.publisher_metadata.isrc,
			uri: data.permalink_url,
			duration: data.duration,
			artworkUrl: data.artwork_url,
			source: 'soundcloud',
			transcodedUrl: data.media.transcodings[2].url,
		});
	}

	/**
     * Builds the raw Deezer API data into a Disrupt Album.
     * @param data The raw data from the Deezer API.
     * @returns An album object.
     */
	public buildAlbum(data: SCAlbumData): Album {
		return new Album({
			id: data.id,
			artist: data.tracks[0].publisher_metadata.artist ?? 'Unknown',
			title: data.title,
			uri: data.permalink_url,
			duration: data.duration,
			artworkUrl: data.artwork_url,
			tracks: data.tracks.map((track) => this.buildTrack(track)),
			source: 'soundcloud',
		});
	}

	/**
	 * Builds the raw Deezer API data into a Disrupt Playlist.
	 * @param data The raw data from the Deezer API.
	 * @param tracks
	 * @returns An playlist object.
	 */
	public buildPlaylist(data: SCPlaylistData, tracks: SCTrackData[]): Playlist {
		return new Playlist({
			id: data.id,
			title: data.title,
			creator: data.username,
			duration: data.duration,
			uri: data.permalink_url,
			artworkUrl: data.artwork_url,
			source: 'soundcloud',
			tracks: tracks.map((track) => this.buildTrack(track)),
		});
	}
}

export type SCTrackData = {
    id: string;
    title: string;
	permalink_url: string;
    artwork_url: string;
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
    stream?: m3u8stream.Stream;
}

type SCAlbumData = {
    id: string;
    title: string;
    permalink_url: string;
    artwork_url: string;
    duration: number;
    tracks: SCTrackData[];
}

type SCPlaylistData = {
	id: string;
	title: string;
	permalink_url: string;
	artwork_url: string;
	duration: number;
	username: string;
	tracks: {
		id: string;
	}[];
}
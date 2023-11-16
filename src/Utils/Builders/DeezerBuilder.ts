import { Album, Playlist, Track } from '../../Models';
import { Readable } from 'stream';

interface IDZBuilder {
    buildTrack(data: DZTrackData, requester: unknown): Track;
    buildAlbum(data: DZAlbumData, requester: unknown): Album;
    buildPlaylist(data: DZPlaylistData, requester: unknown): Playlist;
}

export class DeezerBuilder implements IDZBuilder {
	/**
     * Builds the raw Deezer API data into a Disrupt Track.
     * @param data The raw data from the Deezer API.
     * @param requester The person that requested the song.
     * @returns A track.
     */
	public buildTrack(data: DZTrackData, requester: unknown): Track {
		return new Track({
			id: data.id,
			artist: data.artist.name,
			title: data.title,
			isrc: data.isrc,
			uri: data.link,
			duration: data.duration,
			artworkUrl: this.buildArtworkUrl(data.md5_image),
			source: 'deezer',
			requester,
		});
	}

	/**
     * Builds the raw Deezer API data into a Disrupt Album.
     * @param data The raw data from the Deezer API.
     * @param requester The person that requested the song.
     * @returns An album object.
     */
	public buildAlbum(data: DZAlbumData, requester: unknown): Album {
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

	/**
     * Builds the raw Deezer API data into a Disrupt Playlist.
     * @param data The raw data from the Deezer API.
     * @param requester The person that requested the song.
     * @returns An playlist object.
     */
	public buildPlaylist(data: DZPlaylistData, requester: unknown): Playlist {
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

	/**
     * Builds the URL of the track image.
     * @param hash The MD5 image hash from the Deezer API.
     * @returns The full URL to the artwork.
     */
	private buildArtworkUrl(hash: string): string {
		return `https://e-cdn-images.dzcdn.net/images/cover/${hash}/500x500-000000-80-0-0.jpg`;
	}
}

type DZTrackData = {
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
    /** The readable stream provided by the Deezer Media API. */
    stream?: Readable;
}

type DZAlbumData = {
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
        data: DZTrackData[];
    };
}

type DZPlaylistData = {
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
        data: DZTrackData[];
    };
}
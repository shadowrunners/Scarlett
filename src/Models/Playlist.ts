import { Track } from './Track';

/** This is Disrupt's Playlist class. Used for creating playlist metadata. */
export class Playlist implements PlaylistData {
	/** The playlist's ID on the specific platform. */
	public id: string;
	/** The playlist's title. */
	public title: string;
	/** The playlist creator's name. */
	public creator: string;
	/** The playlist's duration. */
	public duration?: number;
	/** The playlist's link on the specific platform. */
	public uri: string;
	/** The artwork URL of the playlist. */
	public artworkUrl: string;
	/** The source that fetched the playlist. */
	public source: string;
	/** The array of fetched tracks. */
	public tracks: Track[];

	constructor(data: PlaylistData) {
		this.id = data.id;
		this.title = data.title;
		this.creator = data.creator;
		this.duration = data.duration;
		this.uri = data.uri;
		this.artworkUrl = data.artworkUrl;
		this.tracks = data.tracks;
	}
}

interface PlaylistData {
    id: string;
    creator: string;
    title: string;
    uri: string;
	artworkUrl: string;
    duration?: number;
    source: string;
    tracks: Track[];
}
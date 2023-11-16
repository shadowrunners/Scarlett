import { Track } from './Track.js';

/** This is Disrupt's Album class. Used for creating album metadata. */
export class Album {
	/** The album's ID on the specific platform.*/
	public id: string;
	/** The album's title. */
	public title: string;
	/** The artist of the album. (optional) */
	public artist?: string | string[];
	/** The duration of the album. */
	public duration: number;
	/** The link to the album. */
	public uri: string;
	/** The URL to the artwork of the album. */
	public artworkUrl: string;
	/** The source that fetched the album. */
	public source: string;
	/** The album's UPC (similar to ISRC but for albums). */
	public upc?: string;
	/** The array of fetched tracks. */
	public tracks: Track[];

	constructor(data: AlbumData) {
		this.id = data.id;
		this.title = data.title;
		this.artist = data.artist ?? null;
		this.duration = data.duration;
		this.uri = data.uri;
		this.artworkUrl = data.artworkUrl;
		this.tracks = data.tracks;
		this.upc = data.upc;
	}
}

type AlbumData = {
    id: string;
    artist: string;
    title: string;
    uri: string;
    upc?: string;
    source: string;
    artworkUrl: string;
    duration: number;
    tracks: Track[];
}
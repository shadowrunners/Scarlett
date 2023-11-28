import { Track } from './Track';

/** This is Disrupt's Album class. Used for creating album metadata. */
export class Album implements AlbumData {
	/** The album's ID on the specific platform.*/
	public id: string;
	/** The album's title. */
	public title: string;
	/** The artist of the album. (optional) */
	public artist?: string;
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

	constructor(data: AlbumData, source: string) {
		this.id = data.id;
		this.title = data.title;
		this.artist = data.artist ?? null;
		this.duration = data.duration;
		this.uri = data.uri;
		this.artworkUrl = data.artworkUrl;
		this.source = source;
		this.tracks = data.tracks;
		this.upc = data.upc;
	}
}

type AlbumData = {
    /** The album's ID on the specific platform. */
    id: string;
    /** The artist performing the album. */
    artist?: string;
    /** The name of the album. */
    title: string;
    /** The URL to the album on the specific platform. */
    uri: string;
    /** The URL to the artwork of the album on the specific platform. */
    artworkUrl: string;
    /** The duration of the album. */
    duration: number;
    /** The array of tracks. */
    tracks: Track[];
    /** The UPC of album (used to find it on other platforms). */
    upc?: string;
    /** The source from where the album data was fetched from. */
    source: string;
}
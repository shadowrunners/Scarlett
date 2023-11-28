import { PassThrough } from 'node:stream';

/** This is Disrupt's Track class. Used for creating track metadata. */
export class Track implements TrackData {
	/** The track's ID on the specific platform. */
	public id: string;
	/** The track's title. */
	public title: string;
	/** The track's artist. */
	public artist: string;
	/** The track's duration. */
	public duration: number;
	/** The track's URL on the specific platform. */
	public uri: string;
	/** The track's IRC. */
	public isrc?: string;
	/** The artwork URL of the song. */
	public artworkUrl: string;
	/** The source that fetched the track. */
	public source: string;
	/** The transcoded stream URL (only available for SoundCloud tracks). */
	public transcodedUrl?: string;
	/** The song's passthrough. Used to play back the song. */
	public stream?: PassThrough;
	/** The person that queued up the song. */
	public requester: unknown;

	constructor(data: TrackData) {
		this.id = data.id;
		this.artist = data.artist;
		this.title = data.title;
		this.isrc = data.isrc;
		this.duration = data.duration;
		this.artworkUrl = data.artworkUrl;
		this.uri = data.uri;
		this.source = data.source;
		this.transcodedUrl = data.transcodedUrl;
		this.requester = data.requester;
		this.stream = data.stream;
	}
}

type TrackData = {
    /** The ID of the track on the specific platform. */
    id: string;
    /** The artist(s) performing the track. */
    artist: string;
    /** The name of the song. */
    title: string;
    /** The ISRC of the song (used to find it on other platforms). */
    isrc?: string;
    /** The duration of the track. */
    duration: number;
    /** The URL to the artwork of the song on the specific platform. */
    artworkUrl: string;
    /** The URL to the song on the specific platform. */
    uri: string;
    /** The source from where the song data was fetched from. */
    source: string;
    /** The URL to the transcoded stream (only for SoundCloud). */
	transcodedUrl?: string;
    /** The person that requested the song. */
	requester: unknown;
    /** The song's audio stream (only for Deezer). */
	stream?: PassThrough;
}

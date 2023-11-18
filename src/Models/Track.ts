import { Readable } from 'node:stream';

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
	/** The song's readable stream. Used to play back the song. */
	public stream?: Readable;
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
	}
}

type TrackData = {
    id: string;
    artist: string;
    title: string;
    isrc?: string;
    duration: number;
    artworkUrl: string;
    uri: string;
    source: string;
	transcodedUrl?: string;
	requester: unknown;
}
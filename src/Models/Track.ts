import { Readable } from "node:stream";

/** This is Disrupt's Track class. Used for creating track metadata. */
export class Track {
    /** The track's ID on the specific platform. */
    public id: string;
    /** The track's title. */
    public title: string;
    /** The track's artist. */
    public artist: string;
    /** The track's duration. */
    public duration: number;
    /** The track's link on the specific platform. */
    public link: string;
    /** The artwork URL of the song. */
    public artworkURL: string;
    /** The source that fetched the track. */
    public source: string;
    /** The transcoded stream URL (only available for SoundCloud tracks). */
    public transcodedUrl?: string;
    /** The song's readable stream. Used to play back the song. */
    public stream?: Readable;

    constructor(data: TrackData, source: string) {
        this.id = data.id;
        this.artist = data.artist;
        this.title = data.title;
        this.duration = data.duration;
        this.artworkURL = data.artworkUrl;
        this.link = data.link;
        this.source = source;
    }
}

interface TrackData {
    id: string;
    artist: string;
    title: string;
    duration: number;
    artworkUrl: string;
    link: string;
};
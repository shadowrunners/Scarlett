import { Track } from "./Track";

/** This is Disrupt's Playlist class. Used for creating playlist metadata. */
export class Playlist {
    /** The playlist's ID on the specific platform. */
    public id: string;
    /** The playlist's title. */
    public title: string;
    /** The playlist creator's name. */
    public creator: string;
    /** The playlist's duration. */
    public duration: number;
    /** The playlist's link on the specific platform. */
    public link: string;
     /** The artwork URL of the playlist. */
    public artworkURL: string;
    /** The source that fetched the playlist. */
    public source: string;
    /** The array of fetched tracks. */
    public tracks: Track[];

    constructor(data: PlaylistData, source: string) {
        this.id = data.id;
        this.title = data.title;
        this.creator = data.creator;
        this.duration = data.duration;
        this.link = data.link;
        this.artworkURL = data.artworkURL;
        this.source = source;
        this.tracks = data.tracks;
    }
}

interface PlaylistData {
    id: string;
    creator: string;
    title: string;
    link: string;
    artworkURL: string;
    duration: number;
    tracks: Track[];
}
import { Track } from "./Track";

/** This is Disrupt's Album class. Used for creating album metadata. */
export class Album {
    /** The album's ID on the specific platform.*/
    public id: string;
    /** The album's title. */
    public title: string;
    /** The artist of the album. (optional) */
    public artist?: string;
    /** The duration of the album. */
    public duration: number;
    /** The label that distributed the album. */
    public label?: string;
    /** The link to the album. */
    public link: string;
    /** The URL to the artwork of the album. */
    public artworkURL: string;
    /** The source that fetched the album. */
    public source: string;
    /** The array of fetched tracks. */
    public tracks: Track[];

    constructor(data: AlbumData, source: string) {
        this.id = data.id;
        this.title = data.title;
        this.artist = data.artist ?? null;
        this.duration = data.duration;
        this.label = data.label ?? null;
        this.link = data.link;
        this.artworkURL = data.artworkURL;
        this.source = source;
        this.tracks = data.tracks;
    }
}

interface AlbumData {
    id: string;
    artist: string;
    title: string;
    link: string;
    artworkURL: string;
    label: string;
    duration: number;
    tracks: Track[];
}
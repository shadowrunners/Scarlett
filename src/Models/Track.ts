import { Readable } from "node:stream";

export class Track {
    id: string;
    link: string;
    title: string;
    artworkURL: string;
    stream?: Readable;
    artist: string
    duration: any;
    source: string;

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
}
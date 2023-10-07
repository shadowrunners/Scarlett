import { Readable } from "stream";
import { Track } from "./Track";

export class Album {
    id: string;
    title: string;
    artist: string;
    duration: number;
    label: string;
    link: string;
    artworkURL: string;
    stream?: Readable;
    source: string;
    tracks: Track[]

    constructor(data: AlbumData, source: string) {
        this.id = data.id;
        this.artist = data.artist;
        this.title = data.title;
        this.duration = data.duration;
        this.artworkURL = data.artworkURL;
        this.link = data.link;
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
import { Readable } from "stream";
import { Track } from "./Track";

export class Playlist {
    id: string;
    title: string;
    creator: string;
    duration: number;
    link: string;
    artworkURL: string;
    stream?: Readable;
    source: string;
    tracks: Track[]

    constructor(data: PlaylistData, source: string) {
        this.id = data.id;
        this.creator = data.creator;
        this.title = data.title;
        this.duration = data.duration;
        this.artworkURL = data.artworkURL;
        this.link = data.link;
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
import { Readable } from "node:stream";

export class DeezerTrack {
    id: string;
    link: string;
    title: string;
    md5_image: string;
    stream?: Readable;

    constructor(data: TrackData, stream: Readable) {
        this.id = data.id
        this.link = data.link;
        this.title = data.title;
        this.md5_image = data.md5_image;
        this.stream = stream;
    }
}

interface TrackData {
    id: string;
    title: string;
    link: string;
    md5_image: string;
    stream?: Readable;
}
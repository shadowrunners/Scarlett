import axios from "axios";
import { Manager } from "../../../Manager";
import m3u8 from 'm3u8stream';
import { Builder } from "../../../Utils/Builder";

export class SoundCloud {
    private clientId: string;
    private apiURL: string;
    private builder: Builder;
    
    constructor(scarlett: Manager) {
        this.apiURL = 'https://api-v2.soundcloud.com';
        this.clientId = scarlett.options.sources.soundcloud.clientId;
        this.builder = new Builder();
    }

    public async resolve(query: string) {
        return await this.fetchSong(query);
    }

    private async fetchSong(query: string) {
        const res = await axios.get(`${this.apiURL}/resolve?url=${query}&client_id=${this.clientId}`);
        const jsonResponse = res.data as APIResponse;
        const media = await this.stream(jsonResponse.media.transcodings[2].url);

        return this.builder.buildSCTrack(jsonResponse, media);
    }

    private async stream(transcodedUrl: string) {
        const m3u8Stream = await axios.get(`${transcodedUrl}?client_id=${this.clientId}`);
        return m3u8(m3u8Stream.data.url);
    }
}

interface APIResponse {
    id: string;
    artwork_url: string;
    title: string;
    permalink: string;
    duration: number;
    media: {
        transcodings: [
            {
               url: string; 
            },
            {
                url: string; 
            },
            {
                url: string; 
            },
        ]
    }
}
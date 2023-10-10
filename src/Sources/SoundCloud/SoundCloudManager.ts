import { ResolveResponse, ResultTypes } from "../../Manager";
import { Builder } from "../../Utils/Builder";
import axios from "axios";

/** This is Disrupt's SoundCloud source manager. Used for resolving SoundCloud links. */
export class SoundCloud {
    /** The client ID used to call the API. */
    private clientId: string;
    /** The URL of the API. */
    private apiURL: string;
    /** The builder class used to build track and album metadata. */
    private builder: Builder;
    /** The regex used to detect SoundCloud links. */
    private scRegex: RegExp;
    
    constructor() {
        this.apiURL = 'https://api-v2.soundcloud.com';
        this.builder = new Builder();

        this.scRegex = /^(https?:\/\/)?(?:www\.)?soundcloud\.com\/([^/]+)\/(sets\/[^/]+|[^/]+)\/?$/;
    }

    /**
     * Fetches the query based on the regex.
     * @param query The link of the track / album / playlist or the query.
     * @returns The appropriate response.
     */
    public async resolve(query: string): Promise<ResolveResponse> {
        const identifier = query.match(this.scRegex) || null;
        console.log(identifier)

        if (!identifier) return {
            type: ResultTypes.SEARCH,
            info: await this.fetchQuery(query),
        }

        if (identifier[3] && identifier[3].startsWith('sets')) return {
            type: ResultTypes.ALBUM,
            info: await this.fetchPlaylist(query),
        }

        return {
            type: ResultTypes.TRACK,
            info: await this.fetchSong(query),
        }
    }

    private async fetchQuery(query: string) {
        const res = await axios.get(`${this.apiURL}/search/tracks?q=${query}&client_id=${this.clientId}`);
        const jsonResponse = res.data as SearchResult;

        return this.builder.buildSCTrack(jsonResponse.collection[0]);
    }

    private async fetchSong(query: string) {
        const res = await axios.get(`${this.apiURL}/resolve?url=${query}&client_id=${this.clientId}`);
        const jsonResponse = res.data as APIResponse;

        return this.builder.buildSCTrack(jsonResponse);
    }

    private async fetchPlaylist(query: string) {
        const res = await axios.get(`${this.apiURL}/resolve?url=${query}&client_id=${this.clientId}`);
        const jsonResponse = res.data as APIResponse;

        return this.builder.buildSCPlaylist(jsonResponse);
    }
}

interface SearchResult {
    collection: APIResponse[];
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
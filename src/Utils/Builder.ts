import stream, { Readable } from "stream";
import { Track } from "..";
import m3u8stream from "m3u8stream";
import { Album } from "../Models/Album";
import { Deezer } from "../Sources/Deezer/DeezerManager";
import { Playlist } from "../Models/Playlist";

/** This is Disrupt's Builder class. Used for building raw metadata into tracks, albums and playlists. */
export class Builder {
    constructor() {}

    /**
     * Builds the raw Deezer API data into a prettified Track object.
     * @param data The raw data from the Deezer API.
     * @returns A track object.
     */
    public buildDeezerTrack(data: DeezerTrackData) {
        const track: Track = {
            id: data.id,
            artist: data.artist.name,
            title: data.title,
            link: data.link,
            artworkURL: `https://e-cdn-images.dzcdn.net/images/cover/${data.md5_image}/500x500-000000-80-0-0.jpg`,
            source: 'deezer',
            stream: null,
            duration: data.duration,
        };

        return track;
    }

    /**
     * Builds the raw Deezer API data into a prettified Album object.
     * @param data The raw data from the Deezer API.
     * @returns An album object.
     */
    public buildDeezerAlbum(data: DeezerAlbumData) {
        const album: Album = {
            id: data.id,
            title: data.title,
            link: data.link,
            artworkURL: data.cover_big,
            label: data.label,
            artist: data.artist.name,
            source: 'deezer',
            tracks: data.tracks.data.map((track) => this.buildDeezerTrack(track)),
            duration: data.duration,
        }

        return album;
    }

    /**
     * Builds the raw Deezer API data into a prettified Playlist object.
     * @param data The raw data from the Deezer API.
     * @returns An playlist object.
     */
    public buildDeezerPlaylist(data: DeezerPlaylistData) {
        const playlist: Playlist = {
            id: data.id,
            title: data.title,
            artworkURL: data.picture_big,
            duration: data.duration,
            link: data.link,
            creator: data.creator.name,
            tracks: data.tracks.data.map((track) => this.buildDeezerTrack(track)),
            source: "deezer"
        }

        return playlist;
    }

    /**
     * Builds the raw SoundCloud API data into a prettified Track object.
     * @param data The raw data from the SoundCloud API.
     * @returns A track object.
     */
    public buildSCTrack(data: SCTrackData) {
        const track: Track = {
            id: data.id,
            title: data.title,
            link: data.permalink,
            artworkURL: data.artwork_url,
            duration: data.duration,
            artist: null,
            transcodedUrl: data.media.transcodings[2].url,
            source: 'soundcloud',
        };

        return track;
    }

    /**
     * Builds the raw SoundCloud API data into a prettified Album object.
     * @param data The raw data from the SoundCloud API.
     * @returns An album object.
     */
    public buildSCAlbum(data: SCAlbumData) {
        const album: Album = {
            id: data.id,
            title: data.title,
            link: data.permalink_url,
            artworkURL: data.artwork_url,
            duration: data.duration,
            source: 'soundcloud',
            tracks: data.tracks.map((track) => this.buildSCTrack(track))
        };

        return album;
    }

    /**
     * Builds the raw SoundCloud API data into a prettified Playlist object.
     * @param data The raw data from the SoundCloud API.
     * @returns A playlist object.
     */
    public buildSCPlaylist(data: SCTrackData) {
        const track: Track = {
            id: data.id,
            title: data.title,
            link: data.permalink,
            artworkURL: data.artwork_url,
            duration: data.duration,
            artist: null,
            source: 'soundcloud',
        };

        return track;
    }

    // TODO: Implement.
    // Placeholders for now.
    private buildBandcampTrack() {}
    private buildSpotifyTrack() {}
}

interface DeezerAlbumData {
    id: string;
    artist: {
        name: string;
    };
    title: string;
    link: string;
    cover_big: string;
    label: string;
    duration: number;
    tracks: {
        data: DeezerTrackData[];
    };
}

interface DeezerPlaylistData {
    id: string;
    title: string;
    description: string;
    duration: number;
    link: string;
    picture_big: string;
    creator: {
        name: string;
    };
    tracks: {
        data: DeezerTrackData[];
    }
}


export interface DeezerTrackData {
    id: string;
    artist: {
        name: string;
    };
    title: string;
    link: string;
    md5_image?: string;
    duration: number;
    stream?: Readable;
}

interface SCTrackData {
    id: string;
    title: string;
    permalink: string;
    artwork_url: string;
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
    stream?: m3u8stream.Stream;
}

interface SCAlbumData {
    id: string;
    title: string;
    permalink_url: string;
    artwork_url: string;
    duration: number;
    tracks: SCTrackData[];
}
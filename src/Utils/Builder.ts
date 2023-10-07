import stream, { Readable } from "stream";
import { Track } from "..";
import m3u8stream from "m3u8stream";
import { Album } from "../Models/Album";
import { Deezer } from "../Sources/Deezer/DeezerManager";
import { Playlist } from "../Models/Playlist";

export class Builder {
    constructor() {}

    buildDeezerTrack(data: DeezerTrackData) {
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

    buildDeezerAlbum(data: DeezerAlbumData) {
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

    buildDeezerPlaylist(data: DeezerPlaylistData) {
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

    buildSCTrack(data: SCTrackData) {
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

    buildSCAlbum(data: SCTrackData) {
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
    
    buildSCPlaylist(data: SCTrackData) {
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
    buildBandcampTrack() {}
    buildSpotifyTrack() {}
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
    stream?: m3u8stream.Stream;
}
import { ResolveResponse, ResultTypes } from '../Manager';
import { Album, Track } from '../Models';
import axios from 'axios';

/** This is Disrupt's Bandcamp source manager. Used for resolving Bandcamp links. */
export class Bandcamp {
	public async resolve(query: string, requester: unknown): Promise<ResolveResponse> {
		const bandData = await axios.get(query);
		const data = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(bandData.data);
		const matches = JSON.parse(data[1]) as BandcampResponse;

		if (!matches) return { type: ResultTypes.EMPTY, info: {} };

		switch (matches['@type']) {
		case 'MusicAlbum':
			return {
				type: ResultTypes.ALBUM,
				info: new Album({
					artist: matches.byArtist.name,
					artworkUrl: matches.image,
					duration: 0,
					id: matches['id'],
					source: 'bandcamp',
					title: matches.name,
					tracks: matches.track.itemListElement.map((track) => this.buildTracks(matches, track.item, requester)),
					uri: query,
				}),
			};
		case 'MusicRecording':
			return {
				type: ResultTypes.TRACK,
				info: new Track({
					artist: matches.byArtist.name,
					artworkUrl: matches.image,
					duration: 0,
					id: matches['id'],
					source: 'bandcamp',
					title: matches.name,
					uri: query,
					requester,
				}),
			};
		}
	}

	/**
     * Builds the Bandcamp tracks.
     * @param data The raw data about the album.
     * @param trackData The raw data about the array of tracks.
     * @param requester The person who requested the album (gets appended to all tracks).
     */
	private buildTracks(data: BandcampResponse, trackData: AlbumTrack, requester: unknown) {
		return new Track({
			artist: data.byArtist.name,
			artworkUrl: data.image,
			duration: 0,
			id: trackData['@id'],
			requester,
			source: 'bandcamp',
			title: trackData.name,
			uri: trackData['@id'],
		});
	}
}

type BandcampResponse = {
    /** The resource's ID. */
    '@id' : string;
    /** The resource's type. */
    '@type': string;
    /** The name of the resource. */
    name: string;
    /** The artist information. */
    byArtist: {
        /** The artist's name. */
        name: string;
    };
    /** The resource's artwork. */
    image: string;
    /** The track array. */
    track: {
        itemListElement: {
            item: AlbumTrack;
        }[];
    }
}

type AlbumTrack = {
    '@type': string;
    '@id': string;
    additionalProperty: string[]
    name: string;
    duration: string;
}

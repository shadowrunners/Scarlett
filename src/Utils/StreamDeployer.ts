import { DeezerUtils } from './DeezerUtils';
import { Manager } from '../Manager';
import { Track } from '../Models';

import m3u8 from 'm3u8stream';
import axios from 'axios';
import { opus } from 'prism-media';

export class StreamDeployer {
	private readonly dzUtils: DeezerUtils;
	private readonly scClientId: string;
	private readonly SLRegex: RegExp = /https:\/\/t4\.bcbits\.com\/stream\/(?<hash1>[^/]+)\/mp3-128\/(?<hash2>[^?]+)\?p=0&amp;ts=(?<timestamp>\d+)&amp;t=(?<token>[^&]+)&amp;token=(?<token_timestamp>\d+)_(?<token_hash>[^&]+)/;

	constructor(disrupt: Manager) {
		// TODO: Implement Apple Music. Eventually at least.
		this.dzUtils = new DeezerUtils(
			disrupt.options.sources.deezer.masterKey,
			disrupt,
			disrupt.options.sources.deezer.arl,
		);
		this.scClientId = disrupt.options.sources.soundcloud.clientId;
	}

	/**
	 * Gets the platform-specific stream.
	 * @async
	 * @param track The track object.
	 * @param source The music service the query comes from.
	 * @returns The platform-specific stream.
	 */
	public async deployStream({ track, source }: { track: Track, source: string }): Promise<opus.Encoder | m3u8.Stream | string> {
		switch (source) {
		case 'spotify':
			return await axios.get(`https://api.deezer.com/track/isrc:${track.isrc}`).then(async (res) => {
				return await this.dzUtils.fetchMediaURL(res.data.id);
			});
		case 'deezer':
			return await this.dzUtils.fetchMediaURL(track.id);
		case 'soundcloud':
			return await this.getSoundCloudTranscode(track.transcodedUrl);
		case 'bandcamp':
			return await this.getBandcampStream(track.uri);
		case 'http':
			// returning back the URI so the media transcode from d.js voice can do its job.
			return track.uri;
		}
	}

	/**
     * Gets the SoundCloud transcoded stream.
     * @param transcodedUrl The URL to the m3u8 file.
     * @returns The transcoded stream.
     */
	private async getSoundCloudTranscode(transcodedUrl: string): Promise<m3u8.Stream> {
		const stream = await axios.get(`${transcodedUrl}?client_id=${this.scClientId}`);
		return m3u8(stream.data.url);
	}

	/**
	 * Gets the Bandcamp audio stream.
	 * @param url The URL of the song.
	 * @private
	 */
	private async getBandcampStream(url: string): Promise<string> {
		const res = await axios.get(url);

		// creds to lavaplayer for this method: https://github.com/sedmelluq/lavaplayer/blob/master/main/src/main/java/com/sedmelluq/discord/lavaplayer/source/bandcamp/BandcampAudioSourceManager.java#L132
		const trackInfo = /data-tralbum="(\{[^"]+})"/.exec(res.data);
		const streamingURL = this.SLRegex.exec(trackInfo[0]);
		return streamingURL[0];
	}
}
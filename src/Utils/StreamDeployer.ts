import { DeezerUtils } from './DeezerUtils';
import { Manager } from '../Manager';
import { Track } from '../Models';

import m3u8 from 'm3u8stream';
import axios from 'axios';

export class StreamDeployer {
	private readonly dzUtils: DeezerUtils;
	private readonly scClientId: string;

	constructor(disrupt: Manager) {
		// TODO: Implement TIDAL, Apple Music and Spotify. Eventually at least.
		this.dzUtils = new DeezerUtils(disrupt.options.sources.deezer.masterKey);
		this.scClientId = disrupt.options.sources.soundcloud.clientId;
	}

	/**
	 * Gets the platform-specific stream.
	 * @private
	 * @async
	 * @param track The track object.
	 * @param source The music service the query comes from.
	 * @returns The platform-specific stream.
	 */
	public async deployStream({ track, source }: { track: Track, source: string }) {
		switch (source) {
		case 'spotify':
			return await axios.get(`https://api.deezer.com/track/isrc:${track.isrc}`).then(async (res) => {
				return await this.dzUtils.fetchMediaURL(res.data.id);
			});

			// case 'tidal':
			// Yes, TIDAL will use Deezer as their API requires an account w/ subscription.
		case 'deezer':
			return await this.dzUtils.fetchMediaURL(track.id);
		case 'soundcloud':
			return await this.getSoundCloudTranscode(track.transcodedUrl);
		}
	}

	/**
     * Gets the SoundCloud transcoded stream.
     * @private
     * @async
     * @param transcodedUrl The URL to the m3u8 file.
     * @returns The transcoded stream.
     */
	private async getSoundCloudTranscode(transcodedUrl: string) {
		const stream = await axios.get(`${transcodedUrl}?client_id=${this.scClientId}`);
		return m3u8(stream.data.url);
	}
}
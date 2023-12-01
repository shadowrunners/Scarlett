import { ResolveResponse, ResultTypes } from '../Manager';
import { Track } from '../Models';
import axios from 'axios';

/** This is Disrupt's HTTP source manager. Used for resolving HTTP links. */
export class HTTP {
	public async resolve(query: string, requester: unknown): Promise<ResolveResponse> {
		// Source is mostly going to be used for radio stations, therefore, fetch the ICECAST header data.
		const res = await axios.get(query, { responseType: 'stream' });

		return {
			type: ResultTypes.TRACK,
			info: new Track({
				id: undefined,
				artist: 'Unknown Artist',
				artworkUrl: undefined,
				duration: 0,
				requester,
				source: 'http',
				title: res.headers['icy-name'] ?? 'HTTP Stream',
				uri: query,
			}),
		};
	}
}
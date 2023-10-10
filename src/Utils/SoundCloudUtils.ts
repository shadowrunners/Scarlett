import m3u8 from 'm3u8stream';
import axios from 'axios';

export class SoundCloudUtils {
    /** The client ID that will be used to fetch the transcoded stream. */
    private clientId: string;

    constructor(clientId: string) {
        this.clientId = clientId;
    }

    /**
     * Gets the SoundCloud transcoded stream.
     * @param transcodedUrl The URL to the m3u8 file.
     * @returns The transcoded stream.
     */
    public async getTranscodedStream(transcodedUrl: string) {
        const stream = await axios.get(`${transcodedUrl}?client_id=${this.clientId}`);
        return m3u8(stream.data.url);
    }
}
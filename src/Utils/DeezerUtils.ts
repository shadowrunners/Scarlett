import { Blowfish } from './Blowfish/BFLib';
import { FFmpeg, opus } from 'prism-media';
import { createHash } from 'node:crypto';
import { PassThrough } from 'stream';
import { Manager } from '../Manager';
import axios, { AxiosInstance } from 'axios';
import { DisruptError } from './DisruptError';

/** The utilities built for the Deezer source. */
export class DeezerUtils {
	/** The FFmpeg instance. */
	private readonly ffmpeg: FFmpeg = new FFmpeg({
		args: [
			'-analyzeduration', '0',
			'-loglevel', '0',
			'-f', 's16le',
			'-ar', '48000',
			'-ac', '2',
		],
	});
	/** The URL of Deezer's Private API. */
	private readonly privateAPI: string = 'https://www.deezer.com/ajax/gw-light.php';
	/** The decryption key used to decrypt tracks. */
	private decryptionKey: string;

	/** The API key used to get song data. */
	private apiKey: string = null;
	/** The license token used to generate stream URLs. */
	private licenseToken: string = null;

	/** The IV used in the decryption process. */
	private blowfishIV: Uint8Array = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
	/** The account ARL used to get access to higher quality audio. */
	private arl?: string;

	/** The manager. */
	private disrupt: Manager;
	/** The Axios instance used to contact the Deezer API. */
	private axios: AxiosInstance = axios.create({
		baseURL: 'https://api.deezer.com/1.0',
		withCredentials: true,
		headers: {
			Accept: '*/*',
			'Accept-Encoding': 'gzip, deflate',
			'Accept-Language': 'en-US',
			'Cache-Control': 'no-cache',
			'Content-Type': 'application/json; charset=UTF-8',
			'User-Agent': 'Deezer/8.32.0.2 (iOS; 14.4; Mobile; en; iPhone10_5)',
		},
		params: {},
	});

	constructor(decryptionKey: string, disrupt: Manager, arl?: string) {
		this.decryptionKey = decryptionKey;
		this.disrupt = disrupt;
		this.arl = arl;
	}

	/**
	 * Builds the API request URL.
	 *
	 * @param {string} method - The API method name.
	 * @private
	 * @returns {string} The API request URL.
	 */
	private buildAPIRequest(method: string): string {
		return `${this.privateAPI}?method=${method}&input=3&api_version=1.0&api_token=${this.axios.defaults.params.api_token}`;
	}

	/** Fetches the API key and license token needed from the API. */
	private async fetchAPIKey() {
		const headers = this.arl ? { 'Cookie': `arl=${this.arl}` } : undefined;
		const sessionId = await this.axios.post<Session>(this.buildAPIRequest('deezer.ping'), '', { headers });
		this.axios.defaults.params.sid = sessionId.data.results.SESSION;

		const userToken = await this.axios.post<LicenseToken>(this.buildAPIRequest('deezer.getUserData'));
		this.licenseToken = userToken.data.results.USER.OPTIONS.license_token;

		// This'll check for the Web High Quality parameter in the API response.
		// If it's false, fallback to 128kbps mode.
		if (userToken.data.results.USER.OPTIONS.web_hq === true) {
			this.disrupt.emit('debug', '[DISRUPT - DEBUG] >> User has access to HQ audio. Switching to 320kbps audio mode.');
		}

		this.apiKey = userToken.data.results.checkForm;
		this.axios.defaults.params.api_token = this.apiKey;
	}

	/**
   * Fetches the media URL of the track.
	 * @param id The ID of the song.
   * @returns {Promise<opus.Encoder>} An Opus encoded stream.
   */
	public async fetchMediaURL(id: string): Promise<opus.Encoder> {
		const localAxios = this.axios;
		if (!this.axios.defaults.params.api_token || !this.axios.defaults.params.sid) await this.fetchAPIKey();

		const { data: { results: { TRACK_TOKEN, FILESIZE_MP3_320, SNG_ID } } } = await this.axios.post<TrackToken>(this.buildAPIRequest('song.getData'), {
			'sng_id': id,
		});

		let trackUrlReq: axios.AxiosResponse<TrackResponse>;
		try {
			trackUrlReq = await localAxios.post<TrackResponse>('https://media.deezer.com/v1/get_url', {
				license_token: this.licenseToken,
				media: [{
					type: 'FULL',
					formats: [{
						cipher: 'BF_CBC_STRIPE',
						format: parseInt(FILESIZE_MP3_320) > 0 ? 'MP3_320' : 'MP3_128',
					}],
				}],
				track_tokens: [TRACK_TOKEN],
			});
		}
		catch (_err) {
			throw new DisruptError('Cannot fetch Deezer Media URL. This usually happens when your ARL is no longer valid and Disrupt tries to fetch a 320kbps or higher media URL. If this persists, open an issue on GitHub or join our Discord support server. (DZ:FETCH_MEDIAURL_ERR)');
		}

		const trackUrl = trackUrlReq.data.data[0].media[0].sources[0].url;
		const { data: mediaURL } = await localAxios.get(trackUrl, { responseType: 'arraybuffer' });
		const decryptedTrack = await this.decrypt(mediaURL, SNG_ID);
		return this.makeOpusStream(decryptedTrack);
	}

	/**
   * Decrypts the provided chunk using the Blowfish key.
   * @private
	 * @param id The track's ID used to generate the Blowfish decryption key for that specific track.
   * @param chunk The buffer or UInt8Array that's currently encrypted.
   * @returns {Uint8Array} The decrypted chunk as a Uint8Array.
	 */
	private decryptChunk(chunk: Buffer | Uint8Array, id: string): Uint8Array {
		const blowfishKey = this.generateBlowfishKey(id);
		const cipher = new Blowfish(blowfishKey, Blowfish.MODE.CBC, Blowfish.PADDING.NULL);
		cipher.setIv(this.blowfishIV);
		return cipher.decode(chunk, Blowfish.TYPE.UINT8_ARRAY) as Uint8Array;
	}

	/**
	 * Generates the Blowfish decryption key using the current track's ID.
	 * @private
	 * @param {String} id The ID of the song that's currently playing.
	 * @returns The key used to decrypt chunks of the track.
	 */
	private generateBlowfishKey(id: string) {
		const md5sum = createHash('md5').update(Buffer.from(id, 'binary')).digest('hex');
		const temp: string[] = [];

		for (let i = 0; i < 16; i++) {
			temp.push(String.fromCharCode(md5sum.charCodeAt(i) ^ md5sum.charCodeAt(i + 16) ^ this.decryptionKey.charCodeAt(i)));
		}

		return temp.join('');
	}

	/**
	 * Decrypts the song and returns the Opus-encoded stream.
	 * @private
	 * @param source The Blowfish encrypted buffer.
	 * @param trackId The ID of the track.
	 * @returns A decrypted MPEG readable stream.
	 */
	private async decrypt(source: Buffer, trackId: string) {
		const bufferSize = 2048;
		const finalStream = new PassThrough();
		const encBuffer = Buffer.alloc(source.length);
		let progress = 0;

		while (progress < source.length) {
			const isEndOfSource = (source.length - progress) < bufferSize;
			const currentChunkSize = isEndOfSource ? source.length - progress : bufferSize;
			let encryptedChunk = source.subarray(progress, progress + currentChunkSize);

			if (progress % (bufferSize * 3) === 0 && !isEndOfSource) {
				encryptedChunk = Buffer.concat([this.decryptChunk(encryptedChunk, trackId)]);
			}

			encBuffer.write(encryptedChunk.toString('binary'), progress, encryptedChunk.length, 'binary');
			progress += currentChunkSize;
		}

		finalStream.push(encBuffer);
		return finalStream;
	}

	/**
     * Converts the MPEG readable stream to an Opus stream using prism-media.
     * @private
     * @param stream The MPEG readable stream.
     * @returns {opus.Encoder} An Opus encoded stream.
     */
	private makeOpusStream(stream: PassThrough): opus.Encoder {
		const opusEncoder = new opus.Encoder({ rate: 48000, channels: 2, frameSize: 960 });
		opusEncoder.setFEC(true);

		const ffmpegPiped = stream.pipe(this.ffmpeg);
		const opusStream = ffmpegPiped.pipe(opusEncoder);
		return opusStream;
	}
}

interface LicenseToken {
    results: {
        USER: {
            OPTIONS: {
                license_token: string;
								web_hq: boolean;
            },
        },
        checkForm: string;
    },
}

interface TrackToken {
    results: {
        SNG_ID: string;
        TRACK_TOKEN: string;
				FILESIZE_MP3_320: string;
    }
}

interface TrackResponse {
    data: [
        {
            media: [
                {
                    sources: {
											url: string;
											provider: string;
										}[];
                }
            ]
        }
    ]
}

type Session = {
	results: {
		SESSION: string;
		checkForm: string;
	}
}
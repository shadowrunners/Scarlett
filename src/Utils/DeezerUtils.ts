import { Blowfish } from './Blowfish/BFLib';
import { FFmpeg, opus } from 'prism-media';
import { createHash } from 'node:crypto';
import { PassThrough } from 'stream';
import { Manager } from '../Manager';
import axios from 'axios';

const instance = axios.create({
	baseURL: 'https://api.deezer.com/1.0',
	withCredentials: true,
	timeout: 15000,
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

const ffmpeg = new FFmpeg({
	args: [
		'-analyzeduration', '0',
		'-loglevel', '0',
		'-f', 's16le',
		'-ar', '48000',
		'-ac', '2',
	],
});

/** The utilities built for the Deezer source. */
export class DeezerUtils {
	/** The FFmpeg instance. */
	private readonly ffmpeg: FFmpeg = ffmpeg;
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
		return `${this.privateAPI}?method=${method}&input=3&api_version=1.0&api_token=${instance.defaults.params.api_token}`;
	}

	/** Fetches the API key and license token needed from the API. */
	private async fetchAPIKey() {
		const headers = this.arl ? { 'Cookie': `arl=${this.arl}` } : undefined;
		const sessionId = await instance.post(
			this.buildAPIRequest('deezer.ping'),
			'',
			{ headers },
		);
		instance.defaults.params.sid = sessionId.data.results.SESSION;

		const userToken = await instance.post(this.buildAPIRequest('deezer.getUserData'));
		this.licenseToken = (userToken.data as LicenseToken).results.USER.OPTIONS.license_token;

		// This'll check for the Web High Quality parameter in the API response.
		// If it's false, fallback to 128kbps mode.
		if (userToken.data.results.USER.OPTIONS.web_hq === true) {
			this.disrupt.emit('debug', '[DISRUPT - DEBUG] >> User has access to HQ audio. Switching to 320kbps audio mode.');
		}

		this.apiKey = (userToken.data as LicenseToken).results.checkForm;
		instance.defaults.params.api_token = this.apiKey;
	}

	/**
     * Fetches the media URL of the track.
     * @param id The ID of the song.
     * @returns {Promise<opus.Encoder>} An Opus encoded stream.
     */
	public async fetchMediaURL(id: string): Promise<opus.Encoder> {
		if (!instance.defaults.params.api_token || !instance.defaults.params.sid) await this.fetchAPIKey();

		const trackTokenReq = await instance.post(this.buildAPIRequest('song.getData'), {
			'sng_id': id,
		});
		const { TRACK_TOKEN, FILESIZE_MP3_320, SNG_ID } = (trackTokenReq.data as TrackToken).results;

		const trackUrlReq = await instance.post('https://media.deezer.com/v1/get_url', {
			license_token: this.licenseToken,
			media: [{
				type: 'FULL',
				formats: [{
					cipher: 'BF_CBC_STRIPE',
					format: FILESIZE_MP3_320 !== 0 ? 'MP3_320' : 'MP3_128',
				}],
			}],
			track_tokens: [TRACK_TOKEN],
		});
		const trackUrl = (trackUrlReq.data as TrackResponse).data[0].media[0].sources[0].url;
		console.log(trackUrlReq.data.data[0].media[0]);

		const streamData = await instance.get(trackUrl, { responseType: 'arraybuffer' });
		const decryptedTrack = await this.decrypt(streamData.data, SNG_ID);
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
            },
        },
        checkForm: string;
    },
}

interface TrackToken {
    results: {
        SNG_ID: string;
        TRACK_TOKEN: string;
		FILESIZE_MP3_320: number;
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
import axios from "axios";
import { Blowfish } from '../Utils/Blowfish/BFLib.js';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { FFmpeg, opus } from "prism-media";

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
    private ffmpeg: FFmpeg;
    /** The URL of Deezer's Private API. */
    private privateAPI: string;
    /** The decryption key used to decrypt tracks. */
    private decryptionKey: string;

    /** The API key used to get song data. */
    private apiKey: string;
    /** The license token used to generate stream URLs. */
    private licenseToken: string;


    constructor(decryptionKey: string) {
        this.privateAPI = 'https://www.deezer.com/ajax/gw-light.php';
        this.ffmpeg = ffmpeg;
        this.decryptionKey = decryptionKey;

        this.apiKey = null;
        this.licenseToken = null;
    }

    /**
     * Fetches the API key and license token needed for the API.
     * @param arl The Deezer ARL that will be used to fetch higher quality tracks. (CURRENTLY NOT IMPLEMENTED)
     */
    private async fetchAPIKey(arl?: string) {
        const sessionId = await instance.post(`${this.privateAPI}?method=deezer.ping&input=3&api_version=1.0&api_token=`);
        instance.defaults.params.sid = (sessionId.data as SessionID).results.SESSION;

        const userToken = await instance.post(`${this.privateAPI}?method=deezer.getUserData&input=3&api_version=1.0&api_token=`);
        this.licenseToken = (userToken.data as LicenseToken).results.USER.OPTIONS.license_token;

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

        const trackTokenReq = await instance.post(`${this.privateAPI}?method=song.getData&input=3&api_version=1.0&api_token=`, {
            'sng_id': id
        });
        const trackToken = (trackTokenReq.data as TrackToken).results.TRACK_TOKEN;

        const trackUrlReq = await instance.post(`https://media.deezer.com/v1/get_url`, {
            license_token: this.licenseToken,
            media: [
                {
                    type: 'FULL',
                    formats: [
                        {
                            cipher: 'BF_CBC_STRIPE',
                            format: 'MP3_128',
                        },
                    ],
                },
            ],
            track_tokens: [trackToken],
        });
        const trackUrl = (trackUrlReq.data as TrackResponse).data[0].media[0].sources[0].url;

        const streamData = await instance.get(trackUrl, { responseType: 'arraybuffer' });
        const decryptedTrack = await this.decrypt(streamData.data, (trackTokenReq.data as TrackToken).results.SNG_ID);
        return this.makeOpusStream(decryptedTrack);
    }

    /** 
     * Decrypts the provided chunk using the Blowfish key.
     * @private
     * @param chunk The buffer or UInt8Array that's currently encrypted.
     * @returns {Uint8Array} The decrypted chunk as a Uint8Array.
     */
    private decryptChunk(chunk: Buffer | Uint8Array, id: string): Uint8Array {
        const blowfishKey = this.generateBlowfishKey(id);
        let cipher = new Blowfish(blowfishKey, Blowfish.MODE.CBC, Blowfish.PADDING.NULL)
        cipher.setIv(new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]))
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
        let bfKey = '';
        for (let i = 0; i < 16; i++) 
            bfKey += String.fromCharCode(md5sum.charCodeAt(i) ^ md5sum.charCodeAt(i + 16) ^ this.decryptionKey.charCodeAt(i));
        return String(bfKey);
    }

    /**
     * Decrypts the song and returns the Opus encoded stream.
     * @private
     * @param source The Blowfish encrypted buffer.
     * @param trackId The ID of the track.
     * @returns A decrypted MPEG readable stream.
     */
    private async decrypt(source: Buffer, trackId: string) {
        let decryptedBuffer = Buffer.alloc(source.length);
        let chunkSize = 2048;
        let progress = 0;

        while (progress < source.length) {
            if ((source.length - progress) < 2048) 
                chunkSize = source.length - progress;

            let encryptedChunk = source.subarray(progress, progress + chunkSize);

            if (progress % (chunkSize * 3) === 0 && chunkSize === 2048) 
                encryptedChunk = Buffer.concat([this.decryptChunk(encryptedChunk, trackId)])

            decryptedBuffer.write(encryptedChunk.toString('binary'), progress, encryptedChunk.length, 'binary');
            progress += chunkSize;
        }

        const stream = new Readable({
            read() {}
        });
        stream.push(decryptedBuffer);

        return stream;
    }

    /**
     * Converts the MPEG readable stream to an Opus stream using prism-media.
     * @private
     * @param stream The MPEG readable stream.
     * @returns {opus.Encoder} An Opus encoded stream.
     */
    private makeOpusStream(stream: Readable): opus.Encoder {
        const opusEncoder = new opus.Encoder({ rate: 48000, channels: 2, frameSize: 960 });
        opusEncoder.setFEC(true);

        const ffmpegPiped = stream.pipe(this.ffmpeg);
        const opusStream = ffmpegPiped.pipe(opusEncoder);
        return opusStream;
    }
}

interface SessionID {
    results: {
        SESSION: string;
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
    }
}

interface TrackResponse {
    data: [
        {
            media: [
                {
                    sources: [
                        {
                            url: string;
                            provider: string;
                        }
                    ]
                }
            ]
        }
    ]
}
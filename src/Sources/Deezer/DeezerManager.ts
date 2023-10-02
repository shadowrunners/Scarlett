import axios from 'axios';
import { Manager } from '../..';
import { DeezerTrack } from './DeezerTrack';
import { Blowfish } from 'egoroof-blowfish'
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { FFmpeg, opus } from 'prism-media';
import { createAudioResource } from '@discordjs/voice';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { json } from 'stream/consumers';

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

export class Deezer {
    private decryptionKey: string;
    private privateAPI: string;
    private publicAPI: string;
    private scarlett: Manager;

    constructor(scarlett: Manager) {
        this.scarlett = scarlett;
        this.publicAPI = 'https://api.deezer.com';
        this.privateAPI = 'https://www.deezer.com/ajax/gw-light.php';
        this.decryptionKey = this.scarlett.options.sources.deezer.masterKey;
    }

    /** 
     * Fetches the query based on the regex.
     * @param query The link of the track / album / playlist or the query.
     * @returns The appropriate response.
     */
    public async resolve(query: string) {
        const deezerRegex = new RegExp('https?:\\/\\/?(www\\.)?deezer\\.com\\/(?<countrycode>[a-zA-Z]{2}\\/)?(?<type>track|album|playlist|artist)\\/(?<identifier>[0-9]+)');

        const identifier = query.match(deezerRegex);
        if (!identifier) return this.fetchQuery(query);
        switch (identifier.groups.type) {
            case 'album':
                return this.fetchAlbum(identifier.groups.identifier);
            case 'track':
                return this.fetchSong(identifier.groups.identifier);
            default:
                console.log('Unimplemented method.')
        }
    }

    private async fetchQuery(query: string) {
        const res = await axios.get(`${this.publicAPI}/search?q=${encodeURIComponent(query)}`);
        const jsonData = await res.data as QueryResponse;
        
        const media = await this.fetchMediaURL(jsonData.data[0].id);
        return new DeezerTrack(jsonData.data[0], media);
    }

    private async fetchSong(query: string) {
        const res = await axios.get(`${this.publicAPI}/track/${query}`);
        const jsonData = await res.data as APITrackResponse;

        const media = await this.fetchMediaURL(jsonData.id);
        return new DeezerTrack(jsonData, media);
    }

    // TODO: Fix.
    private async fetchAlbum(query: string) {
        const res = await axios.get(`${this.publicAPI}/album/${query}`);
        const jsonData = await res.data as QueryResponse;
        return jsonData.data[0];
    }

    private async fetchMediaURL(id: string) {
        const getSessionId = await instance.post(`${this.privateAPI}?method=deezer.ping&input=3&api_version=1.0&api_token=`);
        const jsonResponse = getSessionId.data as SessionID;
        instance.defaults.params.sid = jsonResponse.results.SESSION;

        // console.log(`DEBUG >> Fetched session ID from private API. ${jsonResponse.results.SESSION}`)

        const getUserToken = await instance.post(`${this.privateAPI}?method=deezer.getUserData&input=3&api_version=1.0&api_token=`);
        const jsonResponse2 = getUserToken.data as LicenseToken;
        const licenseToken = jsonResponse2.results.USER.OPTIONS.license_token;
        instance.defaults.params.api_token = jsonResponse2.results.checkForm;

        // console.log(instance.defaults.params.api_token);

        const getTrackToken = await instance.post(`${this.privateAPI}?method=song.getData&input=3&api_version=1.0&api_token=`, {
            'sng_id': id
        });
        const jsonResponse3 = getTrackToken.data as TrackToken;
        const trackToken = jsonResponse3.results.TRACK_TOKEN;

        // console.log(getTrackToken.data)

        const getTrackUrl = await instance.post(`https://media.deezer.com/v1/get_url`, {
            license_token: licenseToken,
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
        const jsonResponse4 = getTrackUrl.data as TrackResponse;
        const trackUrl = jsonResponse4.data[0].media[0].sources[0].url;

        console.log(trackUrl)
        const streamData = await instance.get(trackUrl, { responseType: 'arraybuffer' });
        return await this.decrypt(streamData.data, jsonResponse3.results.SNG_ID);
    } 

    /** 
     * Decrypts the provided chunk using the Blowfish key.
     * @param chunk The buffer or UInt8Array that's currently encrypted.
     * @returns {Uint8Array} The decrypted chunk as a Uint8Array.
     */
    private decryptChunk(chunk: Buffer | Uint8Array, id: string): Uint8Array {
      const blowfishKey = this.generateBlowfishKey(id);
      let cipher = new Blowfish(blowfishKey, Blowfish.MODE.CBC, Blowfish.PADDING.NULL)
      cipher.setIv(new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]))
      return cipher.decode(chunk, Blowfish.TYPE.UINT8_ARRAY);
    }

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

        const ffmpeg = new FFmpeg({
            args: [
                '-analyzeduration', '0',
                '-loglevel', '0',
                '-f', 's16le',
                '-ar', '48000',
                '-ac', '2',
            ],
        });

        const opusEncoder = new opus.Encoder({ rate: 48000, channels: 2, frameSize: 960 });
        const ffmpegPiped = stream.pipe(ffmpeg);
        const opusStream = ffmpegPiped.pipe(opusEncoder);
        return opusStream;
    }

    /** 
     * Generates the Blowfish decryption key using the current track's ID.
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
}

interface QueryResponse {
    data: {
        id: string;
        title: string;
        link: string;
        md5_image: string;
    }[];
}

interface APITrackResponse {
    id: string;
    title: string;
    link: string;
    md5_image: string;
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
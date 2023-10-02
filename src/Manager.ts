import { Readable } from 'node:stream';
import { Player, PlayerOptions } from './Player';
import { Deezer } from './Sources/Deezer/DeezerManager';
import { createAudioResource, demuxProbe } from '@discordjs/voice';

export class Manager {
   
    public options: Options;
    public players = new Map();

    constructor(options: Options) {
        this.options = options;


    }

    public async debugStream(provStream: Readable) {
        const { stream, type } = await demuxProbe(provStream);
	    return console.log(stream, type)
    }

    public create(options: PlayerOptions) {
        let player = this.players.get(options.guildId);

        if (!player) player = this.createPlayer(options);
        return player;
    }

    private createPlayer(options: PlayerOptions) {
        const player = new Player(options, this);
        this.players.set(options.guildId, player);
        return player; 
    }

    public async resolve(options: ResolveOptions) {
        const deezerRegex = new RegExp('https?:\\/\\/?(www\\.)?deezer\\.com\\/(?<countrycode>[a-zA-Z]{2}\\/)?(?<type>track|album|playlist|artist)\\/(?<identifier>[0-9]+)');
        if (options.query.match(deezerRegex) || this.options.defaultPlatform === 'deezer') return await new Deezer(this).resolve(options.query);
        // 
    }
}

interface Options {
    sources: {
        deezer: {
            masterKey: string,
        };
        soundcloud: {
            clientId: string;
        }
    },
    defaultPlatform: Platform
}

type Platform = 'soundcloud' | 'deezer';


interface ResolveOptions {
    query: string,
    requester: unknown
}
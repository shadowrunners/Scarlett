# Disrupt
An experimental music library that can play back audio to discord.js bots.

## Supported Sources
Disrupt currently supports:
- Deezer (native)
- SoundCloud (native)
- Bandcamp (native)
- Spotify (only metadata is fetched from Spotify, audio comes from Deezer)
- HTTP streams (possibly no M3U8 support yet)

Sources that are coming:
- Apple Music (via Deezer)
- Pandora Music

## Installation
Currently, there are no prebuilt versions of this library neither here nor on NPM as the library isn't ready yet. However, if you want to experiment with Disrupt, clone this repo and run "(p)npm build" to build and deploy the library locally. A prebuilt version will be offered via NPM once the library is finished.

## Credits
This library is heavily inspired by [LavaSrc](https://github.com/topi314/LavaSrc). If you want to use Lavalink instead of this, I highly recommend installing this plugin.
Alongside this, huge thanks go to the many Deezer related projects that helped me understand Deezer's encryption algorithm and how their private API works.

Uses the Blowfish library from [egoroof](https://github.com/egoroof/blowfish). Source code is contained the Utils/Blowfish folder, was taken and put into the project to maintain CJS compatiblity (maintainer only provides an MJS file). All credits go to them for the library.

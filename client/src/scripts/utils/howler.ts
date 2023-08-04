import {Howl, Howler} from 'howler';

export interface soundDefinition {
    soundId: string
    soundPath: string
}

export class SoundManagerClass {
    sounds: soundDefinition[]
    constructor() {
       this.sounds = [];
    }
    load(soundId: string, soundPath: string) {
      this.sounds.push({soundId: soundId, soundPath: soundPath})
    }
    play(soundId: string) {
        this.sounds.forEach(sound => {
            if(sound.soundId === soundId) {
                const soundObject = new Howl({
                  src: [`${sound.soundPath}.mp3`]
                });

                soundObject.play();
            }
        })
    }
}

/*export class soundPlayer {
    constructor() {

    }
    play(sound: string) {
      Sounds.forEach(soundIndex => {
        if(soundIndex.soundId === sound) {
             new Howl({
               src: [`${soundIndex.soundPath}`]
             });
        }
      })
    }
}*/
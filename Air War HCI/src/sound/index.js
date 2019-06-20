import {
  AudioListener,
  Audio,
  PositionalAudio,
  AudioLoader
} from 'three'
import {camera} from '../index'
//定义了撞击，碰撞等事件
import PubSub from '../events'

const audioLoader = new AudioLoader()
//加载了不同的声音
const impacts = [
  {url: require('./impact1.ogg')},
  {url: require('./impact2.ogg')},
  {url: require('./impact3.ogg')},
  {url: require('./impact4.ogg')}
];

const weapons = [
  {url: require('./gatling.ogg')},
  {url: require('./missile.ogg')}
];

const explosions = [
  {url: require('./explosion1.ogg')},
  {url: require('./explosion2.ogg')}
];
const results =[
  {url: require('./win.ogg')}
]
// 加载声音
// 表示一个sound 参数 {url: require('./explosion1.ogg')},
const audioMapper = sound => {
  audioLoader.load(sound.url, buffer => { sound.buffer = buffer })
};

// 加载声音到声音缓冲区里
const setupSound = () => {
  camera.listener = new AudioListener()
  camera.add(camera.listener)

  impacts.map(audioMapper);
  weapons.map(audioMapper);
  explosions.map(audioMapper);
  results.map(audioMapper);

  PubSub.subscribe('x.sound.impact', (msg, drone) => {
    const n = Math.floor(Math.random() * impacts.length)
    //没有声音要释放
    if (!impacts[n].buffer) return;
    const sound = new PositionalAudio(camera.listener)
    sound.setBuffer(impacts[n].buffer)
    sound.setRefDistance(100)
    drone.add(sound)
    sound.play()
    // drone.remove(sound)
  })
  // 胜利音效
  const gameResult = new Audio(camera.listener)
  PubSub.subscribe('x.player.win', (msg,data)=>{
    if (!results[0].buffer) return
    gameResult.setBuffer(results[0].buffer)
    gameResult.setLoop(false)
    gameResult.play()
  })
  // 爆炸音效
  const playExplosion = (msg, drone) => {
    const n = Math.floor(Math.random() * explosions.length)
    if (!explosions[n].buffer) return
    const sound = new PositionalAudio(camera.listener)
    sound.setBuffer(explosions[n].buffer)
    sound.setRefDistance(500)
    drone.add(sound)
    sound.play()
    // drone.remove(sound)
  }
  PubSub.subscribe('x.drones.destroy', playExplosion)
  PubSub.subscribe('x.drones.explosion', playExplosion)
  // 机枪音效
  const gatlingSound = new Audio(camera.listener)
  PubSub.subscribe('x.drones.gun.start', (msg, drone) => {
    if (!weapons[0].buffer) return
    gatlingSound.setBuffer(weapons[0].buffer)
    gatlingSound.setLoop(true)
    gatlingSound.play()
  })
  PubSub.subscribe('x.drones.gun.stop', (msg, drone) => {
    gatlingSound.stop()
  })
  // 导弹音效
  const missileSound = new Audio(camera.listener)
  PubSub.subscribe('x.drones.missile.start', (msg, drone) => {
    if (!weapons[1].buffer) return
    missileSound.setBuffer(weapons[1].buffer)
    missileSound.play()
  })
  PubSub.subscribe('x.drones.missile.stop', (msg, drone) => {
    missileSound.stop()
  })
}

export default setupSound

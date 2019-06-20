import nipplejs from 'nipplejs'
import lock from 'pointer-lock'
import {mobileAndTabletcheck} from '../utils/isMobile'
import FlyControls from '../modules/FlyControls'
import PubSub from '../events'
import { camera, renderer} from '../index'
import fireControls from "./FireController";
import {deathControls,waterDeathControls} from "./DeathController";


var islive=true
let controls = {
  module: null,
  setAcceleration (value) {
    if (this.module && value !== this.module.acceleration) {
      this.module.acceleration = value
      console.log('acceleration set to ', value)
    }
  }
}
let controlsElement
let isMobile = mobileAndTabletcheck()
let controlsInitialized = false;
var pilotDrone
const initControls = (msg, data) => {
  if (controlsInitialized) return
  if (isMobile) {
    // 移动端适配
    document.getElementById('touchPane').style.display = 'block'
    const touchPaneLeft = window.document.getElementsByClassName('touchPaneLeft')[0]
    // 左侧摇杆控制
    const nippleLook = nipplejs.create({
      zone: touchPaneLeft,
      mode: 'static',
      position: {left: '30%', top: '90%'},
      color: 'white'
    })
    // 右侧攻击键
    Array.from(document.getElementsByClassName('touchButton')).forEach(el => {
      el.style.display = 'block'
    })
    // hide verbose text
    document.getElementById('verbosePane').style.display = 'none'
    // get button X
    const buttonX = document.getElementById('buttonX')
    // 攻击开火
    const pressX = (event) => {
      event.target.style.opacity = 0.5
      //fireBullet({button: 2})
      setTimeout(() => { event.target.style.opacity = 0.3 }, 250)
    }
    buttonX.addEventListener('click', pressX, false)
    buttonX.addEventListener('touchstart', pressX, false)
    if(islive){
      // 设置飞行控制面板
      controls.module = new FlyControls(camera, touchPaneLeft, nippleLook)
        controlsElement = touchPaneLeft
    }
  } else {
    if(islive){
        // 让鼠标可以无限移动，不会飚出浏览器范围，这样就可以一直移动视野
        const pointer = lock(renderer.domElement)
        controls.module = new FlyControls(camera, renderer.domElement, undefined, pointer)
        controlsElement = renderer.domElement
    }
  }
  controls.module.update(0)
  PubSub.publish('x.loops.unshift', (timestamp, delta) => controls.module.update(delta))
  pilotDrone = data.pilotDrone
  fireControls(pilotDrone,controls)
}
PubSub.subscribe('x.drones.pilotDrone.loaded', initControls)
PubSub.subscribe('x.drones.collision.terrain.pilotDrone', (msg, terrainNormal) => {
    islive = false;
    deathControls(terrainNormal,pilotDrone,controls)
})
PubSub.subscribe('x.drones.water.destory',()=>{
  islive =false;
  waterDeathControls(pilotDrone,controls)
});
export default controls

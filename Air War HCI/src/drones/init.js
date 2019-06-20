import PubSub from '../events'

import initTargets from "./enemyDroneInit";
import {buildPilotDrone} from "./pilotDroneInit";


let droneFactory = {
  ready: false
}
const initDroneFactory = (msg, data) => {
  droneFactory = (msg, data) => {
    const drone = data.mesh.clone()
    // 本机的飞行器初始化
    if(msg === 'x.assets.drone.fighter.loaded'||
        msg === 'x.drones.factory.fighter.ready') {
      // 表示以z轴为的上方
      drone.up.set(0, 0, 1)
      drone.rotation.x = 0
      // 飞行器的初始大小
      drone.scale.set(0.3, 0.3, 0.3)
    } else {// 敌机飞行器初始化
      // 表示以z轴为的上方
      drone.up.set(0, 0, 1)
      drone.rotation.x = 0
      // 飞行器的初始大小
      drone.scale.set(0.01, 0.01, 0.01)
    }
    return drone
  }
  droneFactory.ready = true
  if (msg === 'x.assets.drone.fighter.loaded') {
    PubSub.publish('x.drones.factory.fighter.ready',{droneFactory:droneFactory,model:data})
  } else {
    PubSub.publish('x.drones.factory.enemy.ready',{droneFactory:droneFactory,model:data})
  }
}


// PubSub.subscribe('x.gui.init', (msg, data) => initDroneGui(data.gui))
// 本机飞行器模型资源加载完成，进行模型设置
PubSub.subscribe('x.assets.drone.fighter.loaded', initDroneFactory)
// 敌机飞行器模型资源加载完成，进行模型设置
PubSub.subscribe('x.assets.drone.enemy.loaded', initDroneFactory)
// 本机飞行器模型设置完成，进行本机飞行器初始化
PubSub.subscribe('x.drones.factory.fighter.ready', (msg,data)=>buildPilotDrone(msg,data))
// 敌机飞行器模型设置完成，进行敌机飞行器初始化
PubSub.subscribe('x.drones.factory.enemy.ready', initTargets)
//又在随机位置生成一架敌机
//PubSub.subscribe('x.drones.destroy', () => spawnDrone(true, Math.random() * 2 * Math.PI))

export default initDroneFactory

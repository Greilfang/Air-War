import {Clock, Vector3} from "three";
import {camera, loops, scene} from "../index";
import PubSub from "../events";
import {triggerExplosion} from "../particles";

const spawnDrone = (msg,data,circle = true, phase = 0) => {
    const drone = data.droneFactory(msg,data.model)
    drone.lockClock = new Clock(false)
    //生命值为100
    drone.userData.life = 100
    scene.add(drone)
    drone.lastPosition = drone.position.clone()
    let camVec = new Vector3()
    const droneLoop = (timestamp, delta) => {
        if (!drone) return
        const radius = 300
        if (circle) {
            //无人机位置设定
            drone.position.set(
                radius * Math.cos(timestamp / 1000 / 3 + phase),
                radius * Math.sin(timestamp / 1000 / 3 + phase),
                300 + 50 * Math.cos(timestamp / 1000 + phase)
            )
        } else {
            drone.position.copy(camera.position.clone()
                .add(camera.getWorldDirection(camVec).multiplyScalar(100)))
        }
        drone.velocity = drone.position.clone().sub(drone.lastPosition).multiplyScalar(1000 / delta)
        drone.lastPosition = drone.position.clone()
        //生命值小于50冒烟
        if (!drone.destroyed && drone.userData.life <= 50) {
            PubSub.publish('x.drones.smoke.start', drone)
        }
        if (!drone.destroyed && drone.userData.life <= 0) {
            // 生命小于0销毁
            PubSub.publish('x.drones.destroy', drone)
            drone.destroyed = true
            triggerExplosion(drone)
        }
    }
    PubSub.subscribe('x.drones.destroy', (msg, deadDrone) => {
        // 从更新序列中移除
        if (deadDrone.id === drone.id) {

            PubSub.publish('x.loops.remove', droneLoop)
        }
    })
    PubSub.publish('x.hud.register.target', drone)
    loops.push(droneLoop)
}

const initTargets = (msg,data) => {
    //五个无人机
    spawnDrone(msg,data,true)
    spawnDrone(msg,data,true, Math.PI / 8)
    spawnDrone(msg,data,true, Math.PI / 4)
    spawnDrone(msg,data,true, Math.PI / 2)
    spawnDrone(msg,data,true, Math.PI)
}
export default initTargets
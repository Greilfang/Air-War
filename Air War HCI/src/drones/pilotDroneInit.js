import {Clock, Raycaster, Vector3} from "three";
import {camera, loops, scene} from "../index";
import PubSub from "../events";

let islive=true;
const droneController = {
    x: 0,
    y: 0,
    z: 0
}


const buildPilotDrone = (msg,data) => {
    const pilotDrone = data.droneFactory(msg,data.model)
    pilotDrone.gunClock = new Clock(false)
    pilotDrone.userData.altitude = NaN
    pilotDrone.userData.kills = 0
    pilotDrone.userData.speed = 0
    pilotDrone.userData.lastPosition = pilotDrone.position.clone()
    scene.add(pilotDrone)
    window.pilotDrone = pilotDrone
    let localY
    let targetPosition
    let targetPositionFinal
    let camVec = new Vector3()
    const raycaster = new Raycaster()
    //投影光线
    const downVector = new Vector3(0, 0, -1)
    const offsetVector = new Vector3(0, 0, 100)
    let terrainTiles
    let lastTimestamp = 0

    function add() {
        pilotDrone.userData.kills++
    }

    const pilotDroneLoop = (timestamp, delta) => {
        //更新飞行器状态
        // camVec指向正在看向的方向
        camVec = camera.getWorldDirection(camVec)
        //更改位置信息
        targetPosition = camera.position.clone()
            .add(camVec.multiplyScalar(20))
        // 四元数旋转想
        localY = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
        targetPositionFinal = targetPosition.sub(localY.multiplyScalar(8))
        pilotDrone.position.copy(targetPositionFinal)
        // 朝向
        pilotDrone.lookAt(targetPosition
            .add(camVec)
            .add({x: 0, y: 0, z: 60})
        )
        pilotDrone.rotation.x += droneController.x
        pilotDrone.rotation.y += droneController.y
        pilotDrone.rotation.z += droneController.z

        if(islive) {
            // 计算速度
            pilotDrone.userData.velocity = pilotDrone.position.clone()
                .sub(pilotDrone.userData.lastPosition)
                .multiplyScalar(1000 / delta)
            pilotDrone.userData.speed = pilotDrone.userData.velocity.length()
            pilotDrone.userData.lastPosition.copy(pilotDrone.position)
        }
        // 每隔0.2秒更新
        if (timestamp - lastTimestamp > 200) {
            lastTimestamp = timestamp
            // 光线投射的原点向量 向射线提供方向的方向向量(标准化后) offsetVector 射线源高度
            raycaster.set(pilotDrone.position.clone().add(offsetVector), downVector)
            // intersectObjects ( objects : Array, recursive : Boolean, optionalTarget : Array ) : Array
            // 计算物体和射线的焦点 第一个参数检测和射线相交的一组物体 ，计算出位置地形的海拔
            terrainTiles = raycaster.intersectObjects(
                camera.userData.terrainTileUnder ? [camera.userData.terrainTileUnder] : []
            )
            if (terrainTiles.length > 0) {
                // 计算飞行器相对地形的高度
                pilotDrone.userData.altitude = terrainTiles[0].distance - offsetVector.length()
                pilotDrone.userData.groundNormal = terrainTiles[0].face.normal
            }
            if (pilotDrone.userData.altitude < 5) {
                // 检测到碰撞的条件
                PubSub.publish('x.drones.explode.pilotDrone', pilotDrone)
                pilotDrone.userData.velocity=0
                islive=false
                PubSub.publish('x.drones.collision.terrain.pilotDrone', pilotDrone.userData.groundNormal)
            }
        }
    }
    PubSub.subscribe('x.drones.destroy',add)
    loops.push(pilotDroneLoop)
    PubSub.publish('x.drones.pilotDrone.loaded', {pilotDrone})
}

export  {buildPilotDrone}
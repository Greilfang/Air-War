import {camera, renderer, scene} from "../index";
import PubSub from "../events";
import keyboardJS from "keyboardjs";
import {Mesh, MeshPhongMaterial, SphereBufferGeometry} from "three";
import {hudElement, selectNearestTargetInSight} from "../hud";
import {triggerExplosion} from "../particles";


const fireControls = (pilotDrone,controls) => {
    keyboardJS.bind('c', e => {
        console.log(camera.position)
    })
    keyboardJS.bind('r', e => {
        if (controls.module.constructor.name === 'OrbitControls') {
            controls.module.autoRotate = !controls.module.autoRotate
        }
    })
    keyboardJS.bind('space', e => PubSub.publish('x.toggle.play'))
    // 设置子弹的大小材质 ，半径，水平线段数，垂直线段数
    const bullet = new Mesh(
        new SphereBufferGeometry(1, 5, 5),
        new MeshPhongMaterial({color: 0x111111})
    )

    //开火
    const fireBullet = e => {
        if (!pilotDrone) return

        if (e.button === 0) {
            // 左键正常子弹
            PubSub.publish('x.drones.gun.start', pilotDrone)
            pilotDrone.gunClock.start()
        } else if (e.button === 2) {
            // 右键发射导弹
            const target = selectNearestTargetInSight()
            if (target === null || target.destroyed) return
            // bullet.clone()
            const fire = new Mesh(
                new SphereBufferGeometry(5, 32, 32),
                new MeshPhongMaterial({color: 0xf9f0ea})
            )
            fire.position.copy(pilotDrone.position)
            scene.add(fire)
            PubSub.publish('x.drones.missile.start', fire)
            //PubSub.publish('x.camera.shake.start', 5)
            //导弹构建
            const BulletContructor = function () {
                this.alive = true
                this.object = fire
                this.loop = (timestamp, delta) => {
                    if (!this.alive) return
                    const vec = target.position.clone().sub(fire.position)
                    if (vec.length() < 10) {
                        this.alive = false
                        triggerExplosion(target)
                        PubSub.publish('x.drones.missile.stop', fire)
                        PubSub.publish('x.drones.explosion', target)
                        // 打中一次扣掉25滴生命
                        target.userData.life -= 25
                        hudElement.forceUpdate()
                    }
                    // 导弹前进
                    const newDir = vec.normalize().multiplyScalar(10 * delta / 16.66)
                    fire.position.add(newDir)
                }
            }
            const callback = new BulletContructor()
            // 将导弹加入到全局loop更新中
            PubSub.publish('x.loops.push', callback)
        }
    }
    renderer.domElement.addEventListener('mousedown', fireBullet,false)
    renderer.domElement.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            PubSub.publish('x.drones.gun.stop', pilotDrone)
            PubSub.publish('x.camera.shake.stop')
            pilotDrone.gunClock.stop()
        }
    }, false)
}
export default fireControls
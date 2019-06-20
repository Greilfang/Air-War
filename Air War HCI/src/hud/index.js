import {Vector2, Vector3} from 'three'
import ReactDOM from 'react-dom'
import clone from 'clone'
import {screenXYclamped} from '../utils'
import PubSub from '../events'
import {scene, camera} from '../index'
import HUD from "./hud";
import React from "react";

let targets = []
const targetsInSight = new Set()
const targetsInFront = new Set()
let screenCenter = new Vector2(window.innerWidth / 2, window.innerHeight / 2)
PubSub.subscribe('x.screen.resized', (msg, rendererSize) => {
  screenCenter = new Vector2(rendererSize.width / 2, rendererSize.height / 2)
})
let horizonStyle
let focalStyle


const registerTarget = (msg, target) => {
  targets.push(target)
  target.userData.hud = {
    element: {style: {}},
    arrow: {style: {}},
    distance: {style: {}}
  }
  // console.log(target);
  let hudPosition
  let targetDistance2D
  let targetDistance3D
  let targetVector2D
  let targetVector3D
  let targetDirection
  // 最大的圈
  const ZONE = 400
  const FOCAL_SIZE = 150
  const GUN_RANGE = 500
  const targetLoop = (timestamp, delta) => {
    if (!hudElement.mounted) return
    // 屏幕坐标
    hudPosition = screenXYclamped(target.position)

    if (hudPosition.z > 1) {
      hudPosition.x = window.innerWidth - hudPosition.x
      hudPosition.y = window.innerHeight - 10
      target.userData.hud.element.style.borderColor = 'red'
      target.userData.hud.arrow.style.borderBottomColor = 'red'
    } else {
      target.userData.hud.element.style.borderColor = 'orange'
      target.userData.hud.arrow.style.borderBottomColor = 'orange'
    }
    target.hudPosition = hudPosition
    targetVector2D = new Vector2(hudPosition.x, hudPosition.y).sub(screenCenter)
    // 该物体在最大圈外部
    if (targetVector2D.length() > ZONE) {
      // 化为终点在最大圈上的向量,长度为ZONE
      targetVector2D.normalize().multiplyScalar(ZONE)
      //console.log(targetVector2D.length())
    }
    target.userData.hud.arrow.style.opacity = 0.8 * (1 - (ZONE - targetVector2D.length()) / 50)
    targetVector3D = camera.position.clone().sub(target.position)
    targetDistance3D = targetVector3D.length()
    // 将距离化为整数
    target.userData.hud.distance.innerHTML = targetDistance3D.toFixed(0)
    target.userData.hud.distance.style.color = targetDistance3D < GUN_RANGE ? '#00FFFF' : 'orange'
    // 移动屏幕坐标向量的长度，同时按距离缩放大
    // console.log(targetVector2D.x + screenCenter.x)
    target.userData.hud.element.style.transform = `
      translateX(${targetVector2D.x + screenCenter.x}px)
      translateY(${targetVector2D.y + screenCenter.y}px)
      scale(${1.1 - Math.min(0.2, targetDistance3D / 2000)})
    `
    // 箭头角度
    target.userData.hud.arrow.style.transform = `
      translateY(2px)
      rotate(${targetVector2D.angle() / Math.PI * 180 + 90}deg)
    `
    targetDistance2D = targetVector2D.length()
    if (!target.destroyed && target.userData.hud.element.style.borderColor === 'orange' && targetDistance2D < FOCAL_SIZE) {
      // 显示敌机攻击位置
      target.userData.hud.arrow.style.borderBottomColor = '#00FFFF'
      // 在攻击圈内（小圈）的敌机
      if(targetDistance2D < FOCAL_SIZE*0.6) {
        targetsInSight.add(target)
      }

      if (!target.lockClock.running) target.lockClock.start()
    } else {
      targetsInSight.delete(target)
      target.lockClock.stop()
    }
    if (!target.destroyed && targetDistance2D < ZONE - 10) {
      targetsInFront.add(target)
    } else {
      targetsInFront.delete(target)
    }
    // 敌机移动方向显示
    if (hudPosition.z <= 1 && targetDistance2D < ZONE * 0.8) {
      targetDirection = screenXYclamped(
        target.position.clone().add(target.velocity.clone().multiplyScalar(
          Math.min(1,
            (targetDistance3D + targetVector3D.clone().add(target.velocity).length()) / 2 / GUN_RANGE
          )
        ))
      )

      target.gunHud = true
      // 敌机飞行朝向
      target.direction = {
        x: targetDirection.x - (targetVector2D.x + screenCenter.x),
        y: targetDirection.y - (targetVector2D.y + screenCenter.y)
      }
    } else {
      target.gunHud = false
    }
  }
  targetLoop.id = target.id
  // 在显示屏中删除已摧毁敌机
  const destroyTarget = (msg, targetToDestroy) => {
    if (targetToDestroy.id !== target.id) return
    scene.remove(targetToDestroy)
    PubSub.publish('x.loops.remove', targetLoop)
    targets = targets.filter(item => item.id !== targetToDestroy.id)
    targetsInSight.delete(target)
    hudElement.forceUpdate()
  }
  PubSub.subscribe('x.drones.destroy', destroyTarget)
  PubSub.publish('x.loops.push', targetLoop)
}
PubSub.subscribe('x.hud.register.target', registerTarget)

const camVec = new Vector3()
let localX
let localY
let rollAngle
let pitch
let rollAngleDegree
// 更新相机的拍摄角度，水平线，内圈外光
const hudLoop = (timestamp) => {
  // 获得相机朝向的X和Y方向向量
  localX = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
  localY = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
  // up向量和localX之间的角度
  rollAngle = (
    Math.PI / 2 - camera.up.angleTo(localX) * Math.sign(camera.up.dot(localY))
  )
  camera.rollAngle = rollAngle
  // getWorldDirection生成的矢量将指向相机正在查看的方向,进行点积
  pitch = camera.up.dot(camera.getWorldDirection(camVec))
  rollAngleDegree = rollAngle / Math.PI * 180
  horizonStyle = {
    transform: `translateX(-50%) translateY(${pitch * window.innerHeight / 2}px) rotate(${rollAngleDegree}deg)`
  }
  if (hudElement.state.lock) {
    focalStyle = {boxShadow: '0 0 75px #DC143C'}
  } else {
    focalStyle = {boxShadow: ''}
  }
  hudElement.update(timestamp, {horizonStyle, focalStyle, gunTarget: selectNearestGunTarget()})
}

PubSub.subscribe('x.hud.mounted', () => {
  PubSub.publish('x.loops.push', hudLoop)
  hudElement.mounted = true
})

PubSub.subscribe('x.drones.missile.start', () => {
  hudElement.setState(state => ({...state, lockLevel: 0, lock: false}))
})

const selectNearestTargetInSight = () => {
  if (targetsInSight.size === 0 || !hudElement.state.lock) return null
  const distances = []
  // 计算视野内敌机和本机的空间距离
  targetsInSight.forEach(target =>
    distances.push([camera.position.distanceTo(target.position), target])
  )
  distances.sort((a, b) => a[0] > b[0])
  return distances[0][1]
}

const selectNearestGunTarget = () => {
  if (targetsInSight.size === 0) return null
  const distances = []
  // 计算敌机在显示屏中离本机的距离，二维
  targetsInSight.forEach(target =>
    distances.push([
      new Vector2(target.hudPosition.x, target.hudPosition.y)
        .sub(screenCenter)
        .add(new Vector2(target.direction.x, target.direction.y)).length(),
      target])
  )
  distances.sort((a, b) => a[0] > b[0])
  // 最近的敌机 把这个敌机object返回
  return distances[0][1]
}

const hudElement = ReactDOM.render(
  <HUD />,
  document.getElementById('hud')
)

export {selectNearestTargetInSight, selectNearestGunTarget, hudElement, targets, targetsInFront, targetsInSight,screenCenter}

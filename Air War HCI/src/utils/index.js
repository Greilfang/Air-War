import {camera} from '../index'

function screenXY (vec3) {
  const vector = vec3.clone()
  const widthHalf = (window.innerWidth / 2)
  const heightHalf = (window.innerHeight / 2)
  //世界坐标vector在camera相机对象矩阵变化下对应的标准设备坐标
  vector.project(camera)
  // 标准设备坐标转屏幕坐标
  vector.x = (vector.x * widthHalf) + widthHalf
  vector.y = -(vector.y * heightHalf) + heightHalf
  return vector
}

const screenXYclamped = (vec3) => {
  const screenPosition = screenXY(vec3)
  return {
    x: Math.min(Math.max(10, screenPosition.x), window.innerWidth - 10),
    y: Math.min(Math.max(10, screenPosition.y), window.innerHeight - 10),
    z: screenPosition.z
  }
}

const clamp = (min, value, max) => Math.min(Math.max(min, value), max)

export {screenXY, screenXYclamped, clamp}

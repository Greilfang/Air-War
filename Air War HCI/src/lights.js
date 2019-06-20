import {
  DirectionalLight,
  HemisphereLight,
  AmbientLight
} from 'three'
import {drone} from './index'

// 平行光 颜色 光强
const dirLight = new DirectionalLight(0xffffff, 4)
window.dirLight = dirLight
// 半球光 光源直接放置于场景之上，光照颜色从天空光线颜色颜色渐变到地面光线颜色
// 天空光线颜色 地面光线颜色 光强
const hemishpereLight = new HemisphereLight(0xffffbb, 0x080820, 0.1)
hemishpereLight.position.set(0, 0, 1)
hemishpereLight.up.set(0, 0, 1)
hemishpereLight.needsUpdate = true
// 环境光会均匀的照亮场景中的所有物体
const ambientLight = new AmbientLight(0x404040, 0.1)

const updateDirLightPosition = () => {
  dirLight.position.copy(dirLight.sunPosition)
  // 转为单位向量
  dirLight.position.normalize()
  dirLight.position.multiplyScalar(1600.0)
  // 和飞机的位置向量相加
  dirLight.position.add(drone.position)
}

const initLights = (scene, sunPosition) => {
  dirLight.sunPosition = sunPosition
  dirLight.updatePosition = updateDirLightPosition
  dirLight.updatePosition()
  dirLight.up.set(0, 0, 1)
  dirLight.name = 'sunlight'
  // 平行光会产生动态阴影
  dirLight.castShadow = true
  // 阴影贴图的宽度
  dirLight.shadow.mapSize.width = dirLight.shadow.mapSize.height = 1024
  const d = 1024
  // 生成场景的深度图
  dirLight.shadow.camera.left = -d
  dirLight.shadow.camera.right = d
  dirLight.shadow.camera.top = d
  dirLight.shadow.camera.bottom = -d

  dirLight.shadow.camera.far = 3200
  // 阴影贴图偏差，在确定曲面是否在阴影中时，从标准化深度添加或减去多少。
  // 默认值为0.此处非常小的调整有助于减少阴影中的伪影
  dirLight.shadow.bias = -0.0001
  dirLight.needsUpdate = true

  scene.add(dirLight)
  scene.add(hemishpereLight)
  scene.add(ambientLight)
}

export {initLights, dirLight, hemishpereLight, ambientLight}

import './index.css'

//主体控制类，设置相机，场景，光效，飞机模型，循坏渲染
import {
  Scene,
  PerspectiveCamera,
  CubeCamera,
  Vector2,
  Vector3,
  WebGLRenderer,
  PCFSoftShadowMap,
  Uncharted2ToneMapping,
  FogExp2,
  Mesh,
  SphereBufferGeometry,
  MeshBasicMaterial,
  WebGLRenderTarget,
  DepthTexture,
  Matrix4,
  MeshDepthMaterial,

  // Water imports
  PlaneBufferGeometry,
  TextureLoader,
  RepeatWrapping
} from 'three'
import dat from 'dat.gui/build/dat.gui.js'
import Stats from 'stats.js'
import queryString from 'query-string'
import {WindowResize} from './modules/WindowResize'
// import {ShadowMapViewer} from './modules/ShadowMapViewer'
import {initSky} from './sky'
import {initLights, dirLight} from './lights'
import {tileBuilder} from './loops/tileBuilder'
import {
  initDoF,
  lensFlare,
  motionBlurShader
} from './postprocessing'
import {material} from './terrain'
import {particleGroups} from './particles'
import PubSub from './events'
import setupDrones from './drones'
import controls from './controls'
import setupSound from './sound'

import {
  EffectComposer,
  ShaderPass,
  RenderPass,
  SavePass,
  CopyShader,
  BlendShader,
  GlitchPass,
  Water,
  Reflector
} from './modules'
import {
  WaterShader,
  UnderwaterShader,
  WiggleShader
} from './ocean'
import loading from "./loading";


const queryStringOptions = queryString.parse(window.location.search)

const options = {
  PBR: queryStringOptions.PBR === 'true',
  shadows: queryStringOptions.shadows === 'true',
  postprocessing: queryStringOptions.postprocessing === 'true'
}
if (options.PBR) {
  // PBR material needs an envMap
  options.postprocessing = true
}
console.log(options)
if(sessionStorage.getItem('toLoad')!='false'){
    loading();
}
sessionStorage.setItem('toLoad', 'false');

const scene = new Scene()
// 透视投影照相机
// fov 可视角度 75度
// aspect 实际窗口的纵横比
// near 近处的裁面的距离 1
// far 远处的裁面的距离 1000000
let camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1e6)
// CubeCamera（near：Number，far：Number，cubeResolution：Number）全景相机，会创建六个PerspectiveCamera
// 近 - 近裁剪距离。
// 远 - 裁剪距离
// cubeResolution - 设置立方体边缘的长度
var cubeCamera = new CubeCamera(1, 1e6, 1024)

window.cube = cubeCamera
cubeCamera.up.set(0, 0, 1)
//相机初始化
camera.up = new Vector3(0, 0, 1)
camera.position.set(-70, 175, 345)
camera.lookAt(0, -400, 0)
camera.rollAngle = 0

setupSound()

var renderer = new WebGLRenderer({
  antialias: true,
  alpha: true
})
// 所有的纹理和颜色都会预乘gamma
renderer.gammaInput = true
renderer.gammaOutput = true
// 包含阴影贴图的引用
renderer.shadowMap.enabled = options.shadows
renderer.shadowMap.bias = 0.001
renderer.shadowMap.type = PCFSoftShadowMap
renderer.shadowMap.autoUpdate = true
// 是否使用物理上正确的光照模式
renderer.physicallyCorrectLights = true
renderer.toneMapping = Uncharted2ToneMapping

renderer.setSize(window.innerWidth, window.innerHeight)
// 表示渲染器中的画布
document.body.appendChild(renderer.domElement)

// 添加场景 摄像机 渲染器
window.scene = scene
window.renderer = renderer
window.camera = camera

// 添加改变代码变量的界面组件
const gui = new dat.GUI({ autoPlace: false })
gui.closed = true
window.document.getElementsByClassName('guiPane')[0].appendChild(gui.domElement)
window.gui = gui
// 发送初始化gui的消息
PubSub.publish('x.gui.init', {gui})

// 使用文件夹给改变代码变量的选项组件分组
const rendererFolder = gui.addFolder('QUALITY')
const RendererController = function () {
  this.low = () => {
    window.location.href = window.location.pathname + '?' +
    queryString.stringify({
      PBR: false,
      shadows: false,
      postprocessing: false
    })
  }
  this.lowShadow = () => {
    window.location.href = window.location.pathname + '?' +
    queryString.stringify({
      PBR: false,
      shadows: true,
      postprocessing: false
    })
  }
  this.lowShadowDoF = () => {
    window.location.href = window.location.pathname + '?' +
    queryString.stringify({
      PBR: false,
      shadows: true,
      postprocessing: true
    })
  }
  this.high = () => {
    window.location.href = window.location.pathname + '?' +
    queryString.stringify({
      PBR: true,
      shadows: true,
      postprocessing: true
    })
  }
}

// 代码改变组件的控制器设置
const rendererController = new RendererController()
const lowController = rendererFolder.add(rendererController, 'low')
lowController.name('low (default)')
rendererFolder.add(rendererController, 'lowShadow')
rendererFolder.add(rendererController, 'lowShadowDoF')
rendererFolder.add(rendererController, 'high')
scene.fog = new FogExp2(0x91abb5, 0.0005)


// Mesh( geometry : Geometry, material : Material )
// mesh网格  SphereBufferGeometry球缓冲几何体
const drone = new Mesh(
  new SphereBufferGeometry(5, 5, 5),
  new MeshBasicMaterial({
    color: 0xffffff
  })
)
drone.visible = false
scene.add(drone)

// 初始化天空 太阳 光照
const sunPosition = new Vector3()
window.sunPosition = sunPosition
initSky(scene, sunPosition, gui)
const envMapScene = new Scene()
const sky2 = initSky(envMapScene, new Vector3().copy(sunPosition))
initLights(scene, sunPosition)
dirLight.target = drone
scene.add(lensFlare)

// ##########################
const waterParameters = {
  oceanSide: 20000,
  size: 1.0,
  distortionScale: 3.7,
  alpha: 1.0
}
// 平面缓冲几何体 widthSegments:平面的宽度分段数  height:y轴方向
// PlaneBufferGeometry(width : Float, height : Float, widthSegments : Integer, heightSegments : Integer)
const waterGeometry = new PlaneBufferGeometry(waterParameters.oceanSide * 5, waterParameters.oceanSide * 5, 10, 10)
const textureLoader = new TextureLoader().setCrossOrigin('anonymous')
const water = new Water(
  waterGeometry,
  {
    textureWidth: 512,
    textureHeight: 512,
    color: 0xffffff,
    flowDirection: new Vector2(1, 1),
    scale: 20000 / 15.0,
    normalMap0: textureLoader.load(require('./textures/Water_1_M_Normal.jpg')),
    normalMap1: textureLoader.load(require('./textures/Water_2_M_Normal.jpg')),
    clipBias: 0.00001,
    reflectivity: 0.2,
    shader: WaterShader,
    flowSpeed: 0.1
  }
)
window.water = water
// renderTarget的宽度和高度
// render target是一个缓冲，就是在这个缓冲中，视频卡为正在后台渲染的场景绘制像素。 它用于不同的效果，例如用于在一个图像显示在屏幕上之前先做一些处理。
const waterTarget = new WebGLRenderTarget(window.innerWidth, window.innerHeight)
// 一种按深度绘制几何体的材质。深度基于相机远近平面。白色最近，黑色最远。
const depthMaterial = new MeshDepthMaterial()
// 场景的深度将会被渲染到慈纹理上
waterTarget.depthBuffer = true
waterTarget.depthTexture = new DepthTexture()
water.material.uniforms.tDepth.value = waterTarget.depthTexture

water.up.set(0, 0, 1)
// water.rotation.z = -Math.PI / 2
water.position.z = 80
water.material.uniforms.surface.value = water.position.z
gui.__folders['SCENARIO'].add(water.position, 'z', 0, 200, 1)
water.receiveShadow = true
water.userData.isWater = true
window.water = water
scene.add(water)

const underwaterReflector = new Reflector(waterGeometry, {
  textureWidth: 512,
  textureHeight: 512,
  clipBias: 0.00001
  // shader: WaterRefractionShader
})
underwaterReflector.rotation.y = Math.PI
underwaterReflector.up.set(0, 0, -1)
underwaterReflector.position.copy(water.position)
underwaterReflector.getRenderTarget().depthBuffer = true
underwaterReflector.getRenderTarget().depthTexture = new DepthTexture()
window.ref = underwaterReflector
underwaterReflector.updateMatrixWorld()
// ##########################

setupDrones()

particleGroups.forEach(group => scene.add(group.mesh))
// var helper = new CameraHelper( camera );
// scene.add( helper );

// const shadowMapViewer = new ShadowMapViewer(dirLight)
let shakeCamera = false
let shakeAmplitude = 1
// 订阅摄像机颤抖的消息
PubSub.subscribe('x.camera.shake.start', (msg, value = 1) => (shakeCamera = true))
// 订阅摄像机停止颤抖的消息
PubSub.subscribe('x.camera.shake.stop', () => (shakeCamera = false))

let loops = [
  tileBuilder,
  () => lensFlare.position.copy(sunPosition),
  (timestamp, delta) => {
    particleGroups.forEach(group => group.tick(delta / 1000))
  },
  () => {
    if (shakeCamera) {
      // 根据摄像机是否颤抖的消息来更新
      camera.position.add({
        x: (Math.random() - 0.5) * shakeAmplitude,
        y: (Math.random() - 0.5) * shakeAmplitude,
        z: (Math.random() - 0.5) * shakeAmplitude
      })
      glitch.enabled = true
      motionPass.renderToScreen = false
    } else {
      glitch.enabled = false
      motionPass.renderToScreen = true
    }
  },
  (timestamp, delta) => {
    if (camera.position.z < water.position.z) {
      // 飞行器进入水下时
      //PubSub.publish('x.drones.water.destory');
      underwaterPass.enabled = true
      wigglePass.enabled = true
      water.visible = false
      underwaterReflector.onBeforeRender(renderer, scene, camera)
      underwaterPass.material.uniforms.time.value = timestamp / 1000
      wigglePass.material.uniforms.time.value = timestamp / 1000
      controls.setAcceleration(30)
    } else {
      underwaterPass.enabled = false
      wigglePass.enabled = false
      water.visible = true
      controls.setAcceleration(60)
    }
  }
]
let diedDrones=0;
function win() {
    // t1=null;
    setTimeout(()=>{
        document.getElementById('light').style.visibility = 'visible'
        document.getElementById('fade').style.visibility = 'visible'
        document.getElementById('light').style.display = 'block';
        document.getElementById('fade').style.display = 'block'
    },1000)
    var black = document.getElementById('light')
    black.innerHTML += "<div><div class='big'>YOU WIN</div></div>"
    PubSub.publish('x.player.win');
    setTimeout(() => {
        black.innerHTML += "<div class='small'>You kill all five enemies</div>"
    }, 1000)
    // setTimeout(() => {document.getElementById('fade').style.opacity=1},1000)
    setTimeout(() => {
        black.innerHTML += "<button type=\"button\" class='small2' onclick={window.location.reload()}>RESTART</button>"
    }, 2000)
    setTimeout(() => {
        black.innerHTML += "<button type=\"button\" class='small3' onclick={window.location.href=\"begin.html\";}>QUIT</button>"
    }, 2000)
}
function playSound(src) {
    document.getElementById('light2').play();
}

const removeLoop = (loop) => {
  loops = loops.filter(item => item !== loop)
    diedDrones=diedDrones+1;
  if(diedDrones==10){
    win();
  }
    console.log("loops"+loops.length)
}
PubSub.subscribe('x.loops.remove', (msg, loop) => removeLoop(loop))
PubSub.subscribe('x.loops.push', (msg, loop) => loops.push(loop))
PubSub.subscribe('x.loops.unshift', (msg, loop) => loops.unshift(loop))

window.loops = loops
PubSub.publish('x.loops.loaded')
const cleanLoops = () => {
  loops.forEach(loop => {
    if (loop.alive !== undefined && loop.alive === false && loop.object) {
      scene.remove(loop.object)
    }
  })
  loops = loops.filter(loop => loop.alive === undefined || loop.alive === true)
}

// postprocessing
const dofEffect = options.postprocessing ? initDoF(scene, renderer, camera, gui) : null
// ###################################
// EFFECTS
// define a render target with a depthbuffer
const target = new WebGLRenderTarget(window.innerWidth, window.innerHeight)
target.depthBuffer = true
target.depthTexture = new DepthTexture()

const composer = new EffectComposer(renderer, target)

// initial render pass
const renderPass = new RenderPass(scene, camera)
composer.addPass(renderPass)

// add an underwater shader pass
const underwaterPass = new ShaderPass(UnderwaterShader)
underwaterPass.enabled = false
underwaterPass.material.uniforms.waterLevel.value = water.position.z
underwaterPass.material.uniforms.tDepth.value = waterTarget.depthTexture
underwaterPass.material.uniforms.cameraPosition.value = camera.position
underwaterPass.material.uniforms.sunPosition.value = sunPosition
underwaterPass.material.uniforms.tReflectionMap.value = underwaterReflector.getRenderTarget().texture
underwaterPass.material.uniforms.tReflectionDepth.value = underwaterReflector.getRenderTarget().depthTexture
let tNormalMap0 = underwaterPass.material.uniforms.tNormalMap0
let tNormalMap1 = underwaterPass.material.uniforms.tNormalMap1
tNormalMap0.value = textureLoader.load(require('./textures/Water_1_M_Normal.jpg'))
tNormalMap1.value = textureLoader.load(require('./textures/Water_2_M_Normal.jpg'))
tNormalMap0.value.wrapS = tNormalMap0.value.wrapT = RepeatWrapping
tNormalMap1.value.wrapS = tNormalMap1.value.wrapT = RepeatWrapping
composer.addPass(underwaterPass)
window.upass = underwaterPass

// add an underwater wiggle pass
const wigglePass = new ShaderPass(WiggleShader)
wigglePass.enabled = false
composer.addPass(wigglePass)

// add a motion blur pass
const motionPass = new ShaderPass(motionBlurShader, 'tColor')
motionPass.renderToScreen = true
motionPass.material.uniforms.tDepth.value = waterTarget.depthTexture
motionPass.material.uniforms.velocityFactor.value = 1
composer.addPass(motionPass)

// define variables used by the motion blur pass
let previousMatrixWorldInverse = new Matrix4()
let previousProjectionMatrix = new Matrix4()
let previousCameraPosition = new Vector3()
let tmpMatrix = new Matrix4()

// add a glitch pass
const glitch = new GlitchPass()
glitch.renderToScreen = true
composer.addPass(glitch)
// ###################################

// Start the app
renderer.setPixelRatio(1.0)

const stats = new Stats()
document.body.appendChild(stats.dom)

let play = true
PubSub.subscribe('x.toggle.play', () => { play = !play })

let lastTimestamp = 0
var mainLoop = (timestamp) => {
  // 循环渲染
  requestAnimationFrame(mainLoop)
  let delta = timestamp - lastTimestamp
  lastTimestamp = timestamp

  if (play) {
    loops.forEach(loop => {
      loop.loop ? loop.loop(timestamp, delta) : loop(timestamp, delta)
    })

    if (options.postprocessing) {
      water.visible = false
      sky2.material.uniforms.sunPosition.value = sunPosition
      cubeCamera.update(renderer, envMapScene)
      const envMap = cubeCamera.renderTarget
      material.uniforms.envMap.value = envMap.texture

      dofEffect.renderDepth()
      dofEffect.composer.render()
    } else {
      // render to depth target
      scene.overrideMaterial = depthMaterial
      water.visible = false
      renderer.render(scene, camera, waterTarget)
      water.visible = true
      scene.overrideMaterial = null

      // update motion blur shader uniforms
      motionPass.material.uniforms.delta.value = delta
      // tricky part to compute the clip-to-world and world-to-clip matrices
      motionPass.material.uniforms.clipToWorldMatrix.value
        .getInverse(camera.matrixWorldInverse).multiply(tmpMatrix.getInverse(camera.projectionMatrix))
      motionPass.material.uniforms.previousWorldToClipMatrix.value
        .copy(previousProjectionMatrix.multiply(previousMatrixWorldInverse))
      motionPass.material.uniforms.cameraMove.value.copy(camera.position).sub(previousCameraPosition)

      // water uniforms
      water.material.uniforms.clipToWorldMatrix.value = motionPass.material.uniforms.clipToWorldMatrix.value
      underwaterPass.material.uniforms.clipToWorldMatrix.value = motionPass.material.uniforms.clipToWorldMatrix.value
      underwaterPass.material.uniforms.worldToClipMatrix.value
        .copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse)

      // render the postprocessing passes
      composer.render(delta)

      // save some values for the next render pass
      previousMatrixWorldInverse.copy(camera.matrixWorldInverse)
      previousProjectionMatrix.copy(camera.projectionMatrix)
      previousCameraPosition.copy(camera.position)
    }

    // if (dirLight.shadow && dirLight.shadow.map) {
    //   shadowMapViewer.render(renderer)
    // }
  }

  cleanLoops()

  stats.update()
}

mainLoop(0)

WindowResize(renderer, camera)

export {renderer, scene, camera, drone, sunPosition, gui, options, loops}

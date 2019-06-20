import {GLTFLoader} from '../modules'
import PubSub from '../events'

var loader1 = new GLTFLoader()
var loader2 = new GLTFLoader()
let droneMesh1
let droneMesh2

const loadDroneAssets = () => {
    // 加载本机模型资源
  loader1.load(
    './assets/drone/fighter/scene.gltf',
    function (gltf) {
      droneMesh1 = gltf.scene.children[0]
      PubSub.publish('x.assets.drone.fighter.loaded', {mesh: droneMesh1})
    }
  )
    // 加载敌机模型资源
  loader2.load(
        './assets/drone/enemy/scene.gltf',
      function (gltf) {
        droneMesh2 = gltf.scene.children[0]
        PubSub.publish('x.assets.drone.enemy.loaded', {mesh: droneMesh2})
      }
    )
}

export default loadDroneAssets
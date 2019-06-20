## Document on HCI final project

### Introduction

Space War is a 3D web game using React.js as the front end frame and Three.js as the 3D frame. In this game, you can use keyboard to manipulate the spaceship to do many different  motions like accelerating and rolling. When the enemy appears in your sight randomly, you can aim at it and click the mouse in order to shoot at it. The system presents you with more game feeling by hud and vivid explosion effect both during your or your enemies' death.On the up-right corner there is a panal for you to adjust the battlefield environment in real time. 



**Overview：**

![](.\img\overview.png)

**Demo**:<https://greilfang.github.io/Air-War/begin.html>

### Basic Opeartion

```latex
[W] : accelerate

[S] : moderate

[A] : turn left

[D] ：turn right

[R] : directly go up

[F] : directly go down

[MOUSE MOVING UP] : fly upward

[MOUSE MOVING DOWN] : fly downward

[MOUSE CLICKING LEFT] : shoot with bulleCt

[MOUSE CLICKING RIGHT] : shoot with missile
```



### Component Structure

The files(important) in the project are as follow：

**config：**

| name  | description                                       |
| ----- | ------------------------------------------------- |
| env   | some basic setting and get the client environment |
| paths | record and confirm the entrance of the project    |

**node module：**

The imported external modules.

**public:**

| name       | description                                                  |
| ---------- | ------------------------------------------------------------ |
| assets     | some figures like the parameters of enemies                  |
| css        | the style of the page                                        |
| begin.html | the begin page                                               |
| index.html | the main scene of the game using React,all the elements are imported as components |

**scripts:**

| name     | description                                       |
| -------- | ------------------------------------------------- |
| build.js | give out the compile message during webpack build |
| start.js | settings to run the web server                    |
| test.js  | unit tests to check the configuration and data    |

**src:**

| name           | description                                                  |
| -------------- | ------------------------------------------------------------ |
| controls       | all the controls in the game,about mouse and keyboard        |
| drones         | the initialization of enemies, upload bar an so on           |
| events         | just import 'PubSub'                                         |
| hud            | the hud                                                      |
| modules        | present the parameters in 'controls',also the  parameters of sky effect. |
| ocean          | the ocean                                                    |
| particles      | the particle effect from SPE package                         |
| postprocessing | all the beautiful rendering effect(imported from external).  |
| sky            | the sky                                                      |
| sound          | the sound resources                                          |
| texture        | the texture resources                                        |
| utils          | Interfaces of mobile(exported from external) and other tests |
| others         | default configuration files by npm and yarn                  |

### The Implemented Requirement

Generally we import most of the render effect such as shade，water and tile render from other developers‘ work（The render effect is not written by us).

We focus on some specific content and finish the following requirement.

#### The authentic flying control：

We focus on the fly controls of the aircraft such as accelerating , turning and rolling. The view can be updated in real time based on the motion of  the aircraft.

**Demo:**

![](.\img\controls_2.gif)

**Realization:**

```react
export default function FlyControls (object, domElement, nipple, pointer) {
  this.object = object
  this.domElement = (domElement !== undefined) ? domElement : document
  if (domElement) this.domElement.setAttribute('tabindex', -1)

  this.movementSpeed = 0.1
  this.rollSpeed = 0.001

  this.dragToLook = false
  this.autoForward = false

      ...

  this.acceleration = 60
  this.velocity = new Vector3(0, 0, 0)

    //获得鼠标光标对象
  this.pointer = pointer
  if (this.pointer) {
    const pointerElement = document.getElementById('pointer')
    this.zone = 400
    this.pointer.on('attain', movements => {
      //获得屏幕的大小
      const dims = this.getContainerDimensions().size
      pointerElement.style.left = dims[0] / 2 + 'px'
      pointerElement.style.top = dims[1] / 2 + 'px'

      let pointerVector = new Vector2(0, 0)

      movements.on('data', move => {
        pointerVector.add(new Vector2(move.dx, move.dy))
        // 如果飞机超出区域，则自动扩大区域
        if (pointerVector.length() > this.zone) {
          pointerVector.normalize().multiplyScalar(this.zone)
        }
        pointerElement.style.transform = `
          translateX(${pointerVector.x - 16}px)
          translateY(${pointerVector.y - 16}px)
        `
        //鼠标移动敏感度
        this.mousemove({
          pageX: (pointerVector.x) / 1.5,
          pageY: (pointerVector.y) / 1.5
        })
      })
      movements.on('close', function () {
      })
    })
  }

    ... 
    
    //表示向量的旋转
  this.tmpQuaternion = new Quaternion()

  this.moveState = {
    up: 0,
    down: 0,
    left: 0,
    right: 0,
    forward: 0,
    back: 0,
    pitchUp: 0,
    pitchDown: 0,
    yawLeft: 0,
    yawRight: 0,
    rollLeft: 0,
    rollRight: 0
  }
  this.moveVector = new Vector3(0, 0, 0)
  this.rotationVector = new Vector3(0, 0, 0)
    
    //监听鼠标事件
    
    ...
    
    //在鼠标按下（this.keydown）也会调用以下函数
  this.keyup = function (event) {
    switch (event.keyCode) {
      case 16: /* shift */ this.movementSpeedMultiplier = 1; break

      case 87: /* W */ this.moveState.forward = 0; break
      case 83: /* S */ this.moveState.back = 0; break
      case 65: /* A */ this.moveState.yawLeft = 0; break
      case 68: /* D */ this.moveState.yawRight = 0; break

      case 82: /* R */ this.moveState.up = 0; break
      case 70: /* F */ this.moveState.down = 0; break
      case 38: /* up */ this.moveState.pitchUp = 0; break
      case 40: /* down */ this.moveState.pitchDown = 0; break

      case 37: /* left */ this.moveState.yawLeft = 0; break
      case 39: /* right */ this.moveState.yawRight = 0; break

      case 81: /* Q */ this.moveState.rollLeft = 0; break
      case 69: /* E */ this.moveState.rollRight = 0; break

      default: 
    }

    this.updateMovementVector()
    this.updateRotationVector()
  }

  this.mousemove = function (event) {
      //获得屏幕一半大小
    var container = this.getContainerDimensions()
    var halfWidth = container.size[ 0 ] / 2
    var halfHeight = container.size[ 1 ] / 2
    
    // 通过屏幕和鼠标位置计算偏角，确定飞机接下来该往哪里飞
    this.moveState.yawLeft = -event.pageX / halfWidth
    this.moveState.rollLeft = this.moveState.yawLeft / 2 - this.object.rollAngle / 5
    this.moveState.pitchDown = event.pageY / halfHeight
  }

  this.deltaVelocity = null
  this.deltaPosition = null
  
    //update 是执行velocity（速度向量）更新的具体操作，在内部为velocity分发了事件
    this.update = (delta) => {
    var rotMult = delta * this.rollSpeed
    this.deltaVelocity = this.moveVector.clone().multiplyScalar(
      delta / 1000 * this.acceleration
    )
    this.velocity.sub(
      this.velocity.clone().multiplyScalar(
        Math.max(
          1,
          this.deltaVelocity.length() ? 1 : 100 / (this.velocity.length() + 1)
        ) * 0.01 * delta / 16.67
      )
    ).add(this.deltaVelocity)
  
        ...

    this.tmpQuaternion.set(this.rotationVector.x * rotMult, this.rotationVector.y * rotMult, this.rotationVector.z * rotMult, 1).normalize()
    this.object.quaternion.multiply(this.tmpQuaternion)

    this.object.rotation.setFromQuaternion(this.object.quaternion, this.object.rotation.order)

    this.updateRotationVector()
    this.updateMovementVector()
  }

  this.updateMovementVector = function () {
    // 重新设置移动向量
    var forward = (this.moveState.forward || (this.autoForward && !this.moveState.back)) ? 1 : 0
    this.moveVector.x = (-this.moveState.left + this.moveState.right)
    this.moveVector.y = (-this.moveState.down + this.moveState.up)
    this.moveVector.z = (-forward + this.moveState.back)

  }
    //重新设置旋转向量
  this.updateRotationVector = function () {
    this.rotationVector.x = (-this.moveState.pitchDown + this.moveState.pitchUp)
    this.rotationVector.y = (-this.moveState.yawRight + this.moveState.yawLeft)
    this.rotationVector.z = (-this.moveState.rollRight + this.moveState.rollLeft)
  }

    ...
    
 function bind (scope, fn) {
    return function () {
      fn.apply(scope, arguments)
    }
  }
   //绑定键盘按键并添加到桌面对象
  var _keydown = bind(this, this.keydown)//=this.keydown.apply(this,arguments)
  var _keyup = bind(this, this.keyup)

  window.addEventListener('keydown', _keydown, false)
  window.addEventListener('keyup', _keyup, false)

  this.updateMovementVector()
  this.updateRotationVector()
};
```



#### Two types of shooting

We realize two kinds of weapon —— bullet and missile.

Realization:

**Demo:**

![](.\img\fire.gif)



**Realization:**

```react
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
            PubSub.publish('x.camera.shake.start', 5)
            pilotDrone.gunClock.start()
        } else if (e.button === 2) {
            // 右键发射导弹,导弹在一定范围内有追踪功能，所以是selectNearestTargetInSight
            const target = selectNearestTargetInSight()
            if (target === null || target.destroyed) return
            // bullet.clone()
            const fire = new Mesh(
                new SphereBufferGeometry(5, 32, 32),
                new MeshPhongMaterial({color: 0x111111})
            )
            fire.position.copy(pilotDrone.position)
            scene.add(fire)
            PubSub.publish('x.drones.missile.start', fire)

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
                        //分发事件
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
            // 将导弹加入到全局loop动画更新中
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
```



#### The adjustable battlefield

We can adjust the environment through the panal on the upright of the scream.

**Demo:**

![](.\img\environ_2.gif)

#### The complete game procedure

Along from the 3d effects, we present the user with the complete game procedure from begin to end.

**Demo:**

![](.\img\phase.gif)



### Advantage and Disadvantage

**Advantage：**

+ The simulation of the air war is quite real，with the exciting effect of explosion, terrain from SPE open source package.
+ The map is requested on-line. It doesn't need to be loaded at once and it's quite high-quality.
+  We try to use Three.js and React  rather than Unity. It is the first time we make the 3d game with Javascript on the web.
+ We can change the environment of battlefield.

**Disadvantage:**

+ Because this game is on web, there is a need to check the user's browser and do unit tests. it takes us much time to understand how to combine Three.js with React. Also we need to code more in comparison to using Unity.

+ The game's loading is a little slow and the flying is not smooth.

+ Because the model of the plane is actually a sphere, the detection of crashing is not true.

+ Though the requested map in real time is delicate, the external API makes the game slower.

+ You can not choose the plane and weapon.


### How to improve（one to one）

+ If we learn to use Redux and other data management tools, we can abandon the general PubSub. It will make the logic of the game more clear (certainly Redux is more difficult ).

+ Use the mouse to replace 'Q' and 'E', if the turning angle is larger than is specific point (like ＞ 60°)，the plane will automatically roll. This will relieve the load of keyboard event listener.

+ Use other geometry to new the object. For example `new PolyhedronGeometry(vertices,faces,radius,details)` is much better than the original 

  `new SphereGeometry(radius,widthSegments,heightSegments)`，however this makes the crash detection quite complex and we can not finish it.

+ Load the map off-line with limited size.

+ Make more planes and weapons with various appearances and attributes. 
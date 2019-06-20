import {camera} from "../index";
import {Vector3} from "three";
var t1=null

const deathControls = (terrainNormal,pilotDrone,controls) => {
    let tmpVec = new Vector3()
    function death() {
        // t1=null;
        document.getElementById('light').style.visibility = 'visible'
        document.getElementById('fade').style.visibility = 'visible'
        document.getElementById('light').style.display = 'block';
        document.getElementById('fade').style.display = 'block'
        var black = document.getElementById('light')
        black.innerHTML += "<div><div class='big'>YOU DIE</div></div>"
        var t = pilotDrone.userData.kills
        setTimeout(() => {
            black.innerHTML += "<div class='small'>Before you die,you killed '" + t + "'</div>"
        }, 1000)
        // setTimeout(() => {document.getElementById('fade').style.opacity=1},1000)
        setTimeout(() => {
            black.innerHTML += "<button type=\"button\" class='small2' onclick={window.location.reload()}>RESTART</button>"
        }, 2000)
        setTimeout(() => {
            black.innerHTML += "<button type=\"button\" class='small3' onclick={sessionStorage['toLoad']='true';window.location.href=\"begin.html\";}>QUIT</button>"
        }, 2000)
    }
    controls.setAcceleration(0)
    tmpVec.copy(controls.module.velocity).applyQuaternion(camera.quaternion)
    tmpVec.reflect(terrainNormal)
    tmpVec.add(camera.position)
    controls.module.velocity = camera.worldToLocal(tmpVec)
    setTimeout(() => {
        controls.setAcceleration(60)
    }, 1000)
    if (t1 == null) {
        t1 = window.setTimeout(death, 500);
    }

}
export default deathControls

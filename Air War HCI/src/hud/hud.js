import PubSub from "../events";
import clone from "clone";
import Crosshair from "./crosshair";
import {targets, targetsInSight} from "./index";
import {Vector2} from "three";
import React, {Component} from 'react';

let screenCenter = new Vector2(window.innerWidth / 2, window.innerHeight / 2)
PubSub.subscribe('x.screen.resized', (msg, rendererSize) => {
    screenCenter = new Vector2(rendererSize.width / 2, rendererSize.height / 2)
})
let pilotDrone
PubSub.subscribe('x.drones.pilotDrone.loaded', (msg, data) => {
    pilotDrone = data.pilotDrone
})
// 本机攻击显示器
class HUD extends Component {
    constructor (props) {
        super(props)
        this.state = {time: 0, gunHeat: 0, lockLevel: 0, pilot: null}
    }
    componentDidMount () {
        PubSub.publish('x.hud.mounted')
    }
    gunHeat () {
        if (!pilotDrone || !pilotDrone.gunClock.running) {
            // 飞行器机枪温度条下降
            return Math.max(0, this.state.gunHeat - 0.01)
        }
        const delta = pilotDrone.gunClock.getDelta()
        const gunHeat = this.state.gunHeat + delta / 1.5
        if (gunHeat >= 1) {
            // 温度条达到1时不能再发射子弹
            PubSub.publish('x.drones.gun.stop', pilotDrone)
            PubSub.publish('x.camera.shake.stop')
            // 机枪攻击计时结束
            pilotDrone.gunClock.stop()
        }
        return Math.min(gunHeat, 1)
    }
    lockLevel () {
        if (targetsInSight.size === 0) {
            return Math.max(0, this.state.lockLevel - 0.02)
        }
        const times = []
        // 对显示器中的目标对象位置进行更新
        targetsInSight.forEach(target => {
            const delta = target.lockClock.getDelta()
            times.push(this.state.lockLevel + delta / 2)
        })
        return Math.min(Math.max(...times), 1)
    }

    update (timestamp, newState) {
        const gunHeat = this.gunHeat()
        const lockLevel = this.lockLevel()
        this.setState({
            ...newState,
            time: timestamp,
            gunHeat,
            lockLevel,
            lock: lockLevel === 1,
            pilot: pilotDrone ? pilotDrone.userData : null
        })
    }

    render () {
        //复制一个target数组
        const targetsData = targets.map(target => Object.assign(
            clone(target.userData),
            // {id: target.id}
        ))
        //limiter 最外层的圈
        //pointer 鼠标
        //focal 内层的圈

        return (
            <div>
                <div id='limiter' />
                <div id='pointer' />
                <div id='focal' style={this.state.focalStyle} />
                <div id='horizon' style={this.state.horizonStyle} />
                { this.state.pilot ? (
                    <div id='messages'>
                        <div>{this.state.pilot.altitude.toFixed(0)} m</div>
                        <div>{this.state.pilot.speed.toFixed(0)} m/s</div>
                    </div>
                ) : null
                }
                { this.state.pilot ? (
                    <div id='messages'>
                        <br></br>
                        <div>KILLS</div>
                        <div>{this.state.pilot.kills.toFixed(0)}</div>
                    </div>
                ) : null
                }
                <svg className='vector'>
                    <Crosshair size='30' x={screenCenter.x} y={screenCenter.y}
                               fill='transparent'
                               stroke='#00FFFF'
                               strokeWidth='17'
                               opacity='0.8'
                    />
                    <circle
                        cx={screenCenter.x} cy={screenCenter.y} r={160}
                        stroke='#666' opacity={0.8} strokeWidth='10' fill='transparent'
                        strokeDasharray='140 1000' transform={`rotate(155 ${screenCenter.x} ${screenCenter.y})`}
                        strokeLinecap='round'
                    />
                    {
                        this.state.lockLevel
                            ? (<circle
                                cx={screenCenter.x} cy={screenCenter.y} r={160}
                                stroke='#00FFFF' opacity={0.8} strokeWidth='10' fill='transparent'
                                strokeDasharray={`${this.state.lockLevel * 140} 1000`}
                                transform={`rotate(155 ${screenCenter.x} ${screenCenter.y})`}
                                strokeLinecap='round'
                            />) : null
                    }
                    <circle
                        cx={screenCenter.x} cy={screenCenter.y} r={160}
                        stroke='#666' opacity={0.8} strokeWidth='10' fill='transparent'
                        strokeDasharray='140 1000'
                        strokeLinecap='round' transform={`rotate(205 ${screenCenter.x} ${screenCenter.y}) translate(${screenCenter.x * 2}, 0) scale(-1, 1)`}
                    />
                    {
                        this.state.gunHeat
                            ? (<circle
                                cx={screenCenter.x} cy={screenCenter.y} r={160}
                                stroke='red' opacity={0.8} strokeWidth='10' fill='transparent'
                                strokeDasharray={`${this.state.gunHeat * 140} 1000`}
                                strokeLinecap='round' transform={`rotate(205 ${screenCenter.x} ${screenCenter.y}) translate(${screenCenter.x * 2}, 0) scale(-1, 1)`}
                            />)
                            : null
                    }
                    {targets.map(target => (
                        target.gunHud
                            ? (<g key={target.id}>
                                <path
                                    d={`M ${target.hudPosition.x} ${target.hudPosition.y}
                    l ${target.direction.x} ${target.direction.y}`}
                                    strokeWidth='1'
                                    stroke={target === this.state.gunTarget ? '#00FFFF' : 'orange'}
                                    fill='transparent' />
                                {target === this.state.gunTarget ? (
                                    <Crosshair size='30'
                                               x={target.hudPosition.x + target.direction.x}
                                               y={target.hudPosition.y + target.direction.y}
                                               fill='#00FFFF'
                                               fillOpacity='0.6'
                                               stroke='#00FFFF'
                                               strokeWidth='17'
                                               strokeOpacity='1'
                                    />
                                ) : null}
                            </g>)
                            : null
                    ))}
                </svg>
                <div id='targets'>
                    {targetsData.map(target => (
                        <div className='target' key={target.id} id={'target-' + target.id} style={target.hud.element.style}>
                            <div className='life' style={{width: target.life / 100 * 20}} />
                            <div className='arrow' style={target.hud.arrow.style} />
                            <div className='distance'>{target.hud.distance.innerHTML}</div>
                            <div className='name'>drone-{target.id}</div>
                        </div>
                    ))}
                </div>
            </div>
        )
        //div targets 每个敌机在显示屏中的位置
    }
}
export default HUD
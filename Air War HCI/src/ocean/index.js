import {
  Vector4,
  Matrix4,
  Color
} from 'three'
//.glsl文件包含模型视图矩阵和模型视图投影矩阵
import waterFragmentShader from './water_frag.glsl'
import waterVertexShader from './water_vert.glsl'
import underwaterFragmentShader from './underwater_frag.glsl'
import underwaterVertexShader from './underwater_vert.glsl'
//水面上看到的阴影
const WaterShader = {
//uniform变量是外部application程序传递给（vertex和fragment）shader的变量
// uniform变量一般用来表示：变换矩阵，材质，光照参数和颜色等信息。
  uniforms: {
    //颜色
    'color': {type: 'c', value: null},
    'reflectivity': {type: 'f', value: 0},
    'surface': {type: 'f', value: 0},
    'tReflectionMap': {type: 't', value: null},
    'tRefractionMap': {type: 't', value: null},
    'tNormalMap0': {type: 't', value: null},
    'tNormalMap1': {type: 't', value: null},
    'tDepth': {type: 't', value: null},
    'textureMatrix': {type: 'm4', value: null},
    'clipToWorldMatrix': {type: 'm4', value: null},
    'config': {type: 'v4', value: new Vector4()}
  },
    //表示一些顶点的数据，如：顶点坐标，法线，纹理坐标，顶点颜色等
  vertexShader: waterVertexShader,
  //负责颜色、纹理、光照等等
  fragmentShader: waterFragmentShader
}
//水下的阴影
const UnderwaterShader = {
  uniforms: {
    color: {type: 'c', value: new Color(0xffffff)},
    reflectivity: {type: 'f', value: 0.75},
    waterLevel: {type: 'f', value: 0},
    tDepth: { type: 't', value: null },
    tDiffuse: { type: 't', value: null },
    tReflectionMap: { type: 't', value: null },
    tReflectionDepth: { type: 't', value: null },
    tNormalMap0: { type: 't', value: null },
    tNormalMap1: { type: 't', value: null },

    clipToWorldMatrix: { type: 'm4', value: null },
    worldToClipMatrix: { type: 'm4', value: new Matrix4() },
    cameraPosition: {type: 'v3', value: null},
    sunPosition: {type: 'v3', value: null},
    time: {type: 'f', value: 0}
  },
  vertexShader: underwaterVertexShader,
  fragmentShader: underwaterFragmentShader
}
//波浪产生的阴影
const WiggleShader = {
  uniforms: {
    tDiffuse: { type: 't', value: null },
    time: {type: 'f', value: 0}
  },
  vertexShader: `
    varying vec2 vUv;

    void main() {

      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      vUv = uv;

    }
  `,
  fragmentShader: `
    uniform float time;
    uniform sampler2D tDiffuse;
    varying vec2 vUv;

    float frequency = 10.;
    float amplitude = 0.005;

    void main() {
      vec2 uv = vUv;
      float X = vUv.x * frequency + time;
      float Y = vUv.y * frequency + time;
      uv.y += cos(X + Y) * amplitude * cos(Y);
      uv.x += sin(X - Y) * amplitude * sin(Y);
      gl_FragColor = texture2D(tDiffuse, uv);
    }
  `
}

export {WaterShader, UnderwaterShader, WiggleShader}

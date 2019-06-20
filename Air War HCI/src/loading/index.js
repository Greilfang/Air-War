import PubSub from '../events'

const loading = () => {
    console.log('x.load.begin')
    document.getElementById('light').style.display = 'block'
    document.getElementById('fade').style.display = 'block'
    document.getElementById('fade').style.background = "#000 url('./css/background.png') no-repeat center center"
    let black = document.getElementById('fade')
    black.innerHTML +="<div id='loading-wrapper'><div id='loaderSkeleton' ><div id='loader'></div></div></div>"
    setTimeout(() => hide(),5000)
}
function hide(){
    document.getElementById('light').style.visibility = 'hidden'
    document.getElementById('fade').style.visibility = 'hidden'
    document.getElementById('fade').style.backgroundImage = 'none'
    document.getElementById('fade').removeChild(document.getElementById('loading-wrapper'))
}
export default loading
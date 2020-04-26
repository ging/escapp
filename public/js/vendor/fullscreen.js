
function toggleFullScreen(element = document.documentElement) {

        if (!document.fullscreenElement &&    // alternative standard method
            !document.mozFullScreenElement && !document.webkitFullscreenElement) {  // current working methods
            if (element.requestFullscreen) {
                return element.requestFullscreen();
            } else if (element.mozRequestFullScreen) {
                return element.mozRequestFullScreen();
            } else if (element.webkitRequestFullscreen) {
                return element.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            } else {
                throw new Error("Full screen not supported");
            }
        } else {
            if (document.cancelFullScreen) {
                return document.cancelFullScreen();
            } else if (document.mozCancelFullScreen) {
                return document.mozCancelFullScreen();
            } else if (document.webkitCancelFullScreen) {
                return document.webkitCancelFullScreen();
            } else {
                throw new Error("Full screen not supported");
            }
        }
}

function openFullScreen(element = document.documentElement){
    if (!document.fullscreenElement &&    // alternative standard method
        !document.mozFullScreenElement && !document.webkitFullscreenElement) {  // current working methods
        if (element.requestFullscreen) {
            return element.requestFullscreen();
        } else if (element.mozRequestFullScreen) {
            return element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) {
            return element.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        } else {
            throw new Error("Full screen not supported");
        }
    }
}
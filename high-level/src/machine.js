
/* machine.js */
/* Need to be imported with keyword "defer" */

// Get Game element
const Game = document.getElementById( "Game" );
if ( Game == null ) {
    alert( "\"#Game\" element not recognized." );
    throw new Error();
}

// Set Game styling
Game.style.textAlign= "center";
const GameWidth     = 256;
const GameHeight    = 240;
const CanvasScalar  = 3;
const CanvasWidth   = GameWidth * CanvasScalar;
const CanvasHeight  = GameHeight * CanvasScalar;

// Add Canvas to Game
var Canvas;
Canvas = document.createElement( "canvas" );

Canvas.setAttribute( "width", CanvasWidth );
Canvas.setAttribute( "height", CanvasHeight );
Canvas.setAttribute( "id", "Game__Canvas" );
Game.appendChild( Canvas );
const ctx = Canvas.getContext("2d", { alpha: false });



/* ====== Full Screen ====== */

//if inGameView false, add box shadow and disable scroll. otherwise reset.
var inGameView = false;
function toggleGameView() {
    if (inGameView === false){
        Canvas.style.boxShadow = "0 0 0 100vmax black";
        Game.style.top = "50%"; Game.style.left = "50%";
        Game.style.transform = "translate(-50%,-50%)";
        Game.style.position = "fixed";
        inGameView = true;
    }
    else{
        Canvas.style.boxShadow = "";
        Game.style.position =  "";
        Game.style.top = ""; Game.style.left = "";
        Game.style.transform = "";
        inGameView = false;

    }
}


/* ====== Game Data ====== */

var frame = 0;
const FPS = 60;



/* ====== Flags ====== */

var disableInterrupts = false;



/* ====== VRAM ====== */

// Pattern Memory Foreground
const NumSprites            = 32;
const BytesPerSprite        = 16;
var PMF                     = new Uint8Array( NumSprites * BytesPerSprite );

// Pattern Memory Background
const NumTiles              = 32;
const BytesPerTile          = 16;
var PMB                     = new Uint8Array( NumTiles * BytesPerTile );

// Nametable
const NTBL_Size             = 1024;
var NTBL                    = new Uint8Array( NTBL_Size );
var NTBL_Color0             = 0b111;
var NTBL_Color1             = 0b001;

// Nametable Methods
const NTBL_CRToIndex = (c,r) => ((r&0b11111)<<5) | ((c&0b11111));
const NTBL_getColor = (index) => NTBL[index] >>> 7;
const NTBL_getHFlip = (index) => (NTBL[index] >>> 6) & 0b1;
const NTBL_getVFlip = (index) => (NTBL[index] >>> 5) & 0b1;
const NTBL_getAddr  = (index) => NTBL[index] & 0b11111;
function NTBL_setColor(index,Color) { NTBL[index] &= ~0b10000000; NTBL[index] |= (Color & 0b1) << 7; }
function NTBL_setHFlip(index,HFlip) { NTBL[index] &= ~0b01000000; NTBL[index] |= (HFlip & 0b1) << 6; }
function NTBL_setVFlip(index,VFlip) { NTBL[index] &= ~0b01000000; NTBL[index] |= (VFlip & 0b1) << 5; }
function NTBL_setAddr(index,Addr) { NTBL[index] &= ~0b00011111; NTBL[index] |= (Addr & 0x1f); }

// Current Tile Scanline
var CTS                     = 0;

// Current Tile Scanline Methods
const CTS_getColor = () => CTS & 0b111;
const CTS_getData = () => (CTS >>> 8) & 0xffff;
function CTS_setColor(Color) { CTS &= ~0x000007; CTS |= (Color & 0b111); }
function CTS_setData(Data) { CTS &= ~0xffff00; CTS |= (Data & 0xffff) << 8; }

// Object Memory
const NumObjects            = 64;
const BytesPerObject        = 4;
var OBM                     = new Uint8Array( NumObjects * 4 );

// Object Memory Methods
const OBM_getX = (index) => (OBM[4*index]);
const OBM_getY = (index) => (OBM[4*index+1]);
const OBM_getHFlip = (index) => (OBM[4*index+2] >>> 7) & 0b1;
const OBM_getVFlip = (index) => (OBM[4*index+2] >>> 6) & 0b1;
const OBM_getAddr = (index) => (OBM[4*index+2]) & 0x1f;
const OBM_getColor = (index) => (OBM[4*index+3]) & 0x7;
const OBM_getScanline = (index, scanline) => {
    let line_address = OBM_getAddr(index) << 4;
    line_address += 2*( OBM_getVFlip(index) ? (7-scanline) : scanline );
    let out = (PMF[ line_address ] << 8) | (PMF[ line_address + 1 ]);
    return OBM_getHFlip(index) ? flip(out) : out;
};
function OBM_setX(index,X) { OBM[4*index] = (X & 0xff); }
function OBM_setY(index,Y) { OBM[4*index+1] = (Y & 0xff); }
function OBM_setHFlip(index,HFlip) { OBM[4*index+2] &= ~0x80; OBM[4*index+2] |= (HFlip & 0b1) << 7; }
function OBM_setVFlip(index,VFlip) { OBM[4*index+2] &= ~0x40; OBM[4*index+2] |= (VFlip & 0b1) << 6; }
function OBM_setAddr(index,Addr) { OBM[4*index+2] &= ~0x1f; OBM[4*index+2] |= (Addr & 0x1f); }
function OBM_setColor(index,Color) { OBM[4*index+3] &= ~0x07; OBM[4*index+3] |= (Color & 0x7); }

// Object Scanline Memory
const NumObjectScanlines    = 8;
const BytesPerObjectScanline= 4;
var OBSM                    = new Uint32Array( NumObjectScanlines );
var OBSM_Size               = 0;

// Object Scanline Memory Methods
const OBSM_getX = (index) => (OBSM[index] >>> 24);
const OBSM_getData = (index) => (OBSM[index] >>> 8) & 0xffff;
const OBSM_getColor = (index) => (OBSM[index]) & 0b111;
function OBSM_setX(index,X) { OBSM[index] &= ~0xff000000; OBSM[index] |= (X & 0xff) << 24; }
function OBSM_setData(index,Data) { OBSM[index] &= ~0x00ffff00; OBSM[index] |= (Data & 0xffff) << 8; }
function OBSM_setColor(index,Color) { OBSM[index] &= ~0x00000007; OBSM[index] |= (Color & 0x7); }

// For Debug Only
function VRAM_RESET() {
    for ( let i = 0; i < PMF.length; i++ )
        PMF[i] = 0;
    for ( let i = 0; i < PMB.length; i++ )
        PMB[i] = 0;
    for ( let i = 0; i < NTBL.length; i++ )
        NTBL[i] = 0;
    for ( let i = 0; i < OBM.length; i++ ) {
        OBM[i] = 0;
        OBM_setY( i, 0xff );
    }
}



/* ============= GPU ============= */

var PixelBuffer = new Uint8ClampedArray( CanvasWidth * CanvasHeight * 4 );


// 24 bits - rgb
var currentColor            = 0;
function drawScreen() {
    OBSM_Size = 0;
    for ( let i = 0; i < GameHeight; i++ ) {

        // find color of each pixel
        for ( let j = 0; j < GameWidth; j++ ) {
            // at every new tile, load its scanline
            if ( (j & 0b111) == 0 )
                loadToCTS(j,i);

            // get background pixel color
            loadCTSColor(j);

            // get object pixel color
            loadOBMColor(j);

            // draw pixel
            const pixelLocation = 4*CanvasScalar*(CanvasWidth*i + j);
            for ( let vs = 0; vs < CanvasScalar; vs++ ) {
                for ( let hs = 0; hs < CanvasScalar; hs++ ) {
                    const subpixelLocation = pixelLocation + 4*CanvasWidth*vs + 4*(hs);
                    PixelBuffer[ subpixelLocation + 0 ] = (currentColor & 0xff0000) >>> 16;
                    PixelBuffer[ subpixelLocation + 1 ] = (currentColor & 0x00ff00) >>>  8;
                    PixelBuffer[ subpixelLocation + 2 ] = (currentColor & 0x0000ff) >>>  0;
                    PixelBuffer[ subpixelLocation + 3 ] = 0xff;
                }
            }
        }

        // load next OBSM
        loadToOBSM( i+1 );

    }
    const screenImage = new ImageData( PixelBuffer, CanvasWidth, CanvasHeight );
    ctx.putImageData( screenImage, 0, 0 );
}

function printOBM() {
    for ( let i = 0; i < NumObjects; i++ ) {
        console.log(`${i}: ${OBM_getX(i)},${OBM_getY(i)}`);
    }
}

function loadToCTS( x, y ) {
    x &= 0xff;
    y &= 0xff;
    let index = ((y&0b11111000)<<2) | ((x&0b11111000)>>>3);
    x &= 0b111;
    y &= 0b111;
    let address = NTBL_getAddr(index) << 4;
    address += 2*( NTBL_getVFlip(index) ? (7-y) : y );
    let data = (PMB[ address ] << 8) | (PMB[ address + 1 ]);
    CTS_setData( NTBL_getHFlip(index) ? flip(data) : data );
    CTS_setColor( NTBL_getColor(index) ? NTBL_Color1 : NTBL_Color0 );
}

function loadCTSColor( x ) {
    x &= 0b111;
    let pixel = (CTS_getData() >>> (14-2*x)) & 0b11;
    switch (pixel) {
        case 0b11: currentColor = 0xffffff; break;
        case 0b10: currentColor = 0x7f7f7f; break;
        case 0b01: currentColor = 0x3f3f3f; break;
        case 0b00: currentColor = 0x000000; break;
        default: break;
    }
    if ( !( (CTS_getColor()>>>2) & 1 ) )
        currentColor &= ~0xff0000;
    if ( !( (CTS_getColor()>>>1) & 1 ) )
        currentColor &= ~0x00ff00;
    if ( !( (CTS_getColor()>>>0) & 1 ) )
        currentColor &= ~0x0000ff;

}

function loadOBMColor( x ) {
    for ( let object_i = 0; object_i < OBSM_Size; object_i++ ) {
        let distance = x - OBSM_getX(object_i);
        if ( 0 <= distance && distance < 8 ) {
            let pixel = (OBSM_getData(object_i) >>> (14-2*distance)) & 0b11;
            if ( pixel != 0b00 ) {
                switch (pixel) {
                    case 0b11: currentColor = 0xffffff; break;
                    case 0b10: currentColor = 0x7f7f7f; break;
                    case 0b01: currentColor = 0x3f3f3f; break;
                    default: break;
                }
                if ( !( (OBSM_getColor(object_i)>>>2) & 1 ) )
                    currentColor &= ~0xff0000;
                if ( !( (OBSM_getColor(object_i)>>>1) & 1 ) )
                    currentColor &= ~0x00ff00;
                if ( !( (OBSM_getColor(object_i)>>>0) & 1 ) )
                    currentColor &= ~0x0000ff;
                break;
            }

        }
    }
}

function loadToOBSM( y ) {
    OBSM_Size = 0;
    for ( let object_i = 0; object_i < NumObjects; object_i++ ) {
        let scanline = y - OBM_getY(object_i);
        if ( 0 <= scanline && scanline < 8 ) {
            // load next sprite
            OBSM_setX( OBSM_Size, OBM_getX(object_i) );
            OBSM_setData( OBSM_Size, OBM_getScanline(object_i,scanline) );
            OBSM_setColor( OBSM_Size, OBM_getColor(object_i) );
            OBSM_Size++;
            // if OBSM_Size max is reached, exit loop
            if ( OBSM_Size == NumObjectScanlines ) break;
        }
    }
}

function flip( num ) {
    let out = 0;
    for ( let i = 0; i < 8; i++ ) {
        out |= (num&0b11) << (14-2*i);
        num >>>= 2;
    }
    return out;
}

function numToColor( num ) {
    let hex = num.toString(16);
    while ( hex.length < 6 )
        hex = "0" + hex;
    return "#" + hex;
}





/* ====== Controller ====== */

var twoControllers = false;

function setNumControllers( num ) {
    twoControllers = ( num === 2 );
    if ( num !== 1 && num !== 2 )
        console.error("Bad controller number!");
}


// Controller 2 will use WASD, Q, E, N, M as opposed to Up Down Left Right, A Button, B Button, Enter, Shift
var CONTROLLER1_D = 0;
var CONTROLLER1_Q = 0;
var CONTROLLER2_D = 0;
var CONTROLLER2_Q = 0;
const CONTROLLER1_A      = () => (CONTROLLER1_Q & 0b00000001) >>> 0;
const CONTROLLER1_B      = () => (CONTROLLER1_Q & 0b00000010) >>> 1;
const CONTROLLER1_UP     = () => (CONTROLLER1_Q & 0b00000100) >>> 2;
const CONTROLLER1_DOWN   = () => (CONTROLLER1_Q & 0b00001000) >>> 3;
const CONTROLLER1_LEFT   = () => (CONTROLLER1_Q & 0b00010000) >>> 4;
const CONTROLLER1_RIGHT  = () => (CONTROLLER1_Q & 0b00100000) >>> 5;
const CONTROLLER1_START  = () => (CONTROLLER1_Q & 0b01000000) >>> 6;
const CONTROLLER1_SELECT = () => (CONTROLLER1_Q & 0b10000000) >>> 7;

const CONTROLLER2_A      = () => (CONTROLLER2_Q & 0b00000001) >>> 0;
const CONTROLLER2_B      = () => (CONTROLLER2_Q & 0b00000010) >>> 1;
const CONTROLLER2_UP     = () => (CONTROLLER2_Q & 0b00000100) >>> 2;
const CONTROLLER2_DOWN   = () => (CONTROLLER2_Q & 0b00001000) >>> 3;
const CONTROLLER2_LEFT   = () => (CONTROLLER2_Q & 0b00010000) >>> 4;
const CONTROLLER2_RIGHT  = () => (CONTROLLER2_Q & 0b00100000) >>> 5;
const CONTROLLER2_START  = () => (CONTROLLER2_Q & 0b01000000) >>> 6;
const CONTROLLER2_SELECT = () => (CONTROLLER2_Q & 0b10000000) >>> 7;

document.addEventListener('keyup', handle_keyup);
document.addEventListener('keydown', handle_keydown);
// document.classList.add("stop_scrolling");

// extra switch case + if statement for multiple controllers
function handle_keyup(e) {
    if (!twoControllers) {
        switch ( e.code ) {
            case "KeyZ"       : CONTROLLER1_D &= ~0b00000001; break;
            case "KeyX"       : CONTROLLER1_D &= ~0b00000010; break;
            case "ArrowUp"    : CONTROLLER1_D &= ~0b00000100; break;
            case "ArrowDown"  : CONTROLLER1_D &= ~0b00001000; break;
            case "ArrowLeft"  : CONTROLLER1_D &= ~0b00010000; break;
            case "ArrowRight" : CONTROLLER1_D &= ~0b00100000; break;
            case "Enter"      : CONTROLLER1_D &= ~0b01000000; break;
            case "ShiftRight" : CONTROLLER1_D &= ~0b10000000; break;
            case "Space"      : toggleGameView();             break;
            default: break;
        }
    }
    else {
        switch ( e.code ) {
            case "KeyN"       : CONTROLLER1_D &= ~0b00000001; break;
            case "KeyM"       : CONTROLLER1_D &= ~0b00000010; break;
            case "ArrowUp"    : CONTROLLER1_D &= ~0b00000100; break;
            case "ArrowDown"  : CONTROLLER1_D &= ~0b00001000; break;
            case "ArrowLeft"  : CONTROLLER1_D &= ~0b00010000; break;
            case "ArrowRight" : CONTROLLER1_D &= ~0b00100000; break;
            case "Enter"      : CONTROLLER1_D &= ~0b01000000; break;
            case "ShiftRight" : CONTROLLER1_D &= ~0b10000000; break;

            case "KeyQ"       : CONTROLLER2_D &= ~0b00000001; break;
            case "KeyE"       : CONTROLLER2_D &= ~0b00000010; break;
            case "KeyW"       : CONTROLLER2_D &= ~0b00000100; break;
            case "KeyS"       : CONTROLLER2_D &= ~0b00001000; break;
            case "KeyA"       : CONTROLLER2_D &= ~0b00010000; break;
            case "KeyD"       : CONTROLLER2_D &= ~0b00100000; break;
            case "KeyZ"       : CONTROLLER2_D &= ~0b01000000; break;
            case "KeyX"       : CONTROLLER2_D &= ~0b10000000; break;
            case "Space"      : toggleGameView();             break;
            default: break;
        }

    }
}

function handle_keydown(e) {
    if (!twoControllers) {
        switch ( e.code ) {
            case "KeyZ"       : CONTROLLER1_D |= 0b00000001; break;
            case "KeyX"       : CONTROLLER1_D |= 0b00000010; break;
            case "ArrowUp"    : CONTROLLER1_D |= 0b00000100; break;
            case "ArrowDown"  : CONTROLLER1_D |= 0b00001000; break;
            case "ArrowLeft"  : CONTROLLER1_D |= 0b00010000; break;
            case "ArrowRight" : CONTROLLER1_D |= 0b00100000; break;
            case "Enter"      : CONTROLLER1_D |= 0b01000000; break;
            case "ShiftRight" : CONTROLLER1_D |= 0b10000000; break;
            default: break;
        }
    }
    else {
        switch ( e.code ) {
            case "KeyN"       : CONTROLLER1_D |= 0b00000001; break;
            case "KeyM"       : CONTROLLER1_D |= 0b00000010; break;
            case "ArrowUp"    : CONTROLLER1_D |= 0b00000100; break;
            case "ArrowDown"  : CONTROLLER1_D |= 0b00001000; break;
            case "ArrowLeft"  : CONTROLLER1_D |= 0b00010000; break;
            case "ArrowRight" : CONTROLLER1_D |= 0b00100000; break;
            case "Enter"      : CONTROLLER1_D |= 0b01000000; break;
            case "ShiftRight" : CONTROLLER1_D |= 0b10000000; break;

            case "KeyQ"       : CONTROLLER2_D |= 0b00000001; break;
            case "KeyE"       : CONTROLLER2_D |= 0b00000010; break;
            case "KeyW"       : CONTROLLER2_D |= 0b00000100; break;
            case "KeyS"       : CONTROLLER2_D |= 0b00001000; break;
            case "KeyA"       : CONTROLLER2_D |= 0b00010000; break;
            case "KeyD"       : CONTROLLER2_D |= 0b00100000; break;
            case "KeyZ"       : CONTROLLER2_D |= 0b01000000; break;
            case "KeyX"       : CONTROLLER2_D |= 0b10000000; break;
            default: break;
        }
    }
}

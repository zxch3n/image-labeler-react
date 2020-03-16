import * as React from 'react';
import { Button, Form, Select, Modal, InputNumber, message} from 'antd';
import 'antd/lib/button/style/css';
import 'antd/lib/form/style/css';
import 'antd/lib/select/style/css';
import bg from './res/bg.png';
import { Transform } from 'stream';
import { runInThisContext } from 'vm';

const { Option } = Select;
const imageNaturalSize = 48;

interface Label{
    type: string;
    distance: number;
    naturalX: number;//这里对应实际生活中的尺度
    y: number;
}



interface Props {
    imageUrl: string,
    height: number, // height of the labeling window
    width: number, // width of the labeling window
    //types: Array<string>, // annotation types
    asyncUpload?: (data: any) => Promise<any>, // will be invoked when uploading. you can switch to next image in this callback
    disableAnnotation?: boolean, // default false
    defaultType?: string, // default type, can be empty
    defaultSceneType?: string, // default sceneType, can be empty
    defaultBoxes?: Array<BoundingBox|labelBox|PolBox>, // default bounding boxes, can be empty
    showButton?: boolean, // showing button or not, default true
    sceneTypes?: Array<string>,
    className?: string,
    style?: any,
    typeMap: {[key:string]:string},
    returnLabel?: (label:Label)=>void,
    setLeft?: ()=>void,
    priorNaturalX?: number,
    priorY?: number,
    isLabelLeft?:boolean
}

interface D2 {
    x: number,
    y: number
}

interface State {
    isAnnotating: boolean,
    showAnnotation: boolean,
    annotation: string,
    hover: boolean,
    mouse_down: boolean,
    uploadIcon: 'upload' | 'check' | 'loading' | 'close',
    lock: boolean,
    uploaded: boolean,
    x: number,
    y: number,
    sceneType: string,
    hoverEdge?: string,
    isMovingBox: boolean,
    isTransform: boolean,
    annotateType: number,
    modalVisible: boolean,
    labelType: string,
    labelDist: number,
    labelX: number,
    labelY: number,
    polygonStart: boolean,
    hoverPoint: number,
}

interface BoxInteface {
    type:string;
    annotation: string;
}

interface BoundingBox extends BoxInteface{
    x: number,
    y: number,
    w: number,
    h: number,
}

interface labelBox extends BoxInteface{
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    dist: number,
}

interface PolygonBox extends BoxInteface{
    points:Array<D2>,
}

const MARGIN = 16;
const BOX_MIN_LENGTH = 16;
const radius = 5
class Box{
    public type:string;
    public hover: boolean;
    public chosen: boolean;
    public lock: boolean;
    public annotation: string;
    constructor(type:string) {
        this.type = type;
        this.hover = false;
        this.chosen = false;
        this.lock = false;
        this.annotation = ''
    }
    insideBox(x: number, y: number){
        return false;
    }
    insideInnerBox(x: number, y: number)
    {
        return false;
    }
    getData(){

    }
}
class RecBox extends Box{
    public x: number;
    public y: number;
    public w: number;
    public h: number;

    constructor(x: number, y: number, w: number, h: number) {
        super("rectangle");
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    insideBox(x: number, y: number) {
        if (x >= this.x - MARGIN && y >= this.y - MARGIN && x <= this.x + this.w + MARGIN && y <= this.y + this.h + MARGIN) {
            return true;
        }

        return false;
    }

    insideInnerBox(x: number, y: number) {
        if (x >= this.x + MARGIN && y >= this.y + MARGIN && x <= this.x + this.w - MARGIN && y <= this.y + this.h - MARGIN) {
            return true;
        }

        return false;
    }

    getEdgeCursorIsOn(x: number, y: number) {
        let min = MARGIN, direction = undefined;
        const directions = {
            'left': Math.abs(x - this.x),
            'right': Math.abs(x - this.x - this.w),
            'top': Math.abs(y - this.y),
            'bottom': Math.abs(y - this.y - this.h),
        }

        for (let d in directions) {
            if (directions[d] < min) {
                direction = d;
                min = directions[d];
            }
        }

        return direction;
    }

    getData() {
        const {x, y, w, h, annotation} = this;
        const type = this.type;
        return { type, x, y, w, h, annotation } as BoundingBox;
    }

    static fromBoundingBox(data: BoundingBox){
        const box = new RecBox(data.x, data.y, data.w, data.h);
        box.annotation = data.annotation;
        return box;
    }


    moveBoxByDrag (xMovement: number, yMovement: number) {
        this.x += xMovement;
        this.y += yMovement;
    }

    resizeByDrag (edge: string|undefined, xMovement: number, yMovement: number) {
        if (edge === undefined) {
            return;
        }

        switch (edge) {
            case 'left':
                xMovement = Math.min(xMovement, this.w - BOX_MIN_LENGTH);
                this.x += xMovement;
                this.w -= xMovement;
                break;
            
            case 'right':
                xMovement = Math.max(xMovement, - this.w + BOX_MIN_LENGTH);
                this.w += xMovement;
                break;

            case 'top':
                yMovement = Math.min(yMovement, this.h - BOX_MIN_LENGTH);
                this.y += yMovement;
                this.h -= yMovement;
                break;

            case 'bottom':
                yMovement = Math.max(yMovement, - this.h + BOX_MIN_LENGTH);
                this.h += yMovement;
                break;
        }
    }

    // TODO move draw here

    // TODO add special visual effect for lock element
}


class LabelBox extends Box{
    public x: number;
    public y: number;
    public w: number;
    public h: number;
    public label: string;
    public dist : number;

    constructor(x: number, y: number, w: number, h: number, label: string, dist:number) {
        super("label");
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.label = label;
        this.dist = dist;
    }

    insideBox(x: number, y: number) {
        if (x >= this.x - MARGIN && y >= this.y - MARGIN && x <= this.x + this.w + MARGIN && y <= this.y + this.h + MARGIN) {
            return true;
        }

        return false;
    }

    insideInnerBox(x: number, y: number) {
        if (x >= this.x + MARGIN && y >= this.y + MARGIN && x <= this.x + this.w - MARGIN && y <= this.y + this.h - MARGIN) {
            return true;
        }

        return false;
    }

    getEdgeCursorIsOn(x: number, y: number) {
        let min = MARGIN, direction = undefined;
        const directions = {
            'left': Math.abs(x - this.x),
            'right': Math.abs(x - this.x - this.w),
            'top': Math.abs(y - this.y),
            'bottom': Math.abs(y - this.y - this.h),
        }

        for (let d in directions) {
            if (directions[d] < min) {
                direction = d;
                min = directions[d];
            }
        }

        return direction;
    }

    getData() {
        const {x, y, w, h, annotation, type, label, dist} = this;
        return { type, x, y, w, h, annotation, label, dist} as labelBox;
    }

    static fromlabelBox(data: labelBox){
        const box = new LabelBox(data.x, data.y, data.w, data.h, data.label, data.dist);
        box.annotation = data.annotation;
        return box;
    }


    moveBoxByDrag (xMovement: number, yMovement: number) {
        this.x += xMovement;
        this.y += yMovement;
    }

    resizeByDrag (edge: string|undefined, xMovement: number, yMovement: number) {
        if (edge === undefined) {
            return;
        }

        switch (edge) {
            case 'left':
                xMovement = Math.min(xMovement, this.w - BOX_MIN_LENGTH);
                this.x += xMovement;
                this.w -= xMovement;
                break;
            
            case 'right':
                xMovement = Math.max(xMovement, - this.w + BOX_MIN_LENGTH);
                this.w += xMovement;
                break;

            case 'top':
                yMovement = Math.min(yMovement, this.h - BOX_MIN_LENGTH);
                this.y += yMovement;
                this.h -= yMovement;
                break;

            case 'bottom':
                yMovement = Math.max(yMovement, - this.h + BOX_MIN_LENGTH);
                this.h += yMovement;
                break;
        }
    }

    // TODO move draw here

    // TODO add special visual effect for lock element
}

class PolBox extends Box{
    public points: Array<D2>;

    constructor(points:Array<D2>) {
        super("polygon");
        this.points = points;
        this.hover = false;
        this.chosen = false;
        this.lock = false;
        this.annotation = '';
    }
    insertPoint(point:D2){
        this.points.push(point);
    }
    getLength(){
        return this.points.length;
    }
    getBounding(){
        var left = 10000,top=10000,buttom=0,right=0;
        for(let i=0;i<this.points.length;i++)
        {
            if(this.points[i].x<left)
                left = this.points[i].x;
            if(this.points[i].x>right)
                right = this.points[i].x;
            if(this.points[i].y<top)
                top = this.points[i].y;
            if(this.points[i].y>buttom)
                buttom = this.points[i].y;
        }
        return {left,right,top,buttom};
    }
    insideBox(x: number, y: number) {
        var crossMul=function(v1:D2,v2:D2){
            return   v1.x*v2.y-v1.y*v2.x;
        }
        //javascript判断两条线段是否相交  
        var checkCross=function(p1:D2,p2:D2,p3:D2,p4:D2){
            var v1={x:p1.x-p3.x,y:p1.y-p3.y};      
            var v2={x:p2.x-p3.x,y:p2.y-p3.y};      
            var v3={x:p4.x-p3.x,y:p4.y-p3.y};   
            var v=crossMul(v1,v3)*crossMul(v2,v3);   
            v1={x:p3.x-p1.x,y:p3.y-p1.y}; 
            v2={x:p4.x-p1.x,y:p4.y-p1.y};
            v3={x:p2.x-p1.x,y:p2.y-p1.y};
            return (v<=0&&crossMul(v1,v3)*crossMul(v2,v3)<=0)?true:false;
        }
        //判断点是否在多边形内  
        var p1,p2,p3,p4;
        var polygon = this.points;
        var point={x:x,y:y};   
        p1 = point;   
        p2={x:-100,y:point.y};
        var count=0;
        //对每条边都和射线作对比   
        for(var i=0;i<polygon.length-1;i++){
            p3=polygon[i];
            p4=polygon[i+1];
            if(checkCross(p1,p2,p3,p4)==true){                
                count++;
            }    
        }      
        p3=polygon[polygon.length-1];
        p4=polygon[0];       
        if(checkCross(p1,p2,p3,p4)==true){
            count++;
        }
        return (count%2==0)?false:true;
    }

    insideInnerBox(x: number, y: number) {
        var crossMul=function(v1:D2,v2:D2){
            return   v1.x*v2.y-v1.y*v2.x;
        }
        //javascript判断两条线段是否相交  
        var checkCross=function(p1:D2,p2:D2,p3:D2,p4:D2){
            var v1={x:p1.x-p3.x,y:p1.y-p3.y};      
            var v2={x:p2.x-p3.x,y:p2.y-p3.y};      
            var v3={x:p4.x-p3.x,y:p4.y-p3.y};   
            var v=crossMul(v1,v3)*crossMul(v2,v3);   
            v1={x:p3.x-p1.x,y:p3.y-p1.y}; 
            v2={x:p4.x-p1.x,y:p4.y-p1.y};
            v3={x:p2.x-p1.x,y:p2.y-p1.y};
            return (v<=0&&crossMul(v1,v3)*crossMul(v2,v3)<=0)?true:false;
        }
        //判断点是否在多边形内  
        var p1,p2,p3,p4;
        var polygon = this.points;
        var point={x:x,y:y};   
        p1 = point;   
        p2={x:-100,y:point.y};
        var count=0;
        //对每条边都和射线作对比   
        for(var i=0;i<polygon.length-1;i++){
            p3=polygon[i];
            p4=polygon[i+1];
            if(checkCross(p1,p2,p3,p4)==true){                
                count++;
            }    
        }      
        p3=polygon[polygon.length-1];
        p4=polygon[0];       
        if(checkCross(p1,p2,p3,p4)==true){
            count++;
        }
        return (count%2==0)?false:true;
    }
    getPointCursorIsOn(x: number, y: number) {
        let min = MARGIN;
        var index;
        var index_rt = -1;
        for (index=0;index<this.points.length;index++) {
            if (Math.sqrt(Math.pow(x - this.points[index].x, 2) + Math.pow(y - this.points[index].y, 2))< radius+5) {
                index_rt = index;
                break;
            }
        }
        return index_rt;
    }

    getData() {
        const {points, annotation} = this;
        const type = this.type;
        return {type, points, annotation } as PolygonBox;
    }

    static fromPolygonBox(data: PolygonBox){
        const box = new PolBox(data.points);
        box.annotation = data.annotation;
        return box;
    }


    movePointByDrag (index:number, xMovement: number, yMovement: number) {
        this.points[index].x += xMovement;
        this.points[index].y += yMovement;
    }
    moveBoxByDrag (xMovement: number, yMovement: number) {
        for(let i=0;i<this.points.length;i++){
            this.points[i].x += xMovement;
            this.points[i].y += yMovement;
        }
    }


    // TODO move draw here

    // TODO add special visual effect for lock element
}


export class Annotator extends React.Component<Props, State>{
    private readonly imageCanvas: React.RefObject<any>;
    private readonly image: HTMLImageElement;
    private canvas?: HTMLCanvasElement;
    private ctx?: CanvasRenderingContext2D;
    private lastZoomScale?: null | number;
    private lastX?: null | number;
    private lastY?: null | number;
    private position: D2;//显示画图左上角这个点的坐标
    private scale: D2;
    private startX: undefined | number;
    private startY: undefined | number;
    private dragX?: number;
    private dragY?: number;
    private annotatingBox: undefined | Box;
    private chosenBox: undefined | Box;
    private isDrawing: boolean;
    private boxes: Box[];
    private bg: any;
    private events: Array<[Element|Window, string, EventListener]>;
    private CurrenttDefaultType?: string; 
    private flawTypes: Array<string>;

    constructor(props: Props) {
        super(props);
        this.imageCanvas = React.createRef();
        this.image = document.createElement('img');
        this.position = { x: 0, y: 0 };
        this.scale = { x: 0.5, y: 0.5 };
        this.state = {
            isAnnotating: false,
            showAnnotation: false,
            hover: false,
            mouse_down: false,
            uploadIcon: 'upload',
            uploaded: false,
            lock: false,
            annotation: '',
            sceneType: '',
            x: 0,
            y: 0,
            hoverEdge: undefined,
            isMovingBox: false,
            isTransform: false,
            annotateType: 1,
            modalVisible: false,
            labelType: "",
            labelDist: 0,
            labelX: 0,
            labelY: 0,
            polygonStart:false,
            hoverPoint:-1,
        };
        this.chosenBox = undefined;
        this.annotatingBox = undefined;
        this.isDrawing = true;
        this.boxes = [];
        this.bg = new Image();
        this.bg.src = bg;
        this.events = [];
        this.CurrenttDefaultType = undefined;
        this.flawTypes = [];
        var item;
        for (item in this.props.typeMap){
            this.flawTypes.push(item+"-"+this.props.typeMap[item])
        }
    }

    componentWillReceiveProps(nextProps: Readonly<Props>, nextContext: any): void {
        // Merge this with componentDidMount
        if (nextProps.imageUrl !== this.props.imageUrl) {
            // New Image
            this.CurrenttDefaultType = undefined;
            this.initCanvas(nextProps.imageUrl);
            if (nextProps.defaultBoxes){
                this.boxes = nextProps.defaultBoxes.map((bbox: BoxInteface) => {
                    if(bbox.type == "rectangle")
                        return RecBox.fromBoundingBox(bbox as BoundingBox);
                    else if(bbox.type == "label")
                        return LabelBox.fromlabelBox(bbox as labelBox);
                    else
                        return PolBox.fromPolygonBox(bbox as PolygonBox);
                });
                if (this.boxes.length !== 0){
                    this.chooseBox(this.boxes[0]);
                }
            }
        }

        if (nextProps.sceneTypes){
            if (nextProps.defaultSceneType) {
                this.setState({sceneType: nextProps.defaultSceneType});
            } else {
                this.setState({sceneType: nextProps.sceneTypes[0]});
            }
        } else {
            this.setState({sceneType: ''});
        }
    }

    componentDidMount(): void {
        this.canvas = this.imageCanvas.current;
        if (this.canvas == null) {
            throw new Error("Canvas does not exist");
        }

        let context = this.canvas.getContext('2d');
        if (context !== null) {
            this.ctx = context;
        } else {
            throw new Error("Cannot get render context2D");
        }
        this.setEventListeners();
        requestAnimationFrame(this.draw);
        this.initCanvas(this.props.imageUrl);
        if (this.props.defaultBoxes){
            this.boxes = this.props.defaultBoxes.map((bbox: BoxInteface) => {
                if(bbox.type == "rectangle")
                    return RecBox.fromBoundingBox(bbox as BoundingBox);
                else if(bbox.type == "label")
                    return LabelBox.fromlabelBox(bbox as labelBox);
                else
                    return PolBox.fromPolygonBox(bbox as PolygonBox);
            });

            if (this.boxes.length !== 0){
                this.chooseBox(this.boxes[0]);
            }
        }

        this.registerEvent(this.image, 'load', ()=>{
            this.setState({ uploaded: false, uploadIcon: 'upload' });
            if (this.image.naturalWidth !== 0) {
                let scale = this.props.width / this.image.naturalWidth;
                scale = Math.min(this.props.height / this.image.naturalHeight, scale);
                this.scale.x = scale;
                this.scale.y = scale;
            }

            if (this.ctx) {
                this.draw();
            }
            // when image is loaded boxes position may shift, we need to re-locate the annotation position
            if (this.chosenBox){
                this.chooseBox(this.chosenBox);
            }
        });

        if (this.props.sceneTypes) {
            if (this.props.defaultSceneType) {
                this.setState({ sceneType: this.props.defaultSceneType });
            } else {
                this.setState({ sceneType: this.props.sceneTypes[0] });
            }
        } else {
            this.setState({ sceneType: '' });
        }

        this.CurrenttDefaultType = undefined;
    }

    componentWillUnmount() {
        this.removeEvents();
    }

    registerEvent = (element: Element|Window, event: string, listener: EventListener) => {
        element.addEventListener(event, listener);
        this.events.push([element, event, listener]);
    }

    removeEvents = () => {
        for (let i = 0; i < this.events.length; i++){
            this.events[i][0].removeEventListener(this.events[i][1], this.events[i][2]);
        }

        this.events = [];
    }

    switchMode = () => {
        this.setState((state)=>{
            return {isAnnotating: !state.isAnnotating};
        })
    }

    setEventListeners = () => {
        if (this.canvas == null) {
            throw new Error("Canvas does not exist!");
        }

        this.registerEvent(this.canvas, 'touchstart', (e: TouchEvent) => {
            if (e.targetTouches.length == 1) {
                [this.startX, this.startY] = this.getOriginalXY(
                    e.targetTouches[0].clientX,
                    e.targetTouches[0].clientY
                )

                this.dragX = this.startX; this.dragY = this.startY;
            }

            this.lastX = null;
            this.lastY = null;
            this.lastZoomScale = null;
        });

        this.registerEvent(this.canvas, 'touchmove', (e: TouchEvent) => {
            if (this.canvas == null) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            let relativeX = e.targetTouches[0].clientX - this.canvas.getBoundingClientRect().left;
            let relativeY = e.targetTouches[0].clientY - this.canvas.getBoundingClientRect().top;
            let { x, y } = this.invertTransform(relativeX, relativeY);

            // Move box should have the highest priority
            if (this.chosenBox && this.dragX && this.dragY) {
                if(this.chosenBox.type=="rectangle"){
                    if((this.chosenBox as RecBox).insideInnerBox(x, y)){
                        (this.chosenBox as RecBox).moveBoxByDrag(x - this.dragX, y - this.dragY);
                        this.dragX = x; this.dragY = y;
                        return;
                    }
                    if (this.chosenBox && this.dragX && this.dragY) {
                        (this.chosenBox as RecBox).resizeByDrag((this.chosenBox as RecBox).getEdgeCursorIsOn(x, y), x - this.dragX, y - this.dragY);
                        this.dragX = x; this.dragY = y;
                        return;
                    }
                }else if(this.chosenBox.type=="label"){
                    if((this.chosenBox as LabelBox).insideInnerBox(x, y)){
                        (this.chosenBox as LabelBox).moveBoxByDrag(x - this.dragX, y - this.dragY);
                        this.dragX = x; this.dragY = y;
                        return;
                    }
                    if (this.chosenBox && this.dragX && this.dragY) {
                        (this.chosenBox as LabelBox).resizeByDrag((this.chosenBox as LabelBox).getEdgeCursorIsOn(x, y), x - this.dragX, y - this.dragY);
                        this.dragX = x; this.dragY = y;
                        return;
                    }
                }else if(this.chosenBox.type=="polygon"){
                    // move the point
                    var point_index = (this.chosenBox as PolBox).getPointCursorIsOn(x,y)
                    if(point_index == -1)
                    {
                        return;
                    }
                    else{
                        (this.chosenBox as PolBox).movePointByDrag(point_index,x - this.dragX, y - this.dragY);
                        this.dragX = x; this.dragY = y;
                        return;
                    }
                }
            }

            if (e.targetTouches.length == 2) { //pinch
                this.doZoom(this.gesturePinchZoom(e));
            } else if (e.targetTouches.length == 1) {
                this.doMove(relativeX, relativeY);
            }
        });

        this.registerEvent(this.canvas, 'touchend', (e: TouchEvent) => {
            let isSmallDistance = false;
            if (e.targetTouches.length === 1) {
                const x = e.targetTouches[0].clientX,
                    y = e.targetTouches[0].clientY;
                isSmallDistance = this.moveSmallDistance(x, y);
                this.mouseHoverCheck(x, y);
                if (isSmallDistance) {
                    this.searchChosenBox();
                }
            }

            if (this.annotatingBox !== undefined && !isSmallDistance) {
                this.chooseBox(this.annotatingBox);
                this.boxes.push(this.annotatingBox);
                this.annotatingBox = undefined;
            } else if (!this.state.isAnnotating && this.chosenBox) {
                this.refreshBoxTipPosition()
            }

            this.startX = undefined;
            this.startY = undefined;
            this.dragX = this.startX; this.dragY = this.startY;
        });


        // ========================
        // on desktop devices

        // keyboard+mouse
        this.registerEvent(window, 'keyup', (e: KeyboardEvent) => {
            if (e.key === '+' || e.key === '=' || e.keyCode == 38 || e.keyCode == 39) { //+
                e.preventDefault();
                this.doZoom(5);
            } else if (e.key === '-' || e.key === '_' || e.keyCode == 37 || e.keyCode == 40) {//-
                e.preventDefault();
                this.doZoom(-5);
            } else if (e.key === 'Enter' || e.keyCode == 13 || e.which == 13 || e.key === '(space)' || e.keyCode == 32 || e.which == 32) {
                this.onUpload();
                e.preventDefault();
                e.stopPropagation();
            } else if (e.key === '`' || e.keyCode == 192 || e.which == 192){
                this.switchMode();
            } else if (e.key === 'Q' || e.key === 'q' || e.keyCode == 81 || e.which == 81){
                this.onDelete();
                this.setState({isAnnotating: true});
            }
        });
        var tmp =1;
        this.registerEvent(this.canvas, 'mousedown', (e: MouseEvent) => {
            [this.startX, this.startY] = this.getOriginalXY(e.clientX, e.clientY);
            this.dragX = this.startX; this.dragY = this.startY;
            this.setState({ mouse_down: true });
            this.lastX = null;
            this.lastY = null;
            if(this.state.isAnnotating&&this.state.annotateType == 3){
                if(!this.annotatingBox&&!this.state.polygonStart){
                    this.annotatingBox = new PolBox([]);
                    (this.annotatingBox as PolBox).insertPoint({x:this.dragX,y:this.dragY})
                    this.setState({polygonStart:true});
                    if (this.CurrenttDefaultType) {
                        this.annotatingBox.annotation = this.CurrenttDefaultType;
                    } else if (this.props.defaultType) {
                        this.annotatingBox.annotation = this.props.defaultType;
                    } else {
                        this.annotatingBox.annotation = this.flawTypes[0];
                    }
                }
                else if(this.annotatingBox&&this.state.polygonStart&&this.annotatingBox.type=="polygon")
                {
                    if((this.annotatingBox as PolBox).getPointCursorIsOn(this.startX,this.startY)==0){
                        this.chooseBox(this.annotatingBox);
                        this.boxes.push(this.annotatingBox);
                        this.annotatingBox = undefined;
                        this.setState({polygonStart:false});
                    }else{
                        (this.annotatingBox as PolBox).insertPoint({x:this.dragX,y:this.dragY})
                    }
                }
            }
        });

        // Uesr may mouse up outside of the canvas
        this.registerEvent(this.canvas, 'mouseup', (e: MouseEvent) => {
            // TODO: merge this and touch callback
            if(e.button==2&&this.annotatingBox !== undefined&&this.state.polygonStart){
                this.annotatingBox = undefined;
                this.setState({polygonStart:false});
            }
            if (this.moveSmallDistance(e.clientX, e.clientY)) {
                // User click
                this.searchChosenBox();
            } 
            // Box may be resized by dragging
            this.refreshBoxTipPosition();
        });

        this.registerEvent(window, 'mouseup', ()=>{
            // This apply to scenario when mouseup outside of the canvas
            if (this.annotatingBox !== undefined){
                if(this.annotatingBox.type == "rectangle"){
                    // User create new box
                    this.chooseBox(this.annotatingBox);
                    this.boxes.push(this.annotatingBox);
                    this.annotatingBox = undefined;
                }else if(this.annotatingBox.type == "label"){
                    // User create new box
                    if(this.state.annotateType==2){
                        this.setState({modalVisible:true,labelX:(this.annotatingBox as LabelBox).x,labelY:(this.annotatingBox as LabelBox).y});
                    }
                    this.chooseBox(this.annotatingBox);
                    this.boxes.push(this.annotatingBox);
                    this.annotatingBox = undefined;
                }else if (this.chosenBox && !this.state.isAnnotating){
                    this.refreshBoxTipPosition();
                }
            }
            this.setState({ mouse_down: false });
            this.startX = undefined;
            this.startY = undefined;
            this.dragX = this.startX; this.dragY = this.startY;
        });


        this.registerEvent(this.canvas, 'mousemove', this.onMouseMove);
        this.registerEvent(this.canvas, 'wheel', this.onWheel);
    };

    onWheel = (e: WheelEvent) => {
        if (this.canvas == null) {
            return;
        }

        let relativeX = e.clientX - this.canvas.getBoundingClientRect().left;
        let relativeY = e.clientY - this.canvas.getBoundingClientRect().top;
        let { x, y } = this.invertTransform(relativeX, relativeY);
        if (e.deltaY > 0) {
            //this.doZoom(-2, x, y);
            this.doZoom(-2);
        } else if (e.deltaY < 0) {
            //this.doZoom(2, x, y);
            this.doZoom(2);
        }

        e.stopPropagation();
        e.preventDefault();
    }

    onMouseMove = (e: MouseEvent) => {
        if (this.canvas == null) {
            return;
        }

        let relativeX = e.clientX - this.canvas.getBoundingClientRect().left;
        let relativeY = e.clientY - this.canvas.getBoundingClientRect().top;
        let { x, y } = this.invertTransform(relativeX, relativeY);


        // Move box should have the highest priority
        if (this.state.isMovingBox && this.state.mouse_down && this.chosenBox && this.dragX && this.dragY&&this.chosenBox.type=="rectangle") {
            (this.chosenBox as RecBox).moveBoxByDrag(x - this.dragX, y - this.dragY);
            this.dragX = x; this.dragY = y;
            return;
        }
        if (this.state.isMovingBox && this.state.mouse_down && this.chosenBox && this.dragX && this.dragY&&this.chosenBox.type=="label") {
            (this.chosenBox as LabelBox).moveBoxByDrag(x - this.dragX, y - this.dragY);
            this.dragX = x; this.dragY = y;
            return;
        }

        if (this.state.hoverEdge && this.state.mouse_down && this.chosenBox && this.dragX && this.dragY&&this.chosenBox.type=="rectangle") {
            (this.chosenBox as RecBox).resizeByDrag(this.state.hoverEdge, x - this.dragX, y - this.dragY);
            this.dragX = x; this.dragY = y;
            return;
        }

        if (this.state.hoverEdge && this.state.mouse_down && this.chosenBox && this.dragX && this.dragY&&this.chosenBox.type=="label") {
            (this.chosenBox as LabelBox).resizeByDrag(this.state.hoverEdge, x - this.dragX, y - this.dragY);
            this.dragX = x; this.dragY = y;
            return;
        }
        //TODO
        if (this.state.hoverPoint != -1 && this.state.mouse_down && this.chosenBox && this.dragX && this.dragY&&this.chosenBox.type=="polygon") {
            (this.chosenBox as PolBox).movePointByDrag(this.state.hoverPoint, x - this.dragX, y - this.dragY);
            this.dragX = x; this.dragY = y;
            return;
        }
        if (this.state.isMovingBox && this.state.mouse_down && this.chosenBox && this.dragX && this.dragY&&this.chosenBox.type=="polygon") {
            (this.chosenBox as PolBox).moveBoxByDrag(x - this.dragX, y - this.dragY);
            this.dragX = x; this.dragY = y;
            return;
        }
        if (e.target == this.canvas && this.state.mouse_down) {
            this.doMove(relativeX, relativeY);
            return;
        }
        if (!this.state.mouse_down) {
            this.mouseHoverCheck(e.clientX, e.clientY);
        }
    }

    searchChosenBox = () => {
        let chosen = undefined;
        for (let i = 0; i < this.boxes.length; i++) {
            if (this.boxes[i].hover) {
                if (chosen !== undefined) {
                    return;
                }

                chosen = this.boxes[i];
            }
        }

        if (chosen !== undefined) {
            this.cancelChosenBox();
            this.chooseBox(chosen);
        } else {
            this.cancelChosenBox();
        }

        return chosen;
    };

    chooseBox = (box: Box, showAnnotation: boolean = true) => {
        if (box !== this.chosenBox) {
            for (let box of this.boxes) {
                box.chosen = false;
            }

            this.setState({hoverEdge: undefined, isMovingBox: false, hoverPoint:-1});
            box.chosen = true;
        }
        if(box.type == "rectangle"){
            const { x, y, h } = this.getCurrentCoordinate((box as RecBox).x,(box as RecBox).y,(box as RecBox).w,(box as RecBox).h);
            const { height } = this.props;
            this.chosenBox = box;
            let newY = y + h;
            if (newY + 100 > height) {
                // Annotation reaches the bottom
                newY = y - 110;
            }
    
            this.setState({
                annotation: box.annotation,
                x: x,
                y: newY,
                lock: box.lock
            });
            if (showAnnotation && !this.state.showAnnotation) {
                this.setState({
                    showAnnotation: true
                });
            }
        }else if(box.type == "label"){
            const { x, y, h } = this.getCurrentCoordinate((box as LabelBox).x,(box as LabelBox).y,(box as LabelBox).w,(box as LabelBox).h);
            const { height } = this.props;
            this.chosenBox = box;
            let newY = y + h;
            if (newY + 100 > height) {
                // Annotation reaches the bottom
                newY = y - 110;
            }
    
            this.setState({
                annotation: box.annotation,
                x: x,
                y: newY,
                lock: box.lock
            });
            if (showAnnotation && !this.state.showAnnotation) {
                this.setState({
                    showAnnotation: true
                });
            }
        }
        else{
            const {left,right,top,buttom} = (box as PolBox).getBounding();
            const { x, y, h } = this.getCurrentCoordinate(left,top,right-left,buttom-top);
            const { height } = this.props;
            this.chosenBox = box;
            let newY = y + h;
            if (newY + 100 > height) {
                // Annotation reaches the bottom
                newY = y - 110;
            }
            this.setState({
                annotation: box.annotation,
                x: x,
                y: newY,
                lock: box.lock
            });
            if (showAnnotation && !this.state.showAnnotation) {
                this.setState({
                    showAnnotation: true
                });
            }
        }
        //TODO
    };

    refreshBoxTipPosition = () => {
        if (this.chosenBox) {
            this.chooseBox(this.chosenBox, false);
        }
    };

    cancelChosenBox = () => {
        if (this.chosenBox === undefined) {
            return;
        }

        this.chosenBox.chosen = false;
        this.chosenBox = undefined;
        this.setState({
            showAnnotation: false,
            annotation: '',
            hoverEdge: undefined,
            isMovingBox: false,
            hoverPoint: -1,
        });
    };

    getCurrentCoordinate(ax:number,ay:number,aw:number,ah:number) {
        return {
            x: ax * this.scale.x + this.position.x,
            y: ay * this.scale.y + this.position.y,
            w: aw * this.scale.x,
            h: ah * this.scale.y,
        }
    }

    mouseHoverCheck(mouseX: number, mouseY: number) {
        if (this.canvas == null) {
            throw new Error("Canvas does not exist!");
        }

        let startX = mouseX - this.canvas.getBoundingClientRect().left;
        let startY = mouseY - this.canvas.getBoundingClientRect().top;
        let invertedCord = this.invertTransform(startX, startY);
        const { x, y } = invertedCord;
        let anyHover = false;
        for (let i = 0; i < this.boxes.length; i++) {
            const box = this.boxes[i];
            if (box.insideBox(x, y)) {
                box.hover = true;
                anyHover = true;
            } else {
                box.hover = false;
            }
        }

        let edge = undefined;
        let isMovingBox = false;
        let point_index = -1;
        if (this.chosenBox && this.chosenBox.hover) {
            if(this.chosenBox.type=="rectangle")
            {
                edge = (this.chosenBox as RecBox).getEdgeCursorIsOn(x, y);
                isMovingBox = this.chosenBox.insideInnerBox(x, y);
            }else if(this.chosenBox.type=="label")
            {
                edge = (this.chosenBox as LabelBox).getEdgeCursorIsOn(x, y);
                isMovingBox = this.chosenBox.insideInnerBox(x, y);
            }
            else{
                point_index = (this.chosenBox as PolBox).getPointCursorIsOn(x, y);
                isMovingBox = this.chosenBox.insideInnerBox(x, y);
            }
        }

        this.setState({ hover: anyHover, hoverEdge: edge, isMovingBox,hoverPoint:point_index});
    }

    invertTransform(x: number, y: number) {
        x -= this.position.x;
        y -= this.position.y;
        x /= this.scale.x;
        y /= this.scale.y;
        return { x, y };
    }

    getOriginalXY(pageX: number, pageY: number) {
        if (this.canvas == null) {
            throw new Error("Canvas does not exist!");
        }

        // return the original coordinate
        let startX = pageX - this.canvas.getBoundingClientRect().left;
        let startY = pageY - this.canvas.getBoundingClientRect().top;
        let invertedCord = this.invertTransform(startX, startY);
        let x = invertedCord.x,
            y = invertedCord.y;
        return [x, y];
    }

    moveSmallDistance(pageX: number, pageY: number) {
        if (this.startX === undefined || this.startY === undefined) {
            // User may click outside of the canvas
            return true;
        }

        const [newX, newY] = this.getOriginalXY(pageX, pageY);
        const dist = Math.sqrt((newX - this.startX) * (newX - this.startX) + (newY - this.startY) * (newY - this.startY));
        // TODO: the threshold need to be tested;
        if (dist < 5) {
            return true;
        }

        return false;
    }

    gesturePinchZoom = (event: TouchEvent) => {
        let zoom = 0;

        if (event.targetTouches.length >= 2) {
            let p1 = event.targetTouches[0];
            let p2 = event.targetTouches[1];
            let zoomScale = Math.sqrt(Math.pow(p2.clientX - p1.clientX, 2) + Math.pow(p2.clientY - p1.clientY, 2)); //euclidian distance

            if (this.lastZoomScale) {
                zoom = zoomScale - this.lastZoomScale;
            }

            this.lastZoomScale = zoomScale;
        }

        return zoom * 0.2;
    };

    doZoom = (
            zoom: number, 
            x: number|null = null,
            y: number|null = null
        ) => {
        if (!zoom) return;
        zoom *= 4;
        if (this.canvas == null) {
            throw "Canvas does not exist!";
        }

        if (x == null || y == null) {
            let canvasmiddleX = this.canvas.clientWidth / 2;
            let canvasmiddleY = this.canvas.clientHeight / 2;
            x = -this.position.x + canvasmiddleX;
            y = -this.position.y + canvasmiddleY;
        }

        let currentScale = this.scale.x;
        let newScale = this.scale.x * (100 + zoom) / 100;

        let deltaScale = newScale - currentScale;
        let currentWidth = (this.image.width * this.scale.x);
        let currentHeight = (this.image.height * this.scale.y);
        let deltaWidth = this.image.width * deltaScale;
        let deltaHeight = this.image.height * deltaScale;

        //by default scale doesnt change position and only add/remove pixel to right and bottom
        //so we must move the image to the left to keep the image centered
        //ex: coefX and coefY = 0.5 when image is centered <=> move image to the left 0.5x pixels added to the right
        let coefX = -x / (currentWidth);
        let coefY = -y / (currentHeight);
        let newPosX = this.position.x + deltaWidth * coefX;
        let newPosY = this.position.y + deltaHeight * coefY;

        // Zoom in / zoom out threshold
        let newWidth = currentWidth + deltaWidth;
        let newHeight = currentHeight + deltaHeight;
        if (newWidth < this.props.height / 2 || newWidth > this.props.width * 8) {
            return;
        }
        if (newHeight < this.props.height / 2 || newHeight > this.props.height * 8) {
            return;
        }

        //finally affectations
        this.scale.x = newScale;
        this.scale.y = newScale;
        this.position.x = newPosX;
        this.position.y = newPosY;

        this.refreshBoxTipPosition();
    };

    doMove = (relativeX: number, relativeY: number) => {
        if(this.state.isAnnotating){
            if(this.state.annotateType==2)
                this.labelMove(relativeX, relativeY);
            else if(this.state.annotateType==1)
                this.annotateMove(relativeX, relativeY);
        } else{
            this.dragMove(relativeX, relativeY);
        }
    };

    annotateMove = (relativeX: number, relativeY: number) => {
        if (this.startX === undefined || this.startY === undefined) {
            throw new Error("startX | startY undefined")
        }

        let { x, y } = this.invertTransform(relativeX, relativeY);
        this.annotatingBox = new RecBox(
            Math.min(this.startX, x),
            Math.min(this.startY, y),
            Math.abs(x - this.startX),
            Math.abs(y - this.startY)
        );

        if (this.CurrenttDefaultType) {
            this.annotatingBox.annotation = this.CurrenttDefaultType;
        } else if (this.props.defaultType) {
            this.annotatingBox.annotation = this.props.defaultType;
        } else {
            this.annotatingBox.annotation = this.flawTypes[0];
        }
    };
    labelMove = (relativeX: number, relativeY: number) => {
        if (this.startX === undefined || this.startY === undefined) {
            throw new Error("startX | startY undefined")
        }

        let { x, y } = this.invertTransform(relativeX, relativeY);
        this.annotatingBox = new LabelBox(
            Math.min(this.startX, x),
            Math.min(this.startY, y),
            Math.abs(x - this.startX),
            Math.abs(y - this.startY),
            "",
            0
        );
        this.annotatingBox.annotation = "label";
    };

    dragMove = (relativeX: number, relativeY: number) => {
        if (this.lastX && this.lastY) {
            if (this.canvas == null) {
                throw new Error("Canvas does not exist!");
            }

            let deltaX = relativeX - this.lastX;
            let deltaY = relativeY - this.lastY;

            this.position.x += deltaX;
            this.position.y += deltaY;


            let currentWidth = (this.image.width * this.scale.x);
            let currentHeight = (this.image.height * this.scale.y);
            let halfWidth = this.props.width / 2,
                halfHeight = this.props.height / 2;
            //edge cases
            if (this.position.x > halfWidth) {
                this.position.x = halfWidth;
            }
            else if (this.position.x + currentWidth < this.canvas.clientWidth - halfWidth) {
                this.position.x = this.canvas.clientWidth - currentWidth - halfWidth;
            }
            if (this.position.y > halfHeight) {
                this.position.y = halfHeight;
            }
            else if (this.position.y + currentHeight < this.canvas.clientHeight - halfHeight) {
                this.position.y = this.canvas.clientHeight - currentHeight - halfHeight;
            }

        }

        this.lastX = relativeX;
        this.lastY = relativeY;
    };

    draw = (timestamp: DOMTimeStamp | null = null) => {
        if (this.canvas == null || this.ctx == null) {
            throw new Error("Canvas does not exist!");
        }
        const margin = 8;
        // this.ctx.clearRect(0, 0, this.props.width, this.props.height);
        this.ctx.drawImage(this.bg, 0, 0, Math.min(this.props.width, 600), Math.min(this.props.height, 600),
            0, 0, this.props.width, this.props.height);
        this.ctx.save();
        this.ctx.translate(this.position.x, this.position.y);
        this.ctx.scale(this.scale.x, this.scale.y);
        this.ctx.drawImage(
            this.image,
            0,
            0,
            this.image.width,
            this.image.height
        ); 
        if(this.props.priorNaturalX&&this.props.priorY&&this.props.priorNaturalX!=0&&this.props.priorY!=0&&this.ctx){
            this.ctx.strokeStyle = 'rgba(250, 250, 2500, 0.6)';
            this.ctx.lineWidth = 5 / this.scale.x;
            let ctx_X = this.props.priorNaturalX / imageNaturalSize * this.image.naturalWidth;
            let ctx_Y = this.props.priorY;
            this.ctx.strokeRect(ctx_X,ctx_Y,300,300)
        }
        if (this.annotatingBox !== undefined) {
            if(this.annotatingBox.type=="rectangle")
            {
                this.ctx.save();
                this.ctx.lineWidth = 2 / this.scale.x;
                this.ctx.fillStyle = "#f00";
                this.ctx.strokeStyle = '#333';
                this.ctx.strokeRect((this.annotatingBox as RecBox).x, (this.annotatingBox as RecBox).y, (this.annotatingBox as RecBox).w, (this.annotatingBox as RecBox).h);
                this.ctx.fillStyle = 'rgba(250, 50, 50, 0.3)';
                this.ctx.fillRect((this.annotatingBox as RecBox).x, (this.annotatingBox as RecBox).y, (this.annotatingBox as RecBox).w, (this.annotatingBox as RecBox).h);
                this.ctx.restore();
                this.ctx.globalAlpha = 0.3;
            }else if(this.annotatingBox.type=="label")
            {
                this.ctx.save();
                this.ctx.lineWidth = 2 / this.scale.x;
                this.ctx.fillStyle = "#f00";
                this.ctx.strokeStyle = '#333';
                this.ctx.strokeRect((this.annotatingBox as LabelBox).x, (this.annotatingBox as LabelBox).y, (this.annotatingBox as LabelBox).w, (this.annotatingBox as LabelBox).h);
                this.ctx.fillStyle = 'rgba(250, 50, 50, 0.3)';
                this.ctx.fillRect((this.annotatingBox as LabelBox).x, (this.annotatingBox as LabelBox).y, (this.annotatingBox as LabelBox).w, (this.annotatingBox as LabelBox).h);
                this.ctx.restore();
                this.ctx.globalAlpha = 0.3;
            }
            else if(this.annotatingBox.type == "polygon"){
                this.ctx.strokeStyle = '#333';
                this.ctx.lineWidth = 2 / this.scale.x;
               // this.ctx.beginPath();
                let length = (this.annotatingBox as PolBox).getLength()
                for(let i = 0;i<length;i++){
                    this.ctx.beginPath();
                    this.ctx.globalAlpha = 0.85;
                    this.ctx.arc((this.annotatingBox as PolBox).points[i].x, (this.annotatingBox as PolBox).points[i].y, radius, 0, Math.PI*2);
                    this.ctx.fillStyle = i?"blue":"red";
                    this.ctx.strokeStyle = "black";
                    this.ctx.fill();
                    this.ctx.stroke();
                }
                this.ctx.beginPath();
                if(length !==0)
                    this.ctx.moveTo((this.annotatingBox as PolBox).points[0].x,(this.annotatingBox as PolBox).points[0].y);
                for(let i = 0;i<length;i++){
                        this.ctx.lineTo((this.annotatingBox as PolBox).points[i].x,(this.annotatingBox as PolBox).points[i].y);
                }
                this.ctx.stroke();
            }
        }

        this.ctx.fillStyle = "#f00";
        for (let i = 0; i < this.boxes.length; i++) {
            let box = this.boxes[i];
            const fontSize = 30 / this.scale.x;
            if (box.chosen) {
                if (box.hover){
                    if(box.type=="rectangle"){
                        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                        this.ctx.lineWidth = 2 / this.scale.x;
                        this.ctx.strokeRect((box as RecBox).x, (box as RecBox).y, (box as RecBox).w, (box as RecBox).h);
                    }else if(box.type=="label"){
                        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                        this.ctx.lineWidth = 2 / this.scale.x;
                        this.ctx.strokeRect((box as LabelBox).x, (box as LabelBox).y, (box as LabelBox).w, (box as LabelBox).h);
                    }
                    else{
                        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                        this.ctx.lineWidth = 2 / this.scale.x;
                        let length = (box as PolBox).getLength()
                        for(let i = 0;i<length;i++){
                            this.ctx.beginPath();
                            this.ctx.globalAlpha = 0.85;
                            this.ctx.arc((box as PolBox).points[i].x, (box as PolBox).points[i].y, radius, 0, Math.PI*2);
                            this.ctx.fillStyle = "blue";
                            this.ctx.strokeStyle = "black";
                            this.ctx.fill();
                            this.ctx.stroke();
                        }
                        this.ctx.beginPath();
                        if(length !==0)
                            this.ctx.moveTo((box as PolBox).points[0].x,(box as PolBox).points[0].y);
                        for(let i = 0;i<length;i++){
                                this.ctx.lineTo((box as PolBox).points[i].x,(box as PolBox).points[i].y);
                        }
                        if(length !==0)
                            this.ctx.lineTo((box as PolBox).points[0].x,(box as PolBox).points[0].y);
                        this.ctx.stroke();
                        // text
                        this.ctx.fillStyle = 'rgba(40, 40, 40, 0.8)';
                        this.ctx.textAlign = 'center';
                        this.ctx.font = fontSize + 'px Ubuntu';
                        this.ctx.fillText(box.annotation, (box as RecBox).x + (box as RecBox).w / 2, (box as RecBox).y + (box as RecBox).h / 2 + fontSize / 2);
                    }
                } else {
                    if(box.type=="rectangle"){
                        this.ctx.lineWidth = 5 / this.scale.x;
                        this.ctx.strokeStyle = '#555';
                        this.ctx.strokeRect((box as RecBox).x, (box as RecBox).y, (box as RecBox).w, (box as RecBox).h);
        
                        this.ctx.fillStyle = 'rgba(255, 100, 145, 0.3)';
                        this.ctx.fillRect((box as RecBox).x, (box as RecBox).y, ((box as RecBox) as RecBox).w, (box as RecBox).h);
                        // text
                        this.ctx.fillStyle = 'rgba(40, 40, 40, 0.8)';
                        this.ctx.textAlign = 'center';
                        this.ctx.font = fontSize + 'px Ubuntu';
                        this.ctx.fillText(box.annotation, (box as RecBox).x + (box as RecBox).w / 2, (box as RecBox).y + (box as RecBox).h / 2 + fontSize / 2);
                    }else if(box.type=="label"){
                        this.ctx.lineWidth = 5 / this.scale.x;
                        this.ctx.strokeStyle = '#555';
                        this.ctx.strokeRect((box as LabelBox).x, (box as LabelBox).y, (box as LabelBox).w, (box as LabelBox).h);
        
                        this.ctx.fillStyle = 'rgba(255, 100, 145, 0.3)';
                        this.ctx.fillRect((box as LabelBox).x, (box as LabelBox).y, ((box as LabelBox) as LabelBox).w, (box as LabelBox).h);
                        // text
                        this.ctx.fillStyle = 'rgba(40, 40, 40, 0.8)';
                        this.ctx.textAlign = 'center';
                        this.ctx.font = fontSize + 'px Ubuntu';
                        this.ctx.fillText(box.annotation, (box as LabelBox).x + (box as LabelBox).w / 2, (box as LabelBox).y + (box as LabelBox).h / 2 + fontSize / 2);
                    }
                    else{
                        this.ctx.lineWidth = 5 / this.scale.x;
                        this.ctx.strokeStyle = '#555';
                        let length = (box as PolBox).getLength()
                        for(let i = 0;i<length;i++){
                            this.ctx.beginPath();
                            this.ctx.globalAlpha = 0.85;
                            this.ctx.arc((box as PolBox).points[i].x, (box as PolBox).points[i].y, radius, 0, Math.PI*2);
                            this.ctx.fillStyle = "blue";
                            this.ctx.strokeStyle = "black";
                            this.ctx.fill();
                            this.ctx.stroke();
                        }
                        this.ctx.beginPath();
                        if(length !==0)
                            this.ctx.moveTo((box as PolBox).points[0].x,(box as PolBox).points[0].y);
                        for(let i = 0;i<length;i++){
                                this.ctx.lineTo((box as PolBox).points[i].x,(box as PolBox).points[i].y);
                        }
                        if(length !==0)
                            this.ctx.lineTo((box as PolBox).points[0].x,(box as PolBox).points[0].y);
                        this.ctx.stroke();
                        // text
                        this.ctx.fillStyle = 'rgba(40, 40, 40, 0.8)';
                        this.ctx.textAlign = 'center';
                        this.ctx.font = fontSize + 'px Ubuntu';
                        let {left,right,top,buttom} = (box as PolBox).getBounding();
                        this.ctx.fillText(box.annotation, (left + right)/ 2, (top +  buttom + fontSize)/ 2);
                    }
                }
            } else if (box.hover) {
                if(box.type=="rectangle"){
                    this.ctx.lineWidth = 5 / this.scale.x;
                    this.ctx.strokeStyle = '#555';
                    this.ctx.strokeRect((box as RecBox).x, (box as RecBox).y, (box as RecBox).w, (box as RecBox).h);

                    this.ctx.fillStyle = 'rgba(255, 100, 145, 0.3)';
                    this.ctx.fillRect((box as RecBox).x, (box as RecBox).y, (box as RecBox).w, (box as RecBox).h);
                    // text
                    this.ctx.fillStyle = 'rgba(40, 40, 40, 0.8)';
                    this.ctx.textAlign = 'center';
                    this.ctx.font = fontSize + 'px Ubuntu';
                    this.ctx.fillText(box.annotation, (box as RecBox).x + (box as RecBox).w / 2, (box as RecBox).y + (box as RecBox).h / 2 + fontSize / 2);
                }else if(box.type=="label"){
                    this.ctx.lineWidth = 5 / this.scale.x;
                    this.ctx.strokeStyle = '#555';
                    this.ctx.strokeRect((box as LabelBox).x, (box as LabelBox).y, (box as LabelBox).w, (box as LabelBox).h);

                    this.ctx.fillStyle = 'rgba(255, 100, 145, 0.3)';
                    this.ctx.fillRect((box as LabelBox).x, (box as LabelBox).y, (box as LabelBox).w, (box as LabelBox).h);
                    // text
                    this.ctx.fillStyle = 'rgba(40, 40, 40, 0.8)';
                    this.ctx.textAlign = 'center';
                    this.ctx.font = fontSize + 'px Ubuntu';
                    this.ctx.fillText(box.annotation, (box as LabelBox).x + (box as LabelBox).w / 2, (box as LabelBox).y + (box as LabelBox).h / 2 + fontSize / 2);
                }
                else{
                    this.ctx.lineWidth = 5 / this.scale.x;
                    this.ctx.strokeStyle = '#555';
                    let length = (box as PolBox).getLength()
                    this.ctx.beginPath();
                    if(length != 0){
                        this.ctx.moveTo((box as PolBox).points[0].x,(box as PolBox).points[0].y);
                    }
                    for(let i = 1;i<length;i++){
                        this.ctx.lineTo((box as PolBox).points[i].x,(box as PolBox).points[i].y);
                    }
                    if(length!=0)
                        this.ctx.lineTo((box as PolBox).points[0].x,(box as PolBox).points[0].y);
                    this.ctx.stroke();
                    this.ctx.fillStyle = 'rgba(255, 100, 145, 0.3)';
                    this.ctx.fill();
                    // text
                    this.ctx.fillStyle = 'rgba(40, 40, 40, 0.8)';
                    this.ctx.textAlign = 'center';
                    this.ctx.font = fontSize + 'px Ubuntu';
                    let {left,right,top,buttom} = (box as PolBox).getBounding();
                    this.ctx.fillText(box.annotation, (left + right)/ 2, (top +  buttom + fontSize)/ 2);
                }
            } else {
                if(box.type=="rectangle"){
                    this.ctx.lineWidth = 5 / this.scale.x;
                    this.ctx.strokeStyle = '#555';
                    this.ctx.strokeRect((box as RecBox).x, (box as RecBox).y, (box as RecBox).w, (box as RecBox).h);

                    this.ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
                    this.ctx.lineWidth = 3 / this.scale.x;
                    this.ctx.strokeRect((box as RecBox).x + margin, (box as RecBox).y + margin, (box as RecBox).w - margin * 2, (box as RecBox).h - margin * 2)
                    // text
                    this.ctx.fillStyle = 'rgba(40, 40, 40, 0.3)';
                    this.ctx.textAlign = 'center';
                    this.ctx.font = fontSize + 'px Ubuntu';
                    this.ctx.fillText(box.annotation, (box as RecBox).x + (box as RecBox).w / 2, (box as RecBox).y + (box as RecBox).h / 2 + fontSize / 2);
                }else if(box.type=="label"){
                    this.ctx.lineWidth = 5 / this.scale.x;
                    this.ctx.strokeStyle = '#555';
                    this.ctx.strokeRect((box as LabelBox).x, (box as LabelBox).y, (box as LabelBox).w, (box as LabelBox).h);

                    this.ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
                    this.ctx.lineWidth = 3 / this.scale.x;
                    this.ctx.strokeRect((box as LabelBox).x + margin, (box as LabelBox).y + margin, (box as LabelBox).w - margin * 2, (box as LabelBox).h - margin * 2)
                    // text
                    this.ctx.fillStyle = 'rgba(40, 40, 40, 0.3)';
                    this.ctx.textAlign = 'center';
                    this.ctx.font = fontSize + 'px Ubuntu';
                    this.ctx.fillText(box.annotation, (box as LabelBox).x + (box as LabelBox).w / 2, (box as LabelBox).y + (box as LabelBox).h / 2 + fontSize / 2);
                }
                else{
                    this.ctx.lineWidth = 3 / this.scale.x;
                    this.ctx.strokeStyle = '#555';
                    let length = (box as PolBox).getLength()
                    this.ctx.beginPath();
                    if(length != 0){
                        this.ctx.moveTo((box as PolBox).points[0].x,(box as PolBox).points[0].y);
                    }
                    for(let i = 1;i<length;i++){
                        this.ctx.lineTo((box as PolBox).points[i].x,(box as PolBox).points[i].y);
                    }
                    if(length != 0)
                        this.ctx.lineTo((box as PolBox).points[0].x,(box as PolBox).points[0].y);
                    this.ctx.stroke();
                    // text
                    this.ctx.fillStyle = 'rgba(40, 40, 40, 0.3)';
                    this.ctx.textAlign = 'center';
                    this.ctx.font = fontSize + 'px Ubuntu';
                    let {left,right,top,buttom} = (box as PolBox).getBounding();
                    this.ctx.fillText(box.annotation, (left + right)/ 2, (top +  buttom + fontSize)/ 2);
                 }
            }
        }

        this.ctx.restore();
        // if there is performance issue, we can optimize
        // this part by judging whether we should draw or not
        if (this.isDrawing) {
            requestAnimationFrame(this.draw);
        }
    };

    initCanvas = (url: string) => {
        if (url.length === 0) {
            url = "https://i.postimg.cc/q7RCmNNV/example.png";
        }

        this.isDrawing = false;
        this.image.src = url;
        this.isDrawing = true;
        this.position.x = 0;
        this.position.y = 0;
        this.chosenBox = undefined;
        this.boxes = [];
        this.annotatingBox = undefined;
        this.setState({hoverEdge: undefined, isMovingBox: false,hoverPoint:-1});
    };

    getPostData = () => {
        let data = {
            image: this.image.src,
            height: this.image.naturalHeight,
            width: this.image.naturalWidth,
            boxes: this.boxes.map(box => box.getData()),
        };

        if (this.props.sceneTypes) {
            data['sceneType'] = this.state.sceneType;
        }
        return data;
    };

    onUpload = () => {
        if (this.props.asyncUpload == null) {
            return;
        }
        
        if(confirm("确定要提交吗")==false)
            return;

        this.setState({
            uploadIcon: 'loading',
            mouse_down: false,
            showAnnotation: false,
        });

        this.props.asyncUpload(this.getPostData())
            .then(data => {
                this.setState({ uploadIcon: 'check', uploaded: true });
                setTimeout(() => {
                    this.setState({ uploadIcon: "upload" });
                }, 5000);
            })
            .catch(err => {
                console.log(err);
                this.setState({ uploadIcon: 'close' });
            });
    };

    onTransform = ()=>{
            this.setState({isTransform:!this.state.isTransform});
    }

    onDelete = () => {
        const chosen = this.chosenBox;
        if (chosen === undefined) {
            return;
        }

        this.cancelChosenBox();
        //this.nextDefaultType = chosen.annotation;
        const index = this.boxes.indexOf(chosen);
        this.boxes.splice(index, 1);
    }

    modalHandleOk = ()=> {
        let label:Label = {type:this.state.labelType,distance:this.state.labelDist,
             naturalX:this.state.labelX,y:this.state.labelY}
        if(this.props.isLabelLeft){
            label.naturalX = label.distance + label.naturalX/this.image.naturalWidth*imageNaturalSize
        }
        else{
            label.naturalX = label.distance + imageNaturalSize - label.naturalX/this.image.naturalWidth*imageNaturalSize
        }
        this.setState({modalVisible:false})
        if(this.props.returnLabel != undefined)
            this.props.returnLabel(label)
        if(this.boxes.length>0&&this.boxes[this.boxes.length-1].type == "label"){
            (this.boxes[this.boxes.length-1] as LabelBox).label = this.state.labelType;
            (this.boxes[this.boxes.length-1] as LabelBox).dist = this.state.labelDist;
        }
        this.CurrenttDefaultType = this.state.labelType;
        if(this.props.setLeft)
            this.props.setLeft();
    }
    modalHandleCancel = ()=> {
        this.setState({modalVisible:false})
        this.annotatingBox = undefined;
    }

    render() {
        let { width, height, sceneTypes, showButton = true, className = "", style = {}, disableAnnotation=false} = this.props;
        let { showAnnotation, hover, mouse_down } = this.state;
        if (showAnnotation && hover && mouse_down) {
            showAnnotation = false;
        }

        if(this.state.isTransform == true){
            disableAnnotation = true;
        }

        if (disableAnnotation) {
            showButton = false;
        }

        if (!style.hasOwnProperty('position')){
            style['position'] = 'relative';
        }

        // const shownStyle = Object.assign({}, style, {width});
        const shownStyle = Object.assign({}, style);
        let cursor = this.state.hover ? 'pointer' :
            (this.state.isAnnotating ? 'crosshair' : 'grab');
        if(this.state.hoverPoint != -1)
            cursor = 'e-resize'; 
        else if (this.state.isMovingBox) {
            cursor = 'move';
        } else if (this.state.hoverEdge) {
            if (this.state.hoverEdge === 'left' || this.state.hoverEdge === 'right'){
                cursor = 'e-resize';
            } else {
                cursor = 'n-resize';
            }
        }
        let isLocked = disableAnnotation || this.state.lock;
        let sceneTypeSelect = undefined;
        if (sceneTypes) {
            sceneTypeSelect = (
                <Select
                    onChange={(sceneType: string) => {
                        this.setState({ sceneType });
                    }}
                    value={this.state.sceneType}
                >
                    {sceneTypes.map((type: string) =>
                        <Option value={type} key={type}>{type}</Option>
                    )}
                </Select>
            );
        }
        const buttons = (
            showButton ? (
                <React.Fragment>
                    <Button style={{ margin: 8 }} onClick={() => this.setState({ isAnnotating: !this.state.isAnnotating })} >
                        To {this.state.isAnnotating ? 'Move' : 'Annotate'}
                    </Button>
                    <Select
                    onChange={(type: string) => {
                        if(type=="矩形")
                            this.setState({annotateType:1})
                        if(type=="贴标")
                            this.setState({annotateType:2})
                        if(type=="多边形")
                            this.setState({annotateType:3})
                    }} defaultValue={"矩形"}>
                        <Option value={"矩形"} key={1}>{"矩形"}</Option>
                        <Option value={"贴标"} key={2}>{"贴标"}</Option>
                        <Option value={"多边形"} key={3}>{"多边形"}</Option>
                    </Select>
                    <Button onClick={this.onUpload} style={{ marginRight: 8 }} disabled={this.props.imageUrl.length === 0}>
                        Upload
                    </Button>
                    {sceneTypeSelect}
                </React.Fragment>
            ) : null
        );
        return (
            <div
                style={shownStyle}
                className={className}
            >
                {buttons}
                <Button onClick={this.onTransform} style={{ marginLeft: 10 }} disabled={this.props.imageUrl.length === 0}>
                        倒置图像
                    </Button>
                <div style={{
                    position: 'relative',
                    width,
                    height,
                    margin: '0 auto',
                    borderRadius: 5,
                }}>
                    <canvas
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            zIndex: 0,
                            cursor: cursor,
                            borderRadius: 5,
                            transform: this.state.isTransform?'rotate(180deg)':''
                        }}
                        ref={this.imageCanvas}
                        width={width}
                        height={height} />

                    <div
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            zIndex: 50,
                            width: width,
                            height: height,
                            display: this.state.uploaded ? 'block' : 'none',
                            backgroundColor: 'rgba(255,255,255,0.3)',
                            textAlign: 'center',
                        }}>
                        <h1
                            style={{
                                margin: `${height / 2}  auto`,
                                fontSize: width / 20,
                            }}
                        >
                            Uploaded
                        </h1>
                    </div>
                    <Modal
                        width={300}
                        style={{
                            position: 'absolute',
                            left: "40%",
                            top: '10%',
                            borderRadius: 4,
                            backgroundColor: 'white',
                            zIndex: 10
                        }} 
                        title="采集贴标信息"
                        visible={this.state.modalVisible}
                        onOk={this.modalHandleOk}
                        onCancel={this.modalHandleCancel}>
                        <div>
                        <Select 
                        style={{ width: 120 }}
                        defaultValue = {this.flawTypes[0]}
                        onChange={(value:string)=>{
                            this.setState({labelType:value})
                        }}>
                        {this.flawTypes.map((item:string)=>
                            <Option value={item}>{item}</Option>
                        )}
                        </Select>
                        </div>
                        <div>
                        </div>
                        <div>
                        <InputNumber max={180} min={0} onChange={(value)=>{
                            if(value!== undefined)
                                this.setState({labelDist:value})}}/>
                        </div>
                    </Modal>

                    <Form
                        className="canvas-annotation"
                        style={{
                            display: showAnnotation? 'block' : 'none',
                            position: 'absolute',
                            left: this.state.x,
                            top: this.state.y + 10,
                            padding: 8,
                            backgroundColor: 'white',
                            borderRadius: 4,
                            zIndex: 1
                        }}
                    >
                        <Select
                            onChange={(value: string) => {
                                if (this.chosenBox !== undefined) {
                                    this.chosenBox.annotation = value;
                                    this.setState({ annotation: value });
                                }
                            }}
                            disabled={isLocked}
                            value={this.state.annotation}
                        >
                            {this.chosenBox!==undefined?(this.chosenBox.type!=="label"?this.flawTypes.map((item: string) =>
                                <Option value={item} key={item}>{item}</Option>
                            ):<Option value={"label"}>label</Option>):undefined}

                        </Select>

                        <Button
                            icon={isLocked ? 'lock' : 'unlock'}
                            shape="circle"
                            type="primary"
                            style={{
                                margin: 4,
                                float: 'left'
                            }}
                            disabled={disableAnnotation}
                            onClick={() => {
                                if (this.chosenBox) {
                                    if (this.chosenBox.lock) {
                                        this.chosenBox.lock = false;
                                        this.setState({ lock: false });
                                    } else {
                                        this.chosenBox.lock = true;
                                        this.setState({ lock: true });
                                    }
                                }
                            }}
                        />
                        <Button
                            icon="delete"
                            shape="circle"
                            type="primary"
                            style={{
                                float: 'right',
                                margin: 4
                            }}
                            disabled={isLocked}
                            onClick={this.onDelete}
                        />
                    </Form>
                </div>
            </div>
        );
    }
}
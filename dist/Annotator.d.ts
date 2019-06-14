import * as React from 'react';
import 'antd/lib/button/style/css';
import 'antd/lib/form/style/css';
import 'antd/lib/select/style/css';
interface Props {
    imageUrl: string;
    height: number;
    width: number;
    asyncUpload: (data: any) => Promise<any>;
    types: Array<string>;
    defaultType?: string | undefined;
    name?: string | null | undefined;
    showButton?: boolean;
    className?: string;
    style?: any;
}
interface State {
    isAnnotating: boolean;
    showAnnotation: boolean;
    annotation: string;
    hover: boolean;
    mouse_down: boolean;
    uploadIcon: 'upload' | 'check' | 'loading' | 'close';
    lock: boolean;
    uploaded: boolean;
    x: number;
    y: number;
}
declare class Box {
    x: number;
    y: number;
    w: number;
    h: number;
    hover: boolean;
    chosen: boolean;
    lock: boolean;
    annotation: string;
    constructor(x: number, y: number, w: number, h: number);
    insideBox(x: number, y: number): boolean;
}
export declare class Annotator extends React.Component<Props, State> {
    private readonly imageCanvas;
    private readonly image;
    private canvas?;
    private ctx?;
    private lastZoomScale?;
    private lastX?;
    private lastY?;
    private position;
    private scale;
    private startX;
    private startY;
    private annotatingBox;
    private chosenBox;
    private isDrawing;
    private boxes;
    private bg;
    constructor(props: Props);
    componentWillReceiveProps(nextProps: Readonly<Props>, nextContext: any): void;
    componentDidMount(): void;
    setEventListeners: () => void;
    searchChosenBox: () => Box | undefined;
    chooseBox: (box: Box, showAnnotation?: boolean) => void;
    refreshBoxTipPosition: () => void;
    cancelChosenBox: () => void;
    getCurrentCoordinate(box: Box): {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    mouseHoverCheck(mouseX: number, mouseY: number): void;
    invertTransform(x: number, y: number): {
        x: number;
        y: number;
    };
    getOriginalXY(pageX: number, pageY: number): number[];
    moveSmallDistance(pageX: number, pageY: number): boolean;
    gesturePinchZoom: (event: TouchEvent) => number;
    doZoom: (zoom: number) => void;
    doMove: (relativeX: number, relativeY: number) => void;
    annotateMove: (relativeX: number, relativeY: number) => void;
    dragMove: (relativeX: number, relativeY: number) => void;
    draw: (timestamp?: number | null) => void;
    initCanvas: (url: string) => void;
    getPostData: () => {
        image: string;
        height: number;
        width: number;
        flaws: Box[];
    };
    onUpload: () => void;
    render(): JSX.Element;
}
export {};

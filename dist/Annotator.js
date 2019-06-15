import * as tslib_1 from "tslib";
import * as React from 'react';
import { Button, Form, Select } from 'antd';
import 'antd/lib/button/style/css';
import 'antd/lib/form/style/css';
import 'antd/lib/select/style/css';
import example from './res/example.png';
import bg from './res/bg.png';
var Option = Select.Option;
var Box = /** @class */ (function () {
    function Box(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.hover = false;
        this.chosen = false;
        this.lock = false;
        this.annotation = '';
    }
    Box.prototype.insideBox = function (x, y) {
        if (x >= this.x && y >= this.y && x <= this.x + this.w && y <= this.y + this.h) {
            return true;
        }
        return false;
    };
    Box.prototype.getData = function () {
        var _a = this, x = _a.x, y = _a.y, w = _a.w, h = _a.h, annotation = _a.annotation;
        return { x: x, y: y, w: w, h: h, annotation: annotation };
    };
    return Box;
}());
var Annotator = /** @class */ (function (_super) {
    tslib_1.__extends(Annotator, _super);
    function Annotator(props) {
        var _this = _super.call(this, props) || this;
        _this.setEventListeners = function () {
            if (_this.canvas == null) {
                throw new Error("Canvas does not exist!");
            }
            _this.canvas.addEventListener('touchstart', function (e) {
                var _a;
                if (e.targetTouches.length == 1) {
                    _a = _this.getOriginalXY(e.targetTouches[0].clientX, e.targetTouches[0].clientY), _this.startX = _a[0], _this.startY = _a[1];
                }
                _this.lastX = null;
                _this.lastY = null;
                _this.lastZoomScale = null;
            });
            _this.canvas.addEventListener('touchmove', function (e) {
                if (_this.canvas == null) {
                    throw new Error("Canvas does not exist!");
                }
                if (e.targetTouches.length == 2) { //pinch
                    _this.doZoom(_this.gesturePinchZoom(e));
                }
                else if (e.targetTouches.length == 1) {
                    var relativeX = e.targetTouches[0].clientX - _this.canvas.getBoundingClientRect().left;
                    var relativeY = e.targetTouches[0].clientY - _this.canvas.getBoundingClientRect().top;
                    _this.doMove(relativeX, relativeY);
                }
                e.preventDefault();
                e.stopPropagation();
            });
            _this.canvas.addEventListener('touchend', function (e) {
                var isSmallDistance = false;
                if (e.targetTouches.length === 1) {
                    var x = e.targetTouches[0].clientX, y = e.targetTouches[0].clientY;
                    isSmallDistance = _this.moveSmallDistance(x, y);
                    _this.mouseHoverCheck(x, y);
                    if (isSmallDistance) {
                        _this.searchChosenBox();
                    }
                }
                if (_this.annotatingBox !== undefined && !isSmallDistance) {
                    _this.chooseBox(_this.annotatingBox);
                    _this.boxes.push(_this.annotatingBox);
                    _this.annotatingBox = undefined;
                }
                _this.startX = undefined;
                _this.startY = undefined;
            });
            // ========================
            // on desktop devices
            // keyboard+mouse
            window.addEventListener('keyup', function (e) {
                if (e.key === '+' || e.key === '=' || e.keyCode == 38 || e.keyCode == 39) { //+
                    e.preventDefault();
                    _this.doZoom(5);
                }
                else if (e.key === '-' || e.key === '_' || e.keyCode == 37 || e.keyCode == 40) { //-
                    e.preventDefault();
                    _this.doZoom(-5);
                }
                else if (e.key === 'Enter' || e.keyCode == 13 || e.which == 13) {
                    console.log(e.key);
                    _this.onUpload();
                    e.preventDefault();
                    e.stopPropagation();
                }
                // TODO: Add Drag / Move switch
                else {
                    console.log(e.key);
                }
            });
            _this.canvas.addEventListener('mousedown', function (e) {
                var _a;
                _a = _this.getOriginalXY(e.clientX, e.clientY), _this.startX = _a[0], _this.startY = _a[1];
                _this.setState({ mouse_down: true });
                _this.lastX = null;
                _this.lastY = null;
            });
            _this.canvas.addEventListener('mouseup', function (e) {
                // TODO merge this and touch callback
                if (_this.moveSmallDistance(e.clientX, e.clientY)) {
                    _this.searchChosenBox();
                }
                else if (_this.annotatingBox !== undefined) {
                    _this.chooseBox(_this.annotatingBox);
                    _this.boxes.push(_this.annotatingBox);
                    _this.annotatingBox = undefined;
                }
                _this.setState({ mouse_down: false });
                _this.startX = undefined;
                _this.startY = undefined;
            });
            _this.canvas.addEventListener('mouseout', function (e) {
                _this.setState({ mouse_down: false });
                _this.annotatingBox = undefined;
            });
            _this.canvas.addEventListener('mousemove', function (e) {
                if (_this.canvas == null) {
                    throw new Error("Canvas does not exist!");
                }
                var relativeX = e.clientX - _this.canvas.getBoundingClientRect().left;
                var relativeY = e.clientY - _this.canvas.getBoundingClientRect().top;
                if (e.target == _this.canvas && _this.state.mouse_down) {
                    _this.doMove(relativeX, relativeY);
                }
                if (!_this.state.mouse_down) {
                    _this.mouseHoverCheck(e.clientX, e.clientY);
                }
                // if(relativeX <= 0 || relativeX >= this.props.width || relativeY <= 0 || relativeY >= this.props.height) {
                //     this.mouse_down = false;
                // }
            });
            _this.canvas.addEventListener('wheel', function (e) {
                if (e.deltaY > 0) {
                    _this.doZoom(-2);
                }
                else if (e.deltaY < 0) {
                    _this.doZoom(2);
                }
                e.stopPropagation();
                e.preventDefault();
            });
        };
        _this.searchChosenBox = function () {
            var chosen = undefined;
            for (var i = 0; i < _this.boxes.length; i++) {
                if (_this.boxes[i].hover) {
                    if (chosen !== undefined) {
                        return;
                    }
                    chosen = _this.boxes[i];
                }
            }
            if (chosen !== undefined) {
                _this.cancelChosenBox();
                _this.chooseBox(chosen);
            }
            else {
                _this.cancelChosenBox();
            }
            return chosen;
        };
        _this.chooseBox = function (box, showAnnotation) {
            if (showAnnotation === void 0) { showAnnotation = true; }
            box.chosen = true;
            var _a = _this.getCurrentCoordinate(box), x = _a.x, y = _a.y, h = _a.h;
            _this.chosenBox = box;
            _this.setState({
                annotation: box.annotation,
                x: x,
                y: y + h,
                lock: box.lock
            });
            if (showAnnotation) {
                _this.setState({
                    showAnnotation: true
                });
            }
        };
        _this.refreshBoxTipPosition = function () {
            if (_this.chosenBox !== undefined) {
                _this.chooseBox(_this.chosenBox, false);
            }
        };
        _this.cancelChosenBox = function () {
            if (_this.chosenBox === undefined) {
                return;
            }
            _this.chosenBox.chosen = false;
            _this.setState({
                showAnnotation: false,
                annotation: ''
            });
        };
        _this.gesturePinchZoom = function (event) {
            var zoom = 0;
            if (event.targetTouches.length >= 2) {
                var p1 = event.targetTouches[0];
                var p2 = event.targetTouches[1];
                var zoomScale = Math.sqrt(Math.pow(p2.clientX - p1.clientX, 2) + Math.pow(p2.clientY - p1.clientY, 2)); //euclidian distance
                if (_this.lastZoomScale) {
                    zoom = zoomScale - _this.lastZoomScale;
                }
                _this.lastZoomScale = zoomScale;
            }
            return zoom;
        };
        _this.doZoom = function (zoom) {
            if (!zoom)
                return;
            if (_this.canvas == null) {
                throw "Canvas does not exist!";
            }
            var currentScale = _this.scale.x;
            var newScale = _this.scale.x + zoom / 100;
            var deltaScale = newScale - currentScale;
            var currentWidth = (_this.image.width * _this.scale.x);
            var currentHeight = (_this.image.height * _this.scale.y);
            var deltaWidth = _this.image.width * deltaScale;
            var deltaHeight = _this.image.height * deltaScale;
            //by default scale doesnt change position and only add/remove pixel to right and bottom
            //so we must move the image to the left to keep the image centered
            //ex: coefX and coefY = 0.5 when image is centered <=> move image to the left 0.5x pixels added to the right
            var canvasmiddleX = _this.canvas.clientWidth / 2;
            var canvasmiddleY = _this.canvas.clientHeight / 2;
            var xonmap = (-_this.position.x) + canvasmiddleX;
            var yonmap = (-_this.position.y) + canvasmiddleY;
            var coefX = -xonmap / (currentWidth);
            var coefY = -yonmap / (currentHeight);
            var newPosX = _this.position.x + deltaWidth * coefX;
            var newPosY = _this.position.y + deltaHeight * coefY;
            //edges cases
            var newWidth = currentWidth + deltaWidth;
            var newHeight = currentHeight + deltaHeight;
            if (newWidth < _this.props.height / 2)
                return;
            if (newPosX > 0) {
                newPosX = 0;
            }
            if (newPosX + newWidth < _this.canvas.clientWidth) {
                newPosX = _this.canvas.clientWidth - newWidth;
            }
            if (newHeight < _this.props.height / 2)
                return;
            if (newPosY > 0) {
                newPosY = 0;
            }
            if (newPosY + newHeight < _this.canvas.clientHeight) {
                newPosY = _this.canvas.clientHeight - newHeight;
            }
            //finally affectations
            _this.scale.x = newScale;
            _this.scale.y = newScale;
            _this.position.x = newPosX;
            _this.position.y = newPosY;
            _this.refreshBoxTipPosition();
        };
        _this.doMove = function (relativeX, relativeY) {
            if (_this.state.isAnnotating) {
                _this.annotateMove(relativeX, relativeY);
            }
            else {
                _this.dragMove(relativeX, relativeY);
            }
        };
        _this.annotateMove = function (relativeX, relativeY) {
            if (_this.startX === undefined || _this.startY === undefined) {
                throw new Error("startX | startY undefined");
            }
            var _a = _this.invertTransform(relativeX, relativeY), x = _a.x, y = _a.y;
            _this.annotatingBox = new Box(Math.min(_this.startX, x), Math.min(_this.startY, y), Math.abs(x - _this.startX), Math.abs(y - _this.startY));
            if (_this.props.defaultType) {
                _this.annotatingBox.annotation = _this.props.defaultType;
            }
        };
        _this.dragMove = function (relativeX, relativeY) {
            if (_this.lastX && _this.lastY) {
                if (_this.canvas == null) {
                    throw new Error("Canvas does not exist!");
                }
                var deltaX = relativeX - _this.lastX;
                var deltaY = relativeY - _this.lastY;
                _this.position.x += deltaX;
                _this.position.y += deltaY;
                var currentWidth = (_this.image.width * _this.scale.x);
                var currentHeight = (_this.image.height * _this.scale.y);
                var halfWidth = _this.props.width / 2, halfHeight = _this.props.height / 2;
                //edge cases
                if (_this.position.x > halfWidth) {
                    _this.position.x = halfWidth;
                }
                else if (_this.position.x + currentWidth < _this.canvas.clientWidth - halfWidth) {
                    _this.position.x = _this.canvas.clientWidth - currentWidth - halfWidth;
                }
                if (_this.position.y > halfHeight) {
                    _this.position.y = halfHeight;
                }
                else if (_this.position.y + currentHeight < _this.canvas.clientHeight - halfHeight) {
                    _this.position.y = _this.canvas.clientHeight - currentHeight - halfHeight;
                }
                _this.refreshBoxTipPosition();
            }
            _this.lastX = relativeX;
            _this.lastY = relativeY;
        };
        _this.draw = function (timestamp) {
            if (timestamp === void 0) { timestamp = null; }
            if (_this.canvas == null || _this.ctx == null) {
                throw new Error("Canvas does not exist!");
            }
            var margin = 8;
            // this.ctx.clearRect(0, 0, this.props.width, this.props.height);
            _this.ctx.drawImage(_this.bg, 0, 0, Math.min(_this.props.width, 600), Math.min(_this.props.height, 600), 0, 0, _this.props.width, _this.props.height);
            _this.ctx.save();
            _this.ctx.translate(_this.position.x, _this.position.y);
            _this.ctx.scale(_this.scale.x, _this.scale.y);
            _this.ctx.drawImage(_this.image, 0, 0, _this.image.width, _this.image.height);
            if (_this.annotatingBox !== undefined) {
                _this.ctx.save();
                _this.ctx.fillStyle = "#f00";
                _this.ctx.strokeStyle = '#333';
                _this.ctx.strokeRect(_this.annotatingBox.x, _this.annotatingBox.y, _this.annotatingBox.w, _this.annotatingBox.h);
                _this.ctx.fillStyle = 'rgba(250, 50, 50, 0.3)';
                _this.ctx.fillRect(_this.annotatingBox.x, _this.annotatingBox.y, _this.annotatingBox.w, _this.annotatingBox.h);
                _this.ctx.restore();
            }
            _this.ctx.fillStyle = "#f00";
            for (var i = 0; i < _this.boxes.length; i++) {
                var box = _this.boxes[i];
                _this.ctx.lineWidth = 5;
                _this.ctx.strokeStyle = '#555';
                _this.ctx.strokeRect(box.x, box.y, box.w, box.h);
                var fontSize = 30 / _this.scale.x;
                if (box.chosen) {
                    _this.ctx.fillStyle = 'rgba(255, 100, 145, 0.45)';
                    _this.ctx.fillRect(box.x, box.y, box.w, box.h);
                    _this.ctx.strokeStyle = 'rgba(255, 100, 100, 1)';
                    _this.ctx.lineWidth = 10 / _this.scale.x;
                    _this.ctx.strokeRect(box.x, box.y, box.w, box.h);
                    _this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                    _this.ctx.lineWidth = 4 / _this.scale.x;
                    _this.ctx.strokeRect(box.x + margin, box.y + margin, box.w - margin * 2, box.h - margin * 2);
                    // text
                    _this.ctx.fillStyle = 'rgba(40, 40, 40, 0.8)';
                    _this.ctx.textAlign = 'center';
                    _this.ctx.font = fontSize + 'px Ubuntu';
                    _this.ctx.fillText(box.annotation, box.x + box.w / 2, box.y + box.h / 2 + fontSize / 2);
                }
                else if (box.hover) {
                    _this.ctx.fillStyle = 'rgba(255, 100, 145, 0.3)';
                    _this.ctx.fillRect(box.x, box.y, box.w, box.h);
                    // text
                    _this.ctx.fillStyle = 'rgba(40, 40, 40, 0.8)';
                    _this.ctx.textAlign = 'center';
                    _this.ctx.font = fontSize + 'px Ubuntu';
                    _this.ctx.fillText(box.annotation, box.x + box.w / 2, box.y + box.h / 2 + fontSize / 2);
                }
                else {
                    _this.ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
                    _this.ctx.lineWidth = 3 / _this.scale.x;
                    _this.ctx.strokeRect(box.x + margin, box.y + margin, box.w - margin * 2, box.h - margin * 2);
                    // text
                    _this.ctx.fillStyle = 'rgba(40, 40, 40, 0.3)';
                    _this.ctx.textAlign = 'center';
                    _this.ctx.font = fontSize + 'px Ubuntu';
                    _this.ctx.fillText(box.annotation, box.x + box.w / 2, box.y + box.h / 2 + fontSize / 2);
                }
            }
            _this.ctx.restore();
            // if there is performance issue, we can optimize
            // this part by judging whether we should draw or not
            if (_this.isDrawing) {
                requestAnimationFrame(_this.draw);
            }
        };
        _this.initCanvas = function (url) {
            if (url.length === 0) {
                url = example;
            }
            _this.isDrawing = false;
            _this.image.src = url;
            _this.isDrawing = true;
            _this.position.x = 0;
            _this.position.y = 0;
            _this.image.onload = function () {
                _this.setState({ uploaded: false, uploadIcon: 'upload' });
                if (_this.image.naturalWidth !== 0 && url.length > 10) {
                    var scale = _this.props.width / _this.image.naturalWidth;
                    scale = Math.min(_this.props.height / _this.image.naturalHeight, scale);
                    _this.scale.x = scale;
                    _this.scale.y = scale;
                }
                if (_this.ctx) {
                    _this.draw();
                }
            };
            _this.chosenBox = undefined;
            _this.boxes = [];
            _this.annotatingBox = undefined;
        };
        _this.getPostData = function () {
            var data = {
                image: _this.image.src,
                height: _this.image.naturalHeight,
                width: _this.image.naturalWidth,
                flaws: _this.boxes,
            };
            return data;
        };
        _this.onUpload = function () {
            if (_this.props.asyncUpload == null) {
                return;
            }
            _this.setState({
                uploadIcon: 'loading',
                mouse_down: false,
                showAnnotation: false,
            });
            _this.props.asyncUpload(_this.getPostData())
                .then(function (data) {
                console.log(data);
                _this.setState({ uploadIcon: 'check', uploaded: true });
                setTimeout(function () {
                    _this.setState({ uploadIcon: "upload" });
                }, 5000);
            })
                .catch(function (err) {
                console.log(err);
                _this.setState({ uploadIcon: 'close' });
            });
        };
        _this.imageCanvas = React.createRef();
        _this.image = document.createElement('img');
        _this.position = { x: 0, y: 0 };
        _this.scale = { x: 0.5, y: 0.5 };
        _this.state = {
            isAnnotating: false,
            showAnnotation: false,
            hover: false,
            mouse_down: false,
            uploadIcon: 'upload',
            uploaded: false,
            lock: false,
            annotation: '',
            x: 0,
            y: 0
        };
        _this.chosenBox = undefined;
        _this.annotatingBox = undefined;
        _this.isDrawing = true;
        _this.boxes = [];
        _this.initCanvas(props.imageUrl);
        _this.bg = new Image();
        _this.bg.src = bg;
        return _this;
    }
    Annotator.prototype.componentWillReceiveProps = function (nextProps, nextContext) {
        if (nextProps.imageUrl !== this.props.imageUrl) {
            this.initCanvas(nextProps.imageUrl);
        }
    };
    Annotator.prototype.componentDidMount = function () {
        this.canvas = this.imageCanvas.current;
        if (this.canvas == null) {
            throw new Error("Canvas does not exist");
        }
        var context = this.canvas.getContext('2d');
        if (context !== null) {
            this.ctx = context;
        }
        else {
            throw new Error("Cannot get render context2D");
        }
        this.setEventListeners();
        requestAnimationFrame(this.draw);
    };
    Annotator.prototype.getCurrentCoordinate = function (box) {
        return {
            x: box.x * this.scale.x + this.position.x,
            y: box.y * this.scale.y + this.position.y,
            w: box.w * this.scale.x,
            h: box.h * this.scale.y,
        };
    };
    Annotator.prototype.mouseHoverCheck = function (mouseX, mouseY) {
        if (this.canvas == null) {
            throw new Error("Canvas does not exist!");
        }
        var startX = mouseX - this.canvas.getBoundingClientRect().left;
        var startY = mouseY - this.canvas.getBoundingClientRect().top;
        var invertedCord = this.invertTransform(startX, startY);
        var x = invertedCord.x, y = invertedCord.y;
        var anyHover = false;
        for (var i = 0; i < this.boxes.length; i++) {
            var box = this.boxes[i];
            if (box.insideBox(x, y)) {
                box.hover = true;
                anyHover = true;
            }
            else {
                box.hover = false;
            }
        }
        this.setState({ hover: anyHover });
    };
    Annotator.prototype.invertTransform = function (x, y) {
        x -= this.position.x;
        y -= this.position.y;
        x /= this.scale.x;
        y /= this.scale.y;
        return { x: x, y: y };
    };
    Annotator.prototype.getOriginalXY = function (pageX, pageY) {
        if (this.canvas == null) {
            throw new Error("Canvas does not exist!");
        }
        // return the original coordinate
        var startX = pageX - this.canvas.getBoundingClientRect().left;
        var startY = pageY - this.canvas.getBoundingClientRect().top;
        var invertedCord = this.invertTransform(startX, startY);
        var x = invertedCord.x, y = invertedCord.y;
        return [x, y];
    };
    Annotator.prototype.moveSmallDistance = function (pageX, pageY) {
        if (this.startX === undefined || this.startY === undefined) {
            throw "startX is undefined";
        }
        var _a = this.getOriginalXY(pageX, pageY), newX = _a[0], newY = _a[1];
        var dist = Math.sqrt((newX - this.startX) * (newX - this.startX) + (newY - this.startY) * (newY - this.startY));
        // TODO: the threshold need to be tested;
        if (dist < 5) {
            return true;
        }
        return false;
    };
    Annotator.prototype.render = function () {
        var _this = this;
        var _a = this.props, width = _a.width, height = _a.height, _b = _a.showButton, showButton = _b === void 0 ? true : _b, _c = _a.className, className = _c === void 0 ? "" : _c, _d = _a.style, style = _d === void 0 ? {} : _d;
        if (!style.hasOwnProperty('position')) {
            style['position'] = 'relative';
        }
        // const shownStyle = Object.assign({}, style, {width});
        var shownStyle = Object.assign({}, style);
        var cursor = this.state.hover ? 'pointer' :
            (this.state.isAnnotating ? 'crosshair' : 'grab');
        var isLocked = this.state.lock;
        var buttons = (showButton ? (React.createElement(React.Fragment, null,
            React.createElement(Button, { style: { margin: 8 }, onClick: function () { return _this.setState({ isAnnotating: !_this.state.isAnnotating }); } },
                "To ",
                this.state.isAnnotating ? 'Move' : 'Annotate'),
            React.createElement(Button, { onClick: this.onUpload }, "Upload"))) : null);
        return (React.createElement("div", { style: shownStyle, className: className },
            buttons,
            React.createElement("div", { style: {
                    position: 'relative',
                    width: width,
                    height: height,
                    margin: '0 auto',
                    borderRadius: 5,
                } },
                React.createElement("canvas", { style: {
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        zIndex: 0,
                        cursor: cursor,
                        borderRadius: 5
                    }, ref: this.imageCanvas, width: width, height: height }),
                React.createElement("div", { style: {
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        zIndex: 50,
                        width: width,
                        height: height,
                        display: this.state.uploaded ? 'block' : 'none',
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        textAlign: 'center',
                    } },
                    React.createElement("h1", { style: {
                            margin: height / 2 + "  auto",
                            fontSize: width / 20,
                        } }, "Uploaded")),
                React.createElement(Form, { className: "canvas-annotation", style: {
                        display: this.state.showAnnotation ? 'block' : 'none',
                        position: 'absolute',
                        left: this.state.x,
                        top: this.state.y + 10,
                        padding: 8,
                        backgroundColor: 'white',
                        borderRadius: 4,
                        zIndex: 1
                    } },
                    React.createElement(Select, { onChange: function (value) {
                            if (_this.chosenBox !== undefined) {
                                _this.chosenBox.annotation = value;
                                _this.setState({ annotation: value });
                            }
                        }, disabled: isLocked, value: this.state.annotation }, this.props.types.map(function (type) {
                        return React.createElement(Option, { value: type, key: type }, type);
                    })),
                    React.createElement(Button, { icon: isLocked ? 'lock' : 'unlock', shape: "circle", type: "primary", style: {
                            margin: 4,
                            float: 'left'
                        }, onClick: function () {
                            if (_this.chosenBox) {
                                if (_this.chosenBox.lock) {
                                    _this.chosenBox.lock = false;
                                    _this.setState({ lock: false });
                                }
                                else {
                                    _this.chosenBox.lock = true;
                                    _this.setState({ lock: true });
                                }
                            }
                        } }),
                    React.createElement(Button, { icon: "delete", shape: "circle", type: "primary", style: {
                            float: 'right',
                            margin: 4
                        }, disabled: isLocked, onClick: function () {
                            var chosen = _this.chosenBox;
                            _this.cancelChosenBox();
                            if (chosen === undefined) {
                                return;
                            }
                            var index = _this.boxes.indexOf(chosen);
                            _this.boxes.splice(index, 1);
                        } })))));
    };
    return Annotator;
}(React.Component));
export { Annotator };
//# sourceMappingURL=Annotator.js.map